import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  flushPendingAnalyticsEvents,
  getAnalyticsMeasurementId,
  initializeAnalytics,
  trackPageView,
} from '../lib/googleAnalytics';
import {
  ensureMetaPixelReady,
  syncMetaDebugQueryParams,
  trackMetaPageView,
} from '../lib/metaPixel';

const AnalyticsTracker = () => {
  const { pathname, search } = useLocation();
  const hasTrackedInitialPage = useRef(false);

  useEffect(() => {
    const hasGoogleAnalytics = Boolean(getAnalyticsMeasurementId());

    if (hasGoogleAnalytics) {
      initializeAnalytics();
    }

    ensureMetaPixelReady();
    syncMetaDebugQueryParams();

    if (hasTrackedInitialPage.current && hasGoogleAnalytics) {
      trackPageView({ pathname, search });
    }

    trackMetaPageView({ pathname, search });

    flushPendingAnalyticsEvents();
    hasTrackedInitialPage.current = true;
  }, [pathname, search]);

  return null;
};

export default AnalyticsTracker;
