import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getAnalyticsMeasurementId,
  initializeAnalytics,
  trackPageView,
} from '../lib/googleAnalytics';
import { syncMetaDebugQueryParams, trackMetaPageView } from '../lib/metaPixel';

const AnalyticsTracker = () => {
  const { pathname, search } = useLocation();
  const hasTrackedInitialPage = useRef(false);

  useEffect(() => {
    const hasGoogleAnalytics = Boolean(getAnalyticsMeasurementId());

    if (hasGoogleAnalytics) {
      initializeAnalytics();
    }

    syncMetaDebugQueryParams();

    if (hasTrackedInitialPage.current && hasGoogleAnalytics) {
      trackPageView({ pathname, search });
    }

    trackMetaPageView({ pathname, search });
    hasTrackedInitialPage.current = true;
  }, [pathname, search]);

  return null;
};

export default AnalyticsTracker;
