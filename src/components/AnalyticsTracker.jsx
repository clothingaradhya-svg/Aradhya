import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getAnalyticsMeasurementId,
  initializeAnalytics,
  trackPageView,
} from '../lib/googleAnalytics';

const AnalyticsTracker = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!getAnalyticsMeasurementId()) {
      return;
    }

    initializeAnalytics();
    trackPageView({ pathname, search });
  }, [pathname, search]);

  return null;
};

export default AnalyticsTracker;
