const DEFAULT_MEASUREMENT_ID = 'G-ES9FQ2785T';

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

export function getAnalyticsMeasurementId() {
  return measurementId;
}
