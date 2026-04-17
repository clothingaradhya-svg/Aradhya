import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { getCheckoutDraft } from '../lib/checkout';
import { applyMetaAdvancedMatching } from '../lib/metaPixel';

const MetaAdvancedMatchingTracker = () => {
  const { customer } = useAuth();
  const { pathname, search } = useLocation();

  useEffect(() => {
    const checkoutDraft = getCheckoutDraft();

    applyMetaAdvancedMatching({
      customer,
      shipping: checkoutDraft?.shipping || null,
    });
  }, [customer, pathname, search]);

  return null;
};

export default MetaAdvancedMatchingTracker;
