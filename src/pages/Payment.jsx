import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgePercent,
  Banknote,
  CreditCard,
  Landmark,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  createFastrrCheckoutSession,
  fetchFastrrCheckoutStatus,
  fetchFastrrConfig,
  formatMoney,
  verifyDiscountCode,
} from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import { useCart } from '../contexts/cart-context';
import {
  clearCheckoutDraft,
  getCheckoutDraft,
  setCheckoutDraft,
} from '../lib/checkout';

const PAYMENT_METHODS = [
  {
    id: 'UPI',
    label: 'UPI',
    description: 'Show UPI as the preferred payment choice inside Shiprocket checkout.',
    icon: Smartphone,
  },
  {
    id: 'CARD',
    label: 'Credit / Debit Card',
    description: 'Prefer card payment when the secure Shiprocket checkout opens.',
    icon: CreditCard,
  },
  {
    id: 'NET_BANKING',
    label: 'Net Banking',
    description: 'Prefer bank transfer when payment options are shown.',
    icon: Landmark,
  },
  {
    id: 'WALLET',
    label: 'Wallets',
    description: 'Prefer wallet payment options if available.',
    icon: Wallet,
  },
  {
    id: 'COD',
    label: 'Cash on Delivery',
    description: 'Prefer COD if Shiprocket enables it for the order and delivery address.',
    icon: Banknote,
  },
];

const getPaymentMethodMeta = (methodId) =>
  PAYMENT_METHODS.find((item) => item.id === methodId) || PAYMENT_METHODS[0];

const SHIPROCKET_SCRIPT_URL =
  'https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js';
const SHIPROCKET_STYLE_URL =
  'https://checkout-ui.shiprocket.com/assets/styles/shopify.css';
const SHIPROCKET_ASSET_TIMEOUT_MS = 15000;
const REQUEST_TIMEOUT_MS = 20000;

let shiprocketAssetsPromise = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, ms, message) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const ensureShiprocketStylesheet = (href) => {
  if (typeof document === 'undefined' || !href) return;
  const existing = document.querySelector(`link[data-shiprocket-style="${href}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.shiprocketStyle = href;
  document.head.appendChild(link);
};

const loadShiprocketAssets = (scriptUrl, styleUrl) => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.HeadlessCheckout?.addToCart) {
    ensureShiprocketStylesheet(styleUrl);
    return Promise.resolve(true);
  }
  if (shiprocketAssetsPromise) return shiprocketAssetsPromise;

  ensureShiprocketStylesheet(styleUrl);

  shiprocketAssetsPromise = withTimeout(
    new Promise((resolve) => {
      const src = scriptUrl || SHIPROCKET_SCRIPT_URL;
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener(
          'load',
          () => resolve(Boolean(window.HeadlessCheckout?.addToCart)),
          { once: true },
        );
        existing.addEventListener('error', () => resolve(false), { once: true });
        setTimeout(() => resolve(Boolean(window.HeadlessCheckout?.addToCart)), 0);
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve(Boolean(window.HeadlessCheckout?.addToCart));
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    }),
    SHIPROCKET_ASSET_TIMEOUT_MS,
    'Shiprocket checkout assets timed out while loading. Please try again.',
  ).finally(() => {
    shiprocketAssetsPromise = null;
  });

  return shiprocketAssetsPromise;
};

const buildSafeDraft = (draft) => ({
  createdAt: draft?.createdAt || new Date().toISOString(),
  items: Array.isArray(draft?.items) ? draft.items : [],
  shipping: draft?.shipping || {},
  appliedDiscount: draft?.appliedDiscount || null,
  totals: {
    subtotal: Number(draft?.totals?.subtotal ?? 0),
    shippingFee: 0,
    paymentFee: 0,
    discountAmount: Number(
      draft?.appliedDiscount?.amount ?? draft?.totals?.discountAmount ?? 0,
    ),
    discountCode: draft?.appliedDiscount?.code || draft?.totals?.discountCode || null,
    total: Math.max(
      Number(draft?.totals?.subtotal ?? 0) -
        Number(draft?.appliedDiscount?.amount ?? draft?.totals?.discountAmount ?? 0),
      0,
    ),
    currency: draft?.totals?.currency || 'INR',
    itemCount: Number(draft?.totals?.itemCount ?? 0),
  },
});

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { removeItem } = useCart();
  const { isAuthenticated, getAuthToken, refreshCustomer } = useAuth();
  const handledReturnRef = useRef(false);

  const [draft, setDraft] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState('UPI');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkingReturn, setCheckingReturn] = useState(false);
  const [error, setError] = useState('');
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [discountMessage, setDiscountMessage] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);
  const [fastrrConfig, setFastrrConfig] = useState({
    configured: false,
    scriptUrl: SHIPROCKET_SCRIPT_URL,
    styleUrl: SHIPROCKET_STYLE_URL,
  });

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const shiprocketOrderId = String(
    searchParams.get('oid') || searchParams.get('orderId') || '',
  ).trim();
  const shiprocketStatus = String(searchParams.get('ost') || '').trim().toUpperCase();
  const isShiprocketReturn = Boolean(searchParams.get('shiprocket') || shiprocketOrderId);

  useEffect(() => {
    let active = true;

    fetchFastrrConfig()
      .then((config) => {
        if (!active || !config) return;
        setFastrrConfig({
          configured: Boolean(config.configured),
          scriptUrl: config.scriptUrl || SHIPROCKET_SCRIPT_URL,
          styleUrl: config.styleUrl || SHIPROCKET_STYLE_URL,
        });
      })
      .catch(() => {
        if (!active) return;
        setFastrrConfig((prev) => ({
          ...prev,
          configured: false,
        }));
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const currentDraft = getCheckoutDraft();

    if (!currentDraft?.items?.length) {
      if (isShiprocketReturn) {
        setDraft(
          buildSafeDraft({
            items: [],
            shipping: {},
            totals: { subtotal: 0, total: 0, currency: 'INR', itemCount: 0 },
          }),
        );
        return;
      }

      navigate('/cart', { replace: true });
      return;
    }

    if (!currentDraft?.shipping && !isShiprocketReturn) {
      navigate('/checkout/address', { replace: true });
      return;
    }

    const normalizedDraft = buildSafeDraft(currentDraft);
    setDraft(normalizedDraft);
    setCheckoutDraft(normalizedDraft);
    setSelectedPayment(currentDraft.paymentMethod || 'UPI');
    setDiscountCodeInput(
      currentDraft?.appliedDiscount?.code || currentDraft?.totals?.discountCode || '',
    );
    setDiscountMessage('');
  }, [isShiprocketReturn, navigate]);

  useEffect(() => {
    setDraft((prev) => {
      if (!prev) return prev;

      const activeDiscount = prev.appliedDiscount || null;
      const nextDiscountAmount = Number(
        activeDiscount?.amount ?? prev?.totals?.discountAmount ?? 0,
      );
      const nextDraft = {
        ...prev,
        paymentMethod: selectedPayment,
        totals: {
          ...prev.totals,
          shippingFee: 0,
          paymentFee: 0,
          discountAmount: nextDiscountAmount,
          discountCode: activeDiscount?.code || prev?.totals?.discountCode || null,
          total: Math.max(Number(prev?.totals?.subtotal ?? 0) - nextDiscountAmount, 0),
        },
        updatedAt: new Date().toISOString(),
      };
      setCheckoutDraft(nextDraft);
      return nextDraft;
    });
  }, [selectedPayment]);

  useEffect(() => {
    if (!shiprocketOrderId || handledReturnRef.current) return;
    handledReturnRef.current = true;

    const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
    if (!token) {
      setError('Please log in again to confirm your Shiprocket order.');
      return;
    }

    const finalizeReturn = async () => {
      setCheckingReturn(true);
      setError('');

      if (shiprocketStatus === 'FAILED') {
        setCheckingReturn(false);
        setError('Shiprocket checkout was not completed. Your cart is still available.');
        return;
      }

      try {
        const order = await withTimeout(
          fetchFastrrCheckoutStatus(token, {
            orderId: shiprocketOrderId,
            refresh: '1',
          }),
          REQUEST_TIMEOUT_MS,
          'Order confirmation timed out. Please refresh My Orders in a moment.',
        );

        const checkoutItems = Array.isArray(draft?.items) ? draft.items : [];
        checkoutItems.forEach((item) => {
          removeItem(item.slug, item.size ?? null);
        });
        clearCheckoutDraft();

        if (typeof refreshCustomer === 'function') {
          await refreshCustomer();
        }

        navigate(`/orders/${order?.id || order?.number}`, {
          replace: true,
          state: {
            justPlaced: true,
            orderNumber: order?.number || null,
            order,
          },
        });
      } catch (err) {
        const message =
          err?.message ||
          'We could not confirm the Shiprocket order yet. Please check My Orders in a moment.';
        setError(message);
      } finally {
        await sleep(150);
        setCheckingReturn(false);
      }
    };

    finalizeReturn();
  }, [
    draft?.items,
    getAuthToken,
    navigate,
    refreshCustomer,
    removeItem,
    shiprocketOrderId,
    shiprocketStatus,
  ]);

  const itemCount = useMemo(
    () => (draft?.items || []).reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
    [draft?.items],
  );

  const currency = draft?.totals?.currency || 'INR';
  const subtotal = Number(draft?.totals?.subtotal ?? 0);
  const shippingFee = 0;
  const paymentFee = 0;
  const selectedMethodMeta = getPaymentMethodMeta(selectedPayment);
  const appliedDiscount = draft?.appliedDiscount || null;
  const discountAmount = Number(appliedDiscount?.amount ?? draft?.totals?.discountAmount ?? 0);
  const finalTotal = Math.max(subtotal + shippingFee + paymentFee - discountAmount, 0);

  const orderItems = useMemo(
    () =>
      (draft?.items || []).map((item) => ({
        id: String(item.id || '').trim(),
        sku: item.sku || undefined,
        name: item.name || item.slug || 'Product',
        price: Number(item.price || 0),
        currency: item.currency || currency,
        quantity: Number(item.quantity || 1),
        size: item.size || undefined,
      })),
    [currency, draft?.items],
  );

  const persistDiscountInDraft = (nextDiscount) => {
    if (!draft) return;
    const normalizedDiscount =
      nextDiscount && Number(nextDiscount.amount) > 0
        ? {
            id: nextDiscount.id || null,
            code: String(nextDiscount.code || '').trim().toUpperCase(),
            type: nextDiscount.type || null,
            value: Number(nextDiscount.value || 0),
            amount: Number(nextDiscount.amount || 0),
            name: nextDiscount.name || null,
          }
        : null;

    const nextDiscountAmount = Number(normalizedDiscount?.amount || 0);
    const nextDraft = {
      ...draft,
      appliedDiscount: normalizedDiscount,
      totals: {
        ...draft.totals,
        shippingFee: 0,
        paymentFee: 0,
        discountAmount: nextDiscountAmount,
        discountCode: normalizedDiscount?.code || null,
        total: Math.max(subtotal - nextDiscountAmount, 0),
      },
      updatedAt: new Date().toISOString(),
    };

    setDraft(nextDraft);
    setCheckoutDraft(nextDraft);
  };

  const handleApplyDiscount = async () => {
    if (!draft || discountLoading) return;
    const code = String(discountCodeInput || '').trim().toUpperCase();
    if (!code) {
      setDiscountMessage('Enter a discount code.');
      return;
    }

    try {
      setDiscountLoading(true);
      setDiscountMessage('');
      const verified = await verifyDiscountCode({
        code,
        subtotal,
        currency,
      });

      persistDiscountInDraft({
        id: verified?.id || null,
        code: verified?.code || code,
        type: verified?.type || null,
        value: Number(verified?.value || 0),
        amount: Number(verified?.amount || 0),
        name: verified?.name || null,
      });

      setDiscountCodeInput(verified?.code || code);
      setDiscountMessage(`Applied ${verified?.code || code} successfully.`);
      setError('');
    } catch (err) {
      setDiscountMessage(err?.message || 'Unable to apply this code.');
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    if (!draft) return;
    persistDiscountInDraft(null);
    setDiscountCodeInput('');
    setDiscountMessage('Discount removed.');
  };

  const handlePlaceOrder = async (event) => {
    const checkoutEvent = event?.nativeEvent || event || null;

    if (!draft?.items?.length || placingOrder || checkingReturn) {
      setError('Please select items to checkout.');
      return;
    }
    setError('');

    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout/payment');
      return;
    }

    const token = typeof getAuthToken === 'function' ? getAuthToken() : null;
    if (!token) {
      setError('Session expired. Please log in again.');
      navigate('/login?redirect=/checkout/payment');
      return;
    }

    if (!draft.shipping?.fullName || !draft.shipping?.address) {
      setError('Shipping address is incomplete. Please go back and complete your address.');
      return;
    }

    if (finalTotal <= 0) {
      setError('Order total is invalid. Please refresh and try again.');
      return;
    }

    try {
      setPlacingOrder(true);
      const payload = {
        order: {
          paymentMethod: selectedPayment,
          totals: {
            subtotal,
            shippingFee: 0,
            paymentFee: 0,
            discountAmount,
            discountCode: appliedDiscount?.code || null,
            total: finalTotal,
            currency,
          },
          shipping: draft.shipping,
          items: orderItems,
        },
      };

      const session = await withTimeout(
        createFastrrCheckoutSession(token, payload),
        REQUEST_TIMEOUT_MS,
        'Unable to create Shiprocket checkout right now. Please try again.',
      );

      const assetsLoaded = await loadShiprocketAssets(
        session?.scriptUrl || fastrrConfig.scriptUrl,
        session?.styleUrl || fastrrConfig.styleUrl,
      );
      if (!assetsLoaded || !window.HeadlessCheckout?.addToCart) {
        throw new Error('Shiprocket checkout could not be loaded. Please try again.');
      }

      window.HeadlessCheckout.addToCart(checkoutEvent, session.token);
      setDiscountMessage('Opening secure Shiprocket checkout...');
    } catch (err) {
      const message =
        err?.message ||
        err?.payload?.error?.message ||
        'Unable to continue to Shiprocket checkout right now.';
      setError(message);
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!draft) return null;

  return (
    <div className="min-h-screen bg-[#f7f7fa] pb-24">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded p-1 text-gray-700 hover:bg-gray-100"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-bold tracking-wide text-[var(--color-text-main)]">
              PAYMENT
            </h1>
          </div>
          <span className="text-xs font-semibold text-gray-500">STEP 3/3</span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-[var(--color-text-main)]">
            Deliver to
          </p>
          <p className="text-sm font-semibold text-gray-900">{draft.shipping?.fullName}</p>
          <p className="text-sm text-gray-600">{draft.shipping?.address}</p>
          <p className="text-sm text-gray-600">
            {draft.shipping?.city} {draft.shipping?.postalCode}
          </p>
          <p className="mt-1 text-sm text-gray-600">{draft.shipping?.phone}</p>
          <Link
            to="/checkout/address"
            className="mt-3 inline-flex text-xs font-semibold text-black hover:underline"
          >
            Change address
          </Link>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BadgePercent className="h-4 w-4 text-gray-700" />
            <p className="text-sm font-semibold text-[var(--color-text-main)]">
              Apply Discount Code
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={discountCodeInput}
              onChange={(event) => setDiscountCodeInput(event.target.value.toUpperCase())}
              placeholder="Enter code"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyDiscount}
              disabled={discountLoading || !discountCodeInput.trim()}
              className="rounded-lg border border-black px-4 py-2 text-xs font-bold uppercase tracking-wide text-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
            >
              {discountLoading ? 'Applying...' : 'Apply'}
            </button>
          </div>

          {appliedDiscount?.code ? (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <span>
                {appliedDiscount.code} applied ({formatMoney(discountAmount, currency)} off)
              </span>
              <button
                type="button"
                onClick={handleRemoveDiscount}
                className="text-xs font-semibold underline"
              >
                Remove
              </button>
            </div>
          ) : null}

          {discountMessage ? (
            <p
              className={`mt-2 text-xs ${
                appliedDiscount?.code ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {discountMessage}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
              Preferred payment method
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = selectedPayment === method.id;
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPayment(method.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                    isSelected ? '' : 'hover:bg-gray-50'
                  }`}
                  style={isSelected ? { backgroundColor: 'rgba(17, 24, 39, 0.08)' } : undefined}
                >
                  <span
                    className={`mt-1 h-5 w-5 rounded-full border-2 ${
                      isSelected ? 'border-black' : 'border-gray-300'
                    }`}
                  >
                    <span
                      className={`mx-auto mt-[3px] block h-2.5 w-2.5 rounded-full ${
                        isSelected ? 'bg-black' : 'bg-transparent'
                      }`}
                    />
                  </span>
                  <Icon className="mt-0.5 h-4 w-4 text-gray-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{method.label}</p>
                    <p className="text-xs text-gray-500">{method.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-700" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Secure checkout by Shiprocket
              </p>
              <p className="mt-1 text-sm text-blue-800">
                Your cart will open inside Shiprocket&apos;s hosted checkout. Shipping,
                payment, and final confirmation happen there, and then you&apos;ll be brought
                back to Aradhya automatically.
              </p>
              <p className="mt-2 text-xs text-blue-700">
                Preference saved: {selectedMethodMeta.label}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-[var(--color-text-main)]">
            Order Summary
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal ({itemCount} items)</span>
              <span>{formatMoney(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Delivery</span>
              <span className="font-semibold text-emerald-600">Free</span>
            </div>
            {discountAmount > 0 ? (
              <div className="flex justify-between text-emerald-700">
                <span>
                  Discount
                  {appliedDiscount?.code ? ` (${appliedDiscount.code})` : ''}
                </span>
                <span>-{formatMoney(discountAmount, currency)}</span>
              </div>
            ) : null}
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between text-base font-bold text-[var(--color-text-main)]">
                <span>Total Order Value</span>
                <span>{formatMoney(finalTotal, currency)}</span>
              </div>
            </div>
          </div>
        </section>

        {!isAuthenticated ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-bold">!</span>
            <div>
              <p className="font-semibold">Login Required</p>
              <p className="mt-1 text-xs">Please login to continue to checkout.</p>
            </div>
          </div>
        ) : null}

        {!fastrrConfig.configured && !checkingReturn ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Shiprocket checkout isn&apos;t configured on the server yet. Add the Fastrr API
            key and secret, then try again.
          </div>
        ) : null}

        {checkingReturn ? (
          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>
              Confirming your Shiprocket order
              {shiprocketOrderId ? ` (${shiprocketOrderId})` : ''}...
            </span>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="font-bold">x</span>
            <div className="flex-1">
              <p className="font-semibold">Error</p>
              <p className="mt-1 text-xs">{error}</p>
            </div>
          </div>
        ) : null}

        {placingOrder ? (
          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>Preparing Shiprocket checkout...</span>
          </div>
        ) : null}
      </div>

      <div className="fixed bottom-[60px] left-0 right-0 z-30 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.04)] md:bottom-0">
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={placingOrder || checkingReturn || !fastrrConfig.configured}
          className="w-full rounded-sm bg-black py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
        >
          {placingOrder
            ? 'Opening Checkout...'
            : checkingReturn
              ? 'Confirming Order...'
              : `Continue to Shiprocket Checkout - ${formatMoney(finalTotal, currency)}`}
        </button>
      </div>
    </div>
  );
}
