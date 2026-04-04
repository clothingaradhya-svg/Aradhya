const axios = require("axios");

const { env } = require("../config");

const SHIPROCKET_API_BASE_URL = "https://apiv2.shiprocket.in/v1/external";
const SHIPROCKET_TOKEN_TTL_MS = 10 * 24 * 60 * 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;

const shiprocketClient = axios.create({
  baseURL: SHIPROCKET_API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

let tokenCache = {
  token: null,
  expiresAt: 0,
  refreshedAt: 0,
  refreshPromise: null,
};

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

const ensureShiprocketCredentials = () => {
  if (env.shiprocketEmail && env.shiprocketPassword) return;
  throw createAppError(
    "Shiprocket credentials are missing. Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in backend/.env.",
    500,
  );
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const splitName = (fullName = "") => {
  const trimmed = String(fullName || "").trim();
  if (!trimmed) return { firstName: "Customer", lastName: "" };

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts.shift() || "Customer",
    lastName: parts.join(" "),
  };
};

const pad = (value) => String(value).padStart(2, "0");

const formatShiprocketDate = (value) => {
  const candidate = value ? new Date(value) : new Date();
  const date = Number.isNaN(candidate.getTime()) ? new Date() : candidate;

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const decodeJwtExpiry = (token) => {
  try {
    const payload = String(token || "").split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));

    return typeof decoded?.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
};

const hasFreshToken = () =>
  Boolean(tokenCache.token) &&
  Number.isFinite(tokenCache.expiresAt) &&
  Date.now() < tokenCache.expiresAt - TOKEN_REFRESH_BUFFER_MS;

const extractShiprocketErrorDetails = (payload) =>
  payload?.errors || payload?.data || payload?.message || payload || null;

const mapShiprocketError = (error, fallbackMessage = "Shiprocket request failed.") => {
  if (error?.status) return error;

  const statusCode = error?.response?.status;
  const payload = error?.response?.data;
  const message =
    payload?.message ||
    payload?.error?.message ||
    error?.message ||
    fallbackMessage;
  const details = extractShiprocketErrorDetails(payload) || error?.code || null;

  let mappedStatus = 502;
  if (statusCode === 400 || statusCode === 422) mappedStatus = 400;
  if (statusCode === 404) mappedStatus = 404;
  if (statusCode === 408) mappedStatus = 504;

  return createAppError(message, mappedStatus, details);
};

const authenticate = async ({ forceRefresh = false } = {}) => {
  ensureShiprocketCredentials();

  if (!forceRefresh && hasFreshToken()) {
    return {
      token: tokenCache.token,
      expiresAt: tokenCache.expiresAt,
      refreshedAt: tokenCache.refreshedAt,
    };
  }

  if (tokenCache.refreshPromise) {
    await tokenCache.refreshPromise;
    return {
      token: tokenCache.token,
      expiresAt: tokenCache.expiresAt,
      refreshedAt: tokenCache.refreshedAt,
    };
  }

  const refreshPromise = shiprocketClient
    .post("/auth/login", {
      email: env.shiprocketEmail,
      password: env.shiprocketPassword,
    })
    .then((response) => {
      const token = response.data?.token;
      if (!token) {
        throw createAppError(
          "Shiprocket authentication succeeded but no token was returned.",
          502,
          response.data,
        );
      }

      tokenCache = {
        token,
        expiresAt: decodeJwtExpiry(token) || Date.now() + SHIPROCKET_TOKEN_TTL_MS,
        refreshedAt: Date.now(),
        refreshPromise: null,
      };

      return tokenCache;
    })
    .catch((error) => {
      tokenCache = {
        token: null,
        expiresAt: 0,
        refreshedAt: 0,
        refreshPromise: null,
      };
      throw mapShiprocketError(error, "Shiprocket authentication failed.");
    })
    .finally(() => {
      tokenCache.refreshPromise = null;
    });

  tokenCache.refreshPromise = refreshPromise;
  await refreshPromise;

  return {
    token: tokenCache.token,
    expiresAt: tokenCache.expiresAt,
    refreshedAt: tokenCache.refreshedAt,
  };
};

const requestWithAuth = async (config, { retryUnauthorized = true } = {}) => {
  const auth = await authenticate();

  try {
    return await shiprocketClient({
      ...config,
      headers: {
        ...(config?.headers || {}),
        Authorization: `Bearer ${auth.token}`,
      },
    });
  } catch (error) {
    if (retryUnauthorized && error?.response?.status === 401) {
      const freshAuth = await authenticate({ forceRefresh: true });
      try {
        return await shiprocketClient({
          ...config,
          headers: {
            ...(config?.headers || {}),
            Authorization: `Bearer ${freshAuth.token}`,
          },
        });
      } catch (retryError) {
        throw mapShiprocketError(retryError, "Shiprocket request failed.");
      }
    }

    throw mapShiprocketError(error, "Shiprocket request failed.");
  }
};

const getOrderItems = (input) => {
  const source =
    Array.isArray(input?.items) && input.items.length
      ? input.items
      : input?.item
        ? [input.item]
        : [];

  return source.map((item, index) =>
    compactObject({
      name: item.name,
      sku: item.sku || `SKU-${index + 1}`,
      units: Math.max(1, Number(item.quantity || 1)),
      selling_price: toNumber(item.price, 0).toFixed(2),
      discount: toNumber(item.discount, 0).toFixed(2),
      tax: toNumber(item.tax, 0).toFixed(2),
      hsn: item.hsn !== undefined ? String(item.hsn) : undefined,
    }),
  );
};

const buildCreateOrderPayload = (input) => {
  const { customer = {}, package: packageDetails = {} } = input || {};
  const { firstName, lastName } = splitName(customer.name);
  const orderItems = getOrderItems(input);
  const totalDiscount = orderItems.reduce(
    (sum, item) => sum + toNumber(item.discount, 0),
    0,
  );
  const subTotal = orderItems.reduce(
    (sum, item) =>
      sum + toNumber(item.selling_price, 0) * Math.max(1, toNumber(item.units, 1)),
    0,
  );

  return {
    order_id: input.orderId || `WEB-${Date.now()}`,
    order_date: formatShiprocketDate(input.orderDate),
    pickup_location: input.pickupLocation || env.shiprocketPickupLocation,
    comment: input.notes || undefined,
    billing_customer_name: firstName,
    billing_last_name: lastName || undefined,
    billing_address: customer.address,
    billing_address_2: customer.address2 || undefined,
    billing_city: customer.city,
    billing_pincode: customer.pincode,
    billing_state: customer.state,
    billing_country: customer.country || env.shiprocketDefaultCountry,
    billing_email: customer.email,
    billing_phone: customer.phone,
    shipping_is_billing: true,
    order_items: orderItems,
    payment_method: input.paymentMethod || "Prepaid",
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: Number(totalDiscount.toFixed(2)),
    sub_total: Number(subTotal.toFixed(2)),
    length: toNumber(packageDetails.length, env.shiprocketDefaultLength),
    breadth: toNumber(packageDetails.breadth, env.shiprocketDefaultBreadth),
    height: toNumber(packageDetails.height, env.shiprocketDefaultHeight),
    weight: toNumber(packageDetails.weight, env.shiprocketDefaultWeight),
  };
};

const normalizeAssignedAwbResponse = (payload = {}) => {
  const source = payload?.response?.data || payload?.data || payload || {};

  return {
    summary: {
      shiprocketOrderId:
        source?.order_id || payload?.order_id || payload?.orderId || null,
      shipmentId:
        source?.shipment_id || payload?.shipment_id || payload?.shipmentId || null,
      awbCode: source?.awb_code || payload?.awb_code || null,
      courierName: source?.courier_name || payload?.courier_name || null,
      courierCompanyId:
        source?.courier_company_id || payload?.courier_company_id || null,
      status:
        Number(payload?.awb_assign_status || 0) === 1 ? "AWB Assigned" : "Assignment pending",
    },
    raw: payload,
  };
};

const normalizeTrackingActivities = (payload = {}) => {
  const trackingData = payload?.tracking_data || payload?.data || payload || {};
  const activitiesSource = Array.isArray(trackingData?.shipment_track_activities)
    ? trackingData.shipment_track_activities
    : Array.isArray(trackingData?.shipment_track)
      ? trackingData.shipment_track
      : [];

  return activitiesSource
    .map((activity) =>
      compactObject({
        status:
          activity?.activity ||
          activity?.status ||
          activity?.current_status ||
          activity?.["sr-status"] ||
          undefined,
        location:
          activity?.location ||
          activity?.city ||
          activity?.["sr-status-location"] ||
          undefined,
        date:
          activity?.date ||
          activity?.activity_date ||
          activity?.["sr-status-date"] ||
          activity?.created_at ||
          undefined,
        details:
          activity?.["sr-status-label"] ||
          activity?.remarks ||
          activity?.description ||
          undefined,
      }),
    )
    .filter(
      (activity) =>
        activity.status || activity.location || activity.date || activity.details,
    );
};

const normalizeTrackingResponse = (payload, lookup = {}) => {
  const trackingData = payload?.tracking_data || payload?.data || payload || {};
  const primaryTrack = Array.isArray(trackingData?.shipment_track)
    ? trackingData.shipment_track[0]
    : null;
  const activities = normalizeTrackingActivities(payload);

  return {
    lookup: {
      awb: lookup.awb || primaryTrack?.awb_code || trackingData?.awb || null,
      orderId: lookup.orderId || trackingData?.order_id || null,
    },
    summary: {
      status:
        trackingData?.track_status ||
        activities[0]?.status ||
        primaryTrack?.current_status ||
        payload?.message ||
        "Tracking received",
      courierName: primaryTrack?.courier_name || trackingData?.courier_name || null,
      estimatedDeliveryDate: primaryTrack?.edd || trackingData?.etd || null,
      deliveredAt: primaryTrack?.delivered_date || trackingData?.delivered_date || null,
      origin: primaryTrack?.origin || null,
      destination: primaryTrack?.destination || null,
    },
    activities,
    raw: payload,
  };
};

const getAuthStatus = async () => {
  const auth = await authenticate();

  return {
    authenticated: Boolean(auth.token),
    expiresAt: auth.expiresAt,
    refreshedAt: auth.refreshedAt,
    pickupLocation: env.shiprocketPickupLocation,
  };
};

const createOrder = async (input) => {
  const payload = buildCreateOrderPayload(input);
  const response = await requestWithAuth({
    url: "/orders/create/adhoc",
    method: "POST",
    data: payload,
  });

  return {
    summary: {
      localOrderId: payload.order_id,
      shiprocketOrderId:
        response.data?.order_id || response.data?.orderId || response.data?.data?.order_id || null,
      shipmentId:
        response.data?.shipment_id ||
        response.data?.shipmentId ||
        response.data?.data?.shipment_id ||
        null,
      awbCode: response.data?.awb_code || response.data?.data?.awb_code || null,
      status: response.data?.status || response.data?.message || "Order created",
      pickupLocation: payload.pickup_location,
    },
    raw: response.data,
  };
};

const trackShipment = async ({ awb, orderId }) => {
  const trackingPath = awb
    ? `/courier/track/awb/${encodeURIComponent(awb)}`
    : `/courier/track/order/${encodeURIComponent(orderId)}`;

  const response = await requestWithAuth({
    url: trackingPath,
    method: "GET",
  });

  return normalizeTrackingResponse(response.data, { awb, orderId });
};

const checkServiceability = async ({
  pickupPostcode,
  deliveryPostcode,
  weight,
  cod,
  length,
  breadth,
  height,
  declaredValue,
}) => {
  const response = await requestWithAuth({
    url: "/courier/serviceability/",
    method: "GET",
    params: {
      pickup_postcode: pickupPostcode,
      delivery_postcode: deliveryPostcode,
      weight,
      cod,
      length,
      breadth,
      height,
      declared_value: declaredValue,
    },
  });

  return response.data;
};

const assignAwb = async ({ shipmentId, courierId, status }) => {
  const response = await requestWithAuth({
    url: "/courier/assign/awb",
    method: "POST",
    data: compactObject({
      shipment_id: shipmentId,
      courier_id: courierId,
      status,
    }),
  });

  return normalizeAssignedAwbResponse(response.data);
};

module.exports = {
  getAuthStatus,
  createOrder,
  trackShipment,
  checkServiceability,
  assignAwb,
};
