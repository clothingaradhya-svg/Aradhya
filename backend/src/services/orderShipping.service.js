const { env } = require("../config");
const shiprocketService = require("./shiprocket.service");

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

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeToken = (value) => String(value ?? "").trim().toUpperCase();

const stripNonDigits = (value) => String(value ?? "").replace(/\D+/g, "");

const hasExistingShipment = (shipping = {}) =>
  Boolean(
    String(shipping?.shiprocketOrderId || "").trim() ||
      String(shipping?.shiprocketShipmentId || "").trim() ||
      String(shipping?.awbCode || "").trim() ||
      String(shipping?.awb || "").trim() ||
      String(shipping?.trackingNumber || "").trim(),
  );

const isCodOrder = (order = {}) => normalizeToken(order?.paymentMethod) === "COD";

const shouldCreateShipmentForOrder = (order = {}) => {
  if (!order) return false;
  if (hasExistingShipment(order.shipping || {})) return false;
  const status = normalizeToken(order?.status);
  if (status === "PAID") return true;
  if (status === "PENDING" && isCodOrder(order)) return true;
  return false;
};

const getOrderReference = (order = {}) => {
  const primary = String(order?.number || order?.id || "").trim();
  if (!primary) {
    throw createAppError("Order reference is missing for shipment creation.", 400);
  }
  return primary.slice(0, 64);
};

const getCustomerPayload = (order = {}) => {
  const shipping = order?.shipping && typeof order.shipping === "object" ? order.shipping : {};
  const customer = {
    name: String(shipping.fullName || "").trim(),
    email: String(shipping.email || "").trim(),
    phone: stripNonDigits(shipping.phone).slice(0, 15),
    address: String(shipping.address || "").trim(),
    city: String(shipping.city || "").trim(),
    state: String(shipping.state || "").trim(),
    pincode: stripNonDigits(shipping.postalCode).slice(0, 6),
    country: String(shipping.country || env.shiprocketDefaultCountry || "India").trim(),
  };

  if (
    !customer.name ||
    !customer.email ||
    customer.phone.length < 10 ||
    !customer.address ||
    !customer.city ||
    !customer.state ||
    customer.pincode.length !== 6
  ) {
    throw createAppError(
      "Order shipping details are incomplete. Name, email, phone, address, city, state, and a valid 6-digit pincode are required.",
      400,
    );
  }

  return customer;
};

const buildLineItemName = (item = {}, index = 0) => {
  const base = String(item?.name || "").trim() || `Item ${index + 1}`;
  const size = String(item?.size || "").trim();
  return size ? `${base} (${size})` : base;
};

const getItemsPayload = (order = {}) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) {
    throw createAppError("At least one item is required to create a shipment.", 400);
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

const getPackagePayload = (order = {}) => {
  const shipping = order?.shipping && typeof order.shipping === "object" ? order.shipping : {};
  const packageDetails =
    shipping.package && typeof shipping.package === "object" ? shipping.package : {};

  return {
    weight: toPositiveNumber(packageDetails.weight, env.shiprocketDefaultWeight),
    length: toPositiveNumber(packageDetails.length, env.shiprocketDefaultLength),
    breadth: toPositiveNumber(packageDetails.breadth, env.shiprocketDefaultBreadth),
    height: toPositiveNumber(packageDetails.height, env.shiprocketDefaultHeight),
  };
};

const buildCreateOrderInput = (order = {}) => ({
  orderId: getOrderReference(order),
  orderDate: order?.createdAt || new Date().toISOString(),
  pickupLocation: env.shiprocketPickupLocation,
  paymentMethod: isCodOrder(order) ? "COD" : "Prepaid",
  customer: getCustomerPayload(order),
  items: getItemsPayload(order),
  package: getPackagePayload(order),
});

const normalizeServiceabilityResponse = (payload) => payload?.data || payload || {};

const chooseBestCourier = (payload) => {
  const source = normalizeServiceabilityResponse(payload);
  const companies = Array.isArray(source.available_courier_companies)
    ? source.available_courier_companies.filter(
        (company) =>
          Number(company?.blocked || 0) !== 1 &&
          Number(company?.courier_company_id || 0) > 0,
      )
    : [];

  if (!companies.length) {
    throw createAppError("No serviceable courier is available for this pincode.", 400, payload);
  }

  const recommendedId =
    Number(source.recommended_courier_company_id || source.shiprocket_recommended_courier_id) || 0;
  if (recommendedId) {
    const recommended = companies.find(
      (company) => Number(company?.courier_company_id || 0) === recommendedId,
    );
    if (recommended) return recommended;
  }

  return [...companies].sort((left, right) => {
    const leftRate = toMoney(left?.rate ?? left?.freight_charge, Number.MAX_SAFE_INTEGER);
    const rightRate = toMoney(right?.rate ?? right?.freight_charge, Number.MAX_SAFE_INTEGER);
    if (leftRate !== rightRate) return leftRate - rightRate;

    const leftEtd = toPositiveNumber(left?.etd_hours, Number.MAX_SAFE_INTEGER);
    const rightEtd = toPositiveNumber(right?.etd_hours, Number.MAX_SAFE_INTEGER);
    if (leftEtd !== rightEtd) return leftEtd - rightEtd;

    const leftRating = toMoney(left?.rating, 0);
    const rightRating = toMoney(right?.rating, 0);
    return rightRating - leftRating;
  })[0];
};

const buildTrackingUrl = (awbCode) => {
  const awb = String(awbCode || "").trim();
  const frontendBase = String(env.frontendUrl || "").trim().replace(/\/+$/, "");
  if (!awb || !frontendBase) return "";
  return `${frontendBase}/track/${encodeURIComponent(awb)}`;
};

const buildShipmentPatch = (shipping = {}, context = {}) => {
  const shipment = context.shipment || {};
  const assigned = context.assigned || {};
  const tracking = context.tracking || {};
  const courier = context.courier || {};
  const lookup = tracking?.lookup || {};
  const trackingSummary = tracking?.summary || {};
  const assignedData = assigned?.summary || {};
  const shipmentSummary = shipment?.summary || {};
  const awbCode =
    String(
      assignedData.awbCode ||
        shipmentSummary.awbCode ||
        lookup.awb ||
        shipping.awbCode ||
        shipping.awb ||
        shipping.trackingNumber ||
        "",
    ).trim() || null;
  const shiprocketOrderId =
    String(
      assignedData.shiprocketOrderId || shipmentSummary.shiprocketOrderId || shipping.shiprocketOrderId || "",
    ).trim() || null;

  return compactObject({
    ...shipping,
    shiprocketOrderId,
    shiprocketShipmentId:
      String(
        assignedData.shipmentId || shipmentSummary.shipmentId || shipping.shiprocketShipmentId || "",
      ).trim() || null,
    awbCode,
    awb: awbCode,
    trackingNumber: awbCode,
    courierName:
      String(
        assignedData.courierName ||
          trackingSummary.courierName ||
          courier?.courier_name ||
          shipping.courierName ||
          "",
      ).trim() || null,
    trackingUrl: buildTrackingUrl(awbCode) || shipping.trackingUrl || null,
    estimatedDelivery:
      String(
        trackingSummary.estimatedDeliveryDate || courier?.etd || shipping.estimatedDelivery || "",
      ).trim() || null,
    shiprocketCourierId:
      Number(courier?.courier_company_id || shipping.shiprocketCourierId || 0) || null,
    shiprocketRate: toMoney(courier?.rate ?? courier?.freight_charge, null),
    shiprocketStatus:
      String(
        trackingSummary.status || assignedData.status || shipmentSummary.status || shipping.shiprocketStatus || "",
      ).trim() || null,
    shiprocketLastSyncedAt: new Date().toISOString(),
    source: "SHIPROCKET",
  });
};

const createShiprocketShipmentForOrder = async (order, { allowExisting = false } = {}) => {
  const shipping = order?.shipping && typeof order.shipping === "object" ? order.shipping : {};

  if (hasExistingShipment(shipping) && !allowExisting) {
    return {
      created: false,
      alreadyExists: true,
      shippingPatch: buildShipmentPatch(shipping, {}),
    };
  }

  if (!shouldCreateShipmentForOrder(order) && !allowExisting) {
    throw createAppError(
      "This order is not ready for shipment yet. Create the shipment after payment success or for a COD order.",
      400,
    );
  }

  const input = buildCreateOrderInput(order);
  const shipment = await shiprocketService.createOrder(input);

  const serviceability = await shiprocketService.checkServiceability({
    pickupPostcode: env.shiprocketPickupPincode,
    deliveryPostcode: input.customer.pincode,
    weight: input.package.weight,
    cod: input.paymentMethod === "COD" ? 1 : 0,
    length: input.package.length,
    breadth: input.package.breadth,
    height: input.package.height,
    declaredValue: input.items.reduce(
      (sum, item) => sum + toMoney(item.price, 0) * Math.max(1, Number(item.quantity || 1)),
      0,
    ),
  });
  const courier = chooseBestCourier(serviceability);

  const shipmentId = shipment?.summary?.shipmentId;
  if (!shipmentId) {
    throw createAppError(
      "Shiprocket created the order but did not return a shipment ID.",
      502,
      shipment?.raw || shipment,
    );
  }

  const assigned = await shiprocketService.assignAwb({
    shipmentId,
    courierId: courier.courier_company_id,
  });
  const awbCode = assigned?.summary?.awbCode || shipment?.summary?.awbCode || null;

  let tracking = null;
  try {
    tracking = awbCode
      ? await shiprocketService.trackShipment({ awb: awbCode })
      : await shiprocketService.trackShipment({
          orderId: String(
            assigned?.summary?.shiprocketOrderId || shipment?.summary?.shiprocketOrderId || "",
          ).trim(),
        });
  } catch {
    tracking = null;
  }

  return {
    created: true,
    alreadyExists: false,
    shipment,
    assigned,
    tracking,
    courier,
    serviceability,
    shippingPatch: buildShipmentPatch(shipping, {
      shipment,
      assigned,
      tracking,
      courier,
    }),
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
    shippingPatch: buildShipmentPatch(shipping, {
      tracking,
    }),
  };
};

module.exports = {
  hasExistingShipment,
  isCodOrder,
  shouldCreateShipmentForOrder,
  createShiprocketShipmentForOrder,
  refreshShiprocketTrackingForOrder,
};
