const DEFAULT_MEASUREMENT_ID = 'G-ES9FQ2785T';
const PURCHASE_STORAGE_KEY = 'aradhya-ga4-purchases-v1';
const MAX_STORED_PURCHASE_IDS = 50;

const measurementId =
  import.meta.env.VITE_GA_MEASUREMENT_ID || DEFAULT_MEASUREMENT_ID;

let initialized = false;

function canUseAnalytics() {
  return (
    import.meta.env.PROD &&
    Boolean(measurementId) &&
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

function ensureDataLayer() {
  window.dataLayer = window.dataLayer || [];
}

function gtag(...args) {
  ensureDataLayer();
  window.dataLayer.push(args);
}

function normalizeString(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeQuantity(value) {
  const parsed = normalizeNumber(value, 1);
  return Math.max(Math.floor(parsed), 1);
}

function buildAnalyticsItems(items) {
  const normalizedItems = (Array.isArray(items) ? items : [items])
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const itemId =
        normalizeString(item.productId) ||
        normalizeString(item.sku) ||
        normalizeString(item.id) ||
        normalizeString(item.slug) ||
        normalizeString(item.handle) ||
        normalizeString(item.name) ||
        `item-${index + 1}`;
      const itemName =
        normalizeString(item.name) ||
        normalizeString(item.title) ||
        normalizeString(item.productName) ||
        itemId;
      const variant =
        normalizeString(item.size) ||
        normalizeString(item.variantTitle) ||
        normalizeString(item.variant);

      const analyticsItem = {
        item_id: itemId,
        item_name: itemName,
        price: normalizeNumber(item.price ?? item.unitPrice ?? item.amount, 0),
        quantity: normalizeQuantity(item.quantity),
      };

      if (variant) {
        analyticsItem.item_variant = variant;
      }

      return analyticsItem;
    })
    .filter(Boolean);

  return normalizedItems;
}

function getTrackedPurchaseIds() {
  if (!canUseAnalytics() || typeof window.sessionStorage === 'undefined') {
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

function hasTrackedPurchase(transactionId) {
  if (!transactionId) {
    return false;
  }

  return getTrackedPurchaseIds().includes(transactionId);
}

function markPurchaseTracked(transactionId) {
  if (!transactionId || !canUseAnalytics() || typeof window.sessionStorage === 'undefined') {
    return;
  }

  const nextIds = [
    transactionId,
    ...getTrackedPurchaseIds().filter((entry) => entry !== transactionId),
  ].slice(0, MAX_STORED_PURCHASE_IDS);

  try {
    window.sessionStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(nextIds));
  } catch {
    // Ignore storage failures and still allow event delivery.
  }
}

function sendAnalyticsEvent(eventName, params = {}) {
  if (!canUseAnalytics()) {
    return false;
  }

  initializeAnalytics();
  window.gtag('event', eventName, params);
  return true;
}

export function initializeAnalytics() {
  if (!canUseAnalytics() || initialized) {
    return false;
  }

  window.gtag = window.gtag || gtag;

  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.dataset.gaId = measurementId;
    document.head.appendChild(script);
    window.gtag('js', new Date());
    window.gtag('config', measurementId);
  }

  initialized = true;
  return true;
}

export function trackPageView({ pathname, search = '' }) {
  if (!canUseAnalytics()) {
    return;
  }

  initializeAnalytics();

  const pagePath = `${pathname}${search}`;
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_path: pagePath,
    page_location: window.location.href,
  });
}

export function trackAddToCart(items, { value, currency = 'INR' } = {}) {
  const analyticsItems = buildAnalyticsItems(items);
  if (!analyticsItems.length) {
    return false;
  }

  return sendAnalyticsEvent('add_to_cart', {
    currency: normalizeString(currency) || 'INR',
    value: normalizeNumber(value, 0),
    items: analyticsItems,
  });
}

export function trackBeginCheckout(items, { value, currency = 'INR' } = {}) {
  const analyticsItems = buildAnalyticsItems(items);
  if (!analyticsItems.length) {
    return false;
  }

  return sendAnalyticsEvent('begin_checkout', {
    currency: normalizeString(currency) || 'INR',
    value: normalizeNumber(value, 0),
    items: analyticsItems,
  });
}

export function trackPurchase({
  transactionId,
  value,
  currency = 'INR',
  items,
} = {}) {
  const normalizedTransactionId = normalizeString(transactionId);
  const analyticsItems = buildAnalyticsItems(items);

  if (!normalizedTransactionId || !analyticsItems.length) {
    return false;
  }

  if (hasTrackedPurchase(normalizedTransactionId)) {
    return false;
  }

  const sent = sendAnalyticsEvent('purchase', {
    transaction_id: normalizedTransactionId,
    value: normalizeNumber(value, 0),
    currency: normalizeString(currency) || 'INR',
    items: analyticsItems,
  });

  if (sent) {
    markPurchaseTracked(normalizedTransactionId);
  }

  return sent;
}

export function getAnalyticsMeasurementId() {
  return measurementId;
}
