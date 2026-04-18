const FLUSH_INTERVAL_MS = 250;
const MAX_FLUSH_ATTEMPTS = 20;
const META_PIXEL_SCRIPT_ID = 'aradhya-meta-pixel-script';
const META_PIXEL_SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js';
const PURCHASE_STORAGE_KEY = 'aradhya-meta-pixel-purchases-v1';
const META_TEST_MODE_STORAGE_KEY = 'aradhya-meta-pixel-test-mode-v1';
const META_TEST_CODE_STORAGE_KEY = 'aradhya-meta-pixel-test-code-v1';
const MAX_STORED_PURCHASE_IDS = 50;
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '839123811919855';

let metaPixelScriptPromise = null;
let lastTrackedPath = null;
let lastAdvancedMatchingSignature = null;
let pendingAdvancedMatchingData = null;
let pixelInitialized = false;
let pixelInitializedWithUserData = false;

function canUseMetaPixel() {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && Boolean(PIXEL_ID);
}

function normalizeString(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function isTruthyToken(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on', 'debug'].includes(normalized);
}

function isFalsyToken(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['0', 'false', 'no', 'off'].includes(normalized);
}

function getUrlSearchParams() {
  if (!canUseMetaPixel()) {
    return null;
  }

  try {
    return new URLSearchParams(window.location.search || '');
  } catch {
    return null;
  }
}

function isMetaTestModeEnabled() {
  if (!canUseMetaPixel() || typeof window.sessionStorage === 'undefined') {
    return false;
  }

  const params = getUrlSearchParams();
  const queryValue = params?.get('meta_test');

  if (queryValue !== null) {
    const enabled = isTruthyToken(queryValue) && !isFalsyToken(queryValue);

    try {
      if (enabled) {
        window.sessionStorage.setItem(META_TEST_MODE_STORAGE_KEY, '1');
      } else {
        window.sessionStorage.removeItem(META_TEST_MODE_STORAGE_KEY);
      }
    } catch {
      // Ignore session storage failures in test mode.
    }

    return enabled;
  }

  try {
    return window.sessionStorage.getItem(META_TEST_MODE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function getMetaTestCode() {
  if (!canUseMetaPixel() || typeof window.sessionStorage === 'undefined') {
    return null;
  }

  const params = getUrlSearchParams();
  const queryValue =
    normalizeString(params?.get('meta_test_code')) ||
    normalizeString(params?.get('test_event_code'));

  if (queryValue !== null) {
    try {
      window.sessionStorage.setItem(META_TEST_CODE_STORAGE_KEY, queryValue);
    } catch {
      // Ignore session storage failures in test mode.
    }

    return queryValue;
  }

  try {
    return normalizeString(window.sessionStorage.getItem(META_TEST_CODE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function syncMetaDebugQueryParams() {
  if (!canUseMetaPixel()) {
    return false;
  }

  const params = getUrlSearchParams();
  if (!params) {
    return false;
  }

  let changed = false;

  if (isMetaTestModeEnabled() && params.get('meta_test') !== '1') {
    params.set('meta_test', '1');
    changed = true;
  }

  const testCode = getMetaTestCode();
  if (testCode && params.get('meta_test_code') !== testCode) {
    params.set('meta_test_code', testCode);
    changed = true;
  }

  if (!changed) {
    return false;
  }

  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash || ''}`;
  window.history.replaceState(window.history.state, '', nextUrl);
  return true;
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

function isMetaPixelReady(fbq = getMetaPixelFn()) {
  return typeof fbq === 'function' && typeof fbq.callMethod === 'function';
}

function getPendingCalls() {
  if (!Array.isArray(window.__metaPixelPendingCalls)) {
    window.__metaPixelPendingCalls = [];
  }

  return window.__metaPixelPendingCalls;
}

function getDebugEvents() {
  if (!Array.isArray(window.__metaPixelDebugEvents)) {
    window.__metaPixelDebugEvents = [];
  }

  return window.__metaPixelDebugEvents;
}

function recordDebugEvent(type, detail = {}) {
  if (!canUseMetaPixel() || !isMetaTestModeEnabled()) {
    return;
  }

  const entry = {
    type,
    detail,
    url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    timestamp: new Date().toISOString(),
  };

  getDebugEvents().push(entry);

  if (getDebugEvents().length > 100) {
    getDebugEvents().shift();
  }

  const testCode = getMetaTestCode();
  const codeSuffix = testCode ? ` (test_event_code=${testCode})` : '';
  console.info(`[Meta Pixel Test] ${type}${codeSuffix}`, detail);
}

function ensureMetaPixelStub() {
  if (!canUseMetaPixel()) {
    return null;
  }

  if (getMetaPixelFn()) {
    return getMetaPixelFn();
  }

  const stub = function metaPixelStub(...args) {
    stub.callMethod ? stub.callMethod.apply(stub, args) : stub.queue.push(args);
  };

  stub.push = stub;
  stub.loaded = false;
  stub.version = '2.0';
  stub.queue = Array.isArray(window.__metaPixelPendingCalls)
    ? window.__metaPixelPendingCalls
    : [];

  window.__metaPixelPendingCalls = stub.queue;
  window.fbq = stub;
  window._fbq = stub;

  return stub;
}

function ensureMetaPixelLoaded() {
  if (!canUseMetaPixel()) {
    return null;
  }

  const currentScript = document.getElementById(META_PIXEL_SCRIPT_ID);
  if (currentScript) {
    if (!metaPixelScriptPromise) {
      metaPixelScriptPromise = Promise.resolve(currentScript);
    }
    ensureMetaPixelStub();
    return metaPixelScriptPromise;
  }

  if (metaPixelScriptPromise) {
    ensureMetaPixelStub();
    return metaPixelScriptPromise;
  }

  ensureMetaPixelStub();

  metaPixelScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = META_PIXEL_SCRIPT_ID;
    script.async = true;
    script.src = META_PIXEL_SCRIPT_SRC;
    script.onload = () => {
      recordDebugEvent('script_loaded', { pixelId: PIXEL_ID });
      resolve(script);
    };
    script.onerror = () => {
      recordDebugEvent('script_failed', { pixelId: PIXEL_ID });
      reject(new Error('Failed to load Meta Pixel script.'));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    metaPixelScriptPromise = null;
    throw error;
  });

  recordDebugEvent('script_injected', { pixelId: PIXEL_ID });
  return metaPixelScriptPromise;
}

function getCurrentAdvancedMatchingData() {
  return pendingAdvancedMatchingData && Object.keys(pendingAdvancedMatchingData).length > 0
    ? pendingAdvancedMatchingData
    : null;
}

function initializeMetaPixel(userData = null) {
  if (!canUseMetaPixel()) {
    return false;
  }

  const fbq = ensureMetaPixelStub();
  const normalizedUserData =
    userData && typeof userData === 'object' && Object.keys(userData).length > 0
      ? userData
      : null;

  if (pixelInitialized && (!normalizedUserData || pixelInitializedWithUserData)) {
    return true;
  }

  if (normalizedUserData) {
    fbq('init', PIXEL_ID, normalizedUserData);
    pixelInitializedWithUserData = true;
    recordDebugEvent('init', { pixelId: PIXEL_ID, userData: normalizedUserData });
  } else {
    fbq('init', PIXEL_ID);
    recordDebugEvent('init', { pixelId: PIXEL_ID });
  }

  pixelInitialized = true;
  return true;
}

function flushPendingCalls() {
  const fbq = getMetaPixelFn();

  if (!isMetaPixelReady(fbq)) {
    return false;
  }

  const pendingCalls = getPendingCalls();

  while (pendingCalls.length > 0) {
    const args = pendingCalls.shift();
    fbq(...args);
    const [method, eventName, payload] = args;
    recordDebugEvent('event_flushed', {
      method,
      eventName,
      payload: payload || null,
    });
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
      recordDebugEvent('flush_stopped', { attempts });
      return;
    }

    window.__metaPixelFlushTimer = window.setTimeout(runFlush, FLUSH_INTERVAL_MS);
  };

  window.__metaPixelFlushTimer = window.setTimeout(runFlush, FLUSH_INTERVAL_MS);
}

function sendMetaPixelEvent(method, eventName, payload) {
  if (!canUseMetaPixel()) {
    return false;
  }

  ensureMetaPixelLoaded();
  initializeMetaPixel(getCurrentAdvancedMatchingData());

  const fbq = getMetaPixelFn();
  const args = payload === undefined
    ? [method, eventName]
    : [method, eventName, payload];

  if (fbq) {
    fbq(...args);
    if (isMetaPixelReady(fbq)) {
      recordDebugEvent('event_sent', { method, eventName, payload: payload || null });
      flushPendingCalls();
      return true;
    }

    recordDebugEvent('event_queued', { method, eventName, payload: payload || null });
    schedulePendingCallFlush();
    return false;
  }

  getPendingCalls().push(args);
  window.__metaPixelFlushAttempts = 0;
  schedulePendingCallFlush();
  recordDebugEvent('event_queued', { method, eventName, payload: payload || null });
  return false;
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

async function hashValue(value) {
  if (!value) {
    return null;
  }

  if (
    typeof window === 'undefined' ||
    !window.crypto ||
    !window.crypto.subtle ||
    typeof TextEncoder === 'undefined'
  ) {
    return value;
  }

  const digest = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
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

async function buildAdvancedMatchingData({ customer = null, shipping = null } = {}) {
  const customerId =
    normalizeString(customer?.id) ||
    normalizeString(customer?._id) ||
    normalizeString(customer?.userId) ||
    null;
  const email = normalizeEmail(customer?.email) || normalizeEmail(shipping?.email);
  const phone = normalizePhone(customer?.phone) || normalizePhone(shipping?.phone);
  const nameParts = getNameParts(customer?.name || shipping?.fullName);

  const normalizedData = {
    em: email,
    ph: phone,
    external_id: normalizeString(customerId),
    fn: normalizeString(nameParts.firstName)?.toLowerCase() || null,
    ln: normalizeString(nameParts.lastName)?.toLowerCase() || null,
    ct: normalizeString(shipping?.city)?.toLowerCase() || null,
    st: normalizeString(shipping?.state)?.toLowerCase() || null,
    zp: normalizeString(shipping?.postalCode),
    country: normalizeString(shipping?.country)?.toLowerCase() || null,
  };

  const hashedEntries = await Promise.all(
    Object.entries(normalizedData).map(async ([key, value]) => [key, await hashValue(value)]),
  );

  const userData = Object.fromEntries(hashedEntries);
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

export async function applyMetaAdvancedMatching(input = {}) {
  const userData = await buildAdvancedMatchingData(input);

  if (!Object.keys(userData).length) {
    return false;
  }

  const signature = JSON.stringify(userData);
  if (signature === lastAdvancedMatchingSignature) {
    return false;
  }

  lastAdvancedMatchingSignature = signature;
  pendingAdvancedMatchingData = userData;

  ensureMetaPixelLoaded();
  initializeMetaPixel(userData);
  recordDebugEvent('advanced_matching_updated', { userData });
  return true;
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
    recordDebugEvent('purchase_skipped_duplicate', { orderId: normalizedOrderId });
    return false;
  }

  if (canUseMetaPixel() && window.location.pathname !== '/checkout/success') {
    recordDebugEvent('purchase_skipped_wrong_page', {
      orderId: normalizedOrderId,
      pathname: window.location.pathname,
    });
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
  if (sent && normalizedOrderId && canUseMetaPixel()) {
    markPurchaseTracked(normalizedOrderId);
  }
  return sent;
}
