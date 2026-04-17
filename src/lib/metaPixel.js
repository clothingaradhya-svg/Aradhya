const FLUSH_INTERVAL_MS = 250;
const MAX_FLUSH_ATTEMPTS = 20;

let lastTrackedPath = null;

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
