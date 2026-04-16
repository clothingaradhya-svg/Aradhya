import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getAnalyticsMeasurementId,
  initializeAnalytics,
  trackPageView,
} from '../lib/googleAnalytics';

const AnalyticsTracker = () => {
  const { pathname, search } = useLocation();
  const hasTrackedInitialPage = useRef(false);

  useEffect(() => {
    if (!getAnalyticsMeasurementId()) {
      return;
    }

    initializeAnalytics();

    // The initial page view is handled by the head-level GA config tag.
    if (!hasTrackedInitialPage.current) {
      hasTrackedInitialPage.current = true;
      return;
    }

    trackPageView({ pathname, search });
  }, [pathname, search]);

  return null;
};

export default AnalyticsTracker;
