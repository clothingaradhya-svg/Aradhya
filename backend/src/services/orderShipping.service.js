const { OrderStatus } = require("@prisma/client");

const shiprocketService = require("./shiprocket.service");

const SHIPROCKET_READY_STATUSES = new Set([OrderStatus.PAID, OrderStatus.FULFILLED]);

const createAppError = (message, status = 500, details = null) => {
  const error = new Error(message);
  error.status = status;
  if (details) error.details = details;
  return error;
};

const compactObject = (value = {}) =>
  Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => entry !== undefined && entry !== null && entry !== "",
    ),
  );

const toMoney = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeToken = (value) => String(value ?? "").trim().toUpperCase();

const hasExistingShipment = (shipping = {}) =>
  Boolean(
    String(shipping?.shiprocketOrderId || "").trim() ||
      String(shipping?.awbCode || "").trim() ||
      String(shipping?.awb || "").trim() ||
      String(shipping?.trackingNumber || "").trim(),
  );

const isCodOrder = (order = {}) => {
  const paymentMethod = normalizeToken(order?.paymentMethod);
  const preferredPaymentMethod = normalizeToken(order?.shipping?.preferredPaymentMethod);
  const fastrrPaymentType = normalizeToken(order?.totals?.fastrrPaymentType);
  const dueOnDelivery = toMoney(order?.totals?.dueOnDelivery, 0);

  return (
    paymentMethod === "COD" ||
    preferredPaymentMethod === "COD" ||
    fastrrPaymentType === "CASH_ON_DELIVERY" ||
    dueOnDelivery > 0
  );
};

const shouldCreateShipmentForOrder = (order = {}) => {
  if (!order || hasExistingShipment(order.shipping || {})) return false;
  if (normalizeToken(order?.status) === OrderStatus.CANCELLED) return false;
  if (SHIPROCKET_READY_STATUSES.has(normalizeToken(order?.status))) return true;
  return isCodOrder(order);
};

const stripNonDigits = (value) => String(value ?? "").replace(/\D+/g, "");

const getOrderReference = (order = {}) => {
  const primary = String(order?.number || order?.id || "").trim();
  if (!primary) {
    throw createAppError("Order reference is missing for Shiprocket shipment creation.", 400);
  }

  return primary.slice(0, 64);
};

const getCustomerPayload = (order = {}) => {
  const shipping = order?.shipping && typeof order.shipping === "object" ? order.shipping : {};
  const fullName = String(shipping.fullName || "").trim();
  const email = String(shipping.email || "").trim();
  const phone = stripNonDigits(shipping.phone).slice(0, 15);
  const address = String(shipping.address || "").trim();
  const city = String(shipping.city || "").trim();
  const state = String(shipping.state || "").trim();
  const pincode = stripNonDigits(shipping.postalCode).slice(0, 6);
  const country = String(shipping.country || "India").trim();

  if (!fullName || !email || !phone || !address || !city || !state || pincode.length !== 6) {
    throw createAppError(
      "Order shipping details are incomplete. Full name, email, phone, address, city, state, and a 6-digit PIN code are required.",
      400,
    );
  }

  return {
    name: fullName,
    email,
    phone,
    address,
    city,
    state,
    pincode,
    country,
  };
};

const buildLineItemName = (item = {}, index = 0) => {
  const base = String(item?.name || "").trim() || `Item ${index + 1}`;
  const size = String(item?.size || "").trim();
  return size ? `${base} (${size})` : base;
};

const getItemsPayload = (order = {}) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) {
    throw createAppError("At least one order item is required to create a Shiprocket shipment.", 400);
  }

  return items.map((item, index) =>
    compactObject({
      name: buildLineItemName(item, index),
      sku: String(item?.sku || item?.id || "").trim() || undefined,
      price: Math.max(toMoney(item?.price, 0), 0.01),
      quantity: Math.max(1, Number(item?.quantity || 1)),
    }),
  );
};

const getShiprocketPaymentMethod = (order = {}) => (isCodOrder(order) ? "COD" : "Prepaid");

const buildCreateOrderInput = (order = {}) => ({
  orderId: getOrderReference(order),
  orderDate: order?.createdAt || new Date().toISOString(),
  paymentMethod: getShiprocketPaymentMethod(order),
  customer: getCustomerPayload(order),
  items: getItemsPayload(order),
});

const buildShipmentPatch = (shipping = {}, shipment = null, tracking = null) => {
  const shipmentSummary = shipment?.summary || {};
  const trackingSummary = tracking?.summary || {};
  const lookup = tracking?.lookup || {};
  const awbCode =
    String(
      shipmentSummary.awbCode ||
        lookup.awb ||
        shipping.awbCode ||
        shipping.awb ||
        shipping.trackingNumber ||
        "",
    ).trim() || null;
  const shiprocketOrderId =
    String(shipmentSummary.shiprocketOrderId || shipping.shiprocketOrderId || "").trim() || null;

  return compactObject({
    ...shipping,
    shiprocketOrderId,
    shiprocketShipmentId:
      String(shipmentSummary.shipmentId || shipping.shiprocketShipmentId || "").trim() || null,
    awbCode,
    awb: awbCode,
    trackingNumber: awbCode,
    courierName:
      String(trackingSummary.courierName || shipping.courierName || "").trim() || null,
    estimatedDelivery:
      String(
        trackingSummary.estimatedDeliveryDate || shipping.estimatedDelivery || "",
      ).trim() || null,
    shiprocketStatus:
      String(trackingSummary.status || shipmentSummary.status || shipping.shiprocketStatus || "").trim() ||
      null,
    shiprocketLastSyncedAt: new Date().toISOString(),
    source: shipping.source || "SHIPROCKET",
  });
};

const createShiprocketShipmentForOrder = async (order, { allowExisting = false } = {}) => {
  const shipping = order?.shipping && typeof order.shipping === "object" ? order.shipping : {};

  if (hasExistingShipment(shipping) && !allowExisting) {
    return {
      created: false,
      alreadyExists: true,
      shippingPatch: buildShipmentPatch(shipping, null, null),
    };
  }

  if (!shouldCreateShipmentForOrder(order) && !allowExisting) {
    throw createAppError(
      "This order is not ready for shipment yet. Mark it paid, fulfilled, or COD before creating a Shiprocket shipment.",
      400,
    );
  }

  const input = buildCreateOrderInput(order);
  const shipment = await shiprocketService.createOrder(input);

  let tracking = null;
  try {
    const awb = shipment?.summary?.awbCode || null;
    const orderId = shipment?.summary?.shiprocketOrderId
      ? String(shipment.summary.shiprocketOrderId)
      : null;
    if (awb || orderId) {
      tracking = await shiprocketService.trackShipment({ awb, orderId });
    }
  } catch {
    tracking = null;
  }

  return {
    created: true,
    alreadyExists: false,
    shipment,
    tracking,
    shippingPatch: buildShipmentPatch(shipping, shipment, tracking),
  };
};

const refreshShiprocketTrackingForOrder = async (order = {}) => {
  const shipping = order?.shipping && typeof order.shipping === "object" ? order.shipping : {};
  const awb =
    String(shipping.awbCode || shipping.awb || shipping.trackingNumber || "").trim() || null;
  const orderId = String(shipping.shiprocketOrderId || "").trim() || null;

  if (!awb && !orderId) {
    throw createAppError(
      "This order does not have a Shiprocket AWB or Shiprocket order ID yet.",
      400,
    );
  }

  const tracking = await shiprocketService.trackShipment({ awb, orderId });

  return {
    tracking,
    shippingPatch: buildShipmentPatch(shipping, null, tracking),
  };
};

module.exports = {
  hasExistingShipment,
  isCodOrder,
  shouldCreateShipmentForOrder,
  createShiprocketShipmentForOrder,
  refreshShiprocketTrackingForOrder,
};
