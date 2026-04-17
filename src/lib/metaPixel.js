const FLUSH_INTERVAL_MS = 250;
const MAX_FLUSH_ATTEMPTS = 20;
const PURCHASE_STORAGE_KEY = 'aradhya-meta-pixel-purchases-v1';
const MAX_STORED_PURCHASE_IDS = 50;
const PIXEL_ID = '839123811919855';

let lastTrackedPath = null;
let lastAdvancedMatchingSignature = null;

function canUseMetaPixel() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getMetaPixelFn() {
  if (typeof window.fbq === 'function') {
    return window.fbq;
  }

  if (typeof window._fbq === 'function') {
    return window._fbq;
  }

  return null;
}

function getPendingCalls() {
  if (!Array.isArray(window.__metaPixelPendingCalls)) {
    window.__metaPixelPendingCalls = [];
  }

  return window.__metaPixelPendingCalls;
}

function flushPendingCalls() {
  const fbq = getMetaPixelFn();

  if (!fbq) {
    return false;
  }

  const pendingCalls = getPendingCalls();

  while (pendingCalls.length > 0) {
    const args = pendingCalls.shift();
    fbq(...args);
  }

  window.__metaPixelFlushAttempts = 0;
  return true;
}

function schedulePendingCallFlush() {
  if (window.__metaPixelFlushTimer) {
    return;
  }

  const runFlush = () => {
    window.__metaPixelFlushTimer = null;

    if (flushPendingCalls()) {
      return;
    }

    const attempts = (window.__metaPixelFlushAttempts || 0) + 1;
    window.__metaPixelFlushAttempts = attempts;

    if (attempts >= MAX_FLUSH_ATTEMPTS) {
      return;
    }

    window.__metaPixelFlushTimer = window.setTimeout(runFlush, FLUSH_INTERVAL_MS);
  };

  window.__metaPixelFlushTimer = window.setTimeout(runFlush, FLUSH_INTERVAL_MS);
}

function sendMetaPixelEvent(...args) {
  if (!canUseMetaPixel()) {
    return false;
  }

  const fbq = getMetaPixelFn();

  if (fbq) {
    fbq(...args);
    flushPendingCalls();
    return true;
  }

  getPendingCalls().push(args);
  window.__metaPixelFlushAttempts = 0;
  schedulePendingCallFlush();
  return false;
}

function normalizeString(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function normalizeEmail(value) {
  const normalized = normalizeString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizePhone(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const digitsOnly = normalized.replace(/\D/g, '');
  return digitsOnly || null;
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeQuantity(value) {
  const parsed = normalizeNumber(value, 1);
  return Math.max(Math.floor(parsed), 1);
}

function buildMetaContent(item = {}) {
  const id =
    normalizeString(item.productId) ||
    normalizeString(item.sku) ||
    normalizeString(item.id) ||
    normalizeString(item.slug) ||
    normalizeString(item.handle) ||
    normalizeString(item.name) ||
    'unknown-item';

  const quantity = normalizeQuantity(item.quantity);
  const content = {
    id,
    quantity,
  };

  const price = normalizeNumber(item.price, NaN);
  if (Number.isFinite(price) && price >= 0) {
    content.item_price = price;
  }

  const size = normalizeString(item.size);
  if (size) {
    content.size = size;
  }

  return {
    id,
    name: normalizeString(item.name) || 'Product',
    quantity,
    size,
    content,
  };
}

function buildEventPayload(items, basePayload = {}) {
  const normalizedItems = (Array.isArray(items) ? items : [items])
    .map((item) => buildMetaContent(item))
    .filter(Boolean);

  if (!normalizedItems.length) {
    return null;
  }

  const uniqueIds = Array.from(new Set(normalizedItems.map((item) => item.id)));
  const names = normalizedItems.map((item) => item.name);
  const sizes = normalizedItems
    .map((item) => item.size)
    .filter(Boolean);
  const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);

  const payload = {
    content_name:
      names.length === 1 ? names[0] : names.slice(0, 5).join(', '),
    content_ids: uniqueIds,
    contents: normalizedItems.map((item) => item.content),
    content_type: 'product',
    num_items: totalQuantity,
    ...basePayload,
  };

  const customData = {
    ...(basePayload.custom_data && typeof basePayload.custom_data === 'object'
      ? basePayload.custom_data
      : {}),
  };

  if (sizes.length === 1) {
    customData.size = sizes[0];
  } else if (sizes.length > 1) {
    customData.sizes = sizes;
  }

  if (Object.keys(customData).length > 0) {
    payload.custom_data = customData;
  }

  return payload;
}

function getTrackedPurchaseIds() {
  if (!canUseMetaPixel() || typeof window.sessionStorage === 'undefined') {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(PURCHASE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function markPurchaseTracked(orderId) {
  if (!orderId || !canUseMetaPixel() || typeof window.sessionStorage === 'undefined') {
    return;
  }

  const nextIds = [
    orderId,
    ...getTrackedPurchaseIds().filter((entry) => entry !== orderId),
  ].slice(0, MAX_STORED_PURCHASE_IDS);

  try {
    window.sessionStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(nextIds));
  } catch {
    // Ignore storage failures and still allow event delivery.
  }
}

function hasTrackedPurchase(orderId) {
  if (!orderId) {
    return false;
  }

  return getTrackedPurchaseIds().includes(orderId);
}

function getNameParts(fullName) {
  const normalized = normalizeString(fullName);
  if (!normalized) {
    return { firstName: null, lastName: null };
  }

  const [firstName, ...rest] = normalized.split(/\s+/);
  return {
    firstName: firstName || null,
    lastName: rest.length ? rest.join(' ') : null,
  };
}

function buildAdvancedMatchingData({ customer = null, shipping = null } = {}) {
  const customerId =
    normalizeString(customer?.id) ||
    normalizeString(customer?._id) ||
    normalizeString(customer?.userId) ||
    null;
  const email = normalizeEmail(customer?.email) || normalizeEmail(shipping?.email);
  const phone = normalizePhone(customer?.phone) || normalizePhone(shipping?.phone);
  const nameParts = getNameParts(customer?.name || shipping?.fullName);

  const userData = {
    em: email,
    ph: phone,
    external_id: customerId,
    fn: normalizeString(nameParts.firstName),
    ln: normalizeString(nameParts.lastName),
    ct: normalizeString(shipping?.city),
    st: normalizeString(shipping?.state),
    zp: normalizeString(shipping?.postalCode),
    country: normalizeString(shipping?.country),
  };

  return Object.fromEntries(
    Object.entries(userData).filter(([, value]) => Boolean(value)),
  );
}

export function trackMetaPageView({ pathname, search = '' } = {}) {
  if (!canUseMetaPixel()) {
    return false;
  }

  const pagePath = pathname || window.location.pathname;
  const pageSearch = typeof search === 'string' ? search : window.location.search;
  const currentPath = `${pagePath}${pageSearch}`;

  if (currentPath === lastTrackedPath) {
    return false;
  }

  lastTrackedPath = currentPath;
  return sendMetaPixelEvent('track', 'PageView');
}

export function applyMetaAdvancedMatching(input = {}) {
  const userData = buildAdvancedMatchingData(input);

  if (!Object.keys(userData).length) {
    return false;
  }

  const signature = JSON.stringify(userData);
  if (signature === lastAdvancedMatchingSignature) {
    return false;
  }

  lastAdvancedMatchingSignature = signature;
  return sendMetaPixelEvent('init', PIXEL_ID, userData);
}

export function trackMetaAddToCart(items, { value, currency = 'INR' } = {}) {
  const numericValue = normalizeNumber(value, NaN);
  const payload = buildEventPayload(items, {
    value: Number.isFinite(numericValue) ? numericValue : 0,
    currency: normalizeString(currency) || 'INR',
  });

  if (!payload) {
    return false;
  }

  return sendMetaPixelEvent('track', 'AddToCart', payload);
}

export function trackMetaInitiateCheckout(items, { value, currency = 'INR' } = {}) {
  const numericValue = normalizeNumber(value, NaN);
  const payload = buildEventPayload(items, {
    value: Number.isFinite(numericValue) ? numericValue : 0,
    currency: normalizeString(currency) || 'INR',
  });

  if (!payload) {
    return false;
  }

  return sendMetaPixelEvent('track', 'InitiateCheckout', payload);
}

export function trackMetaPurchase({
  orderId,
  value,
  currency = 'INR',
  items,
} = {}) {
  const normalizedOrderId = normalizeString(orderId);
  if (normalizedOrderId && hasTrackedPurchase(normalizedOrderId)) {
    return false;
  }

  const numericValue = normalizeNumber(value, NaN);
  const payload = buildEventPayload(items, {
    value: Number.isFinite(numericValue) ? numericValue : 0,
    currency: normalizeString(currency) || 'INR',
    custom_data: normalizedOrderId ? { order_id: normalizedOrderId } : {},
  });

  if (!payload) {
    return false;
  }

  const sent = sendMetaPixelEvent('track', 'Purchase', payload);
  if (normalizedOrderId && canUseMetaPixel()) {
    markPurchaseTracked(normalizedOrderId);
  }
  return sent;
}
