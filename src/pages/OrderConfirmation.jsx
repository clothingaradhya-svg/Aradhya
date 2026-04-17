import React, { useEffect, useMemo } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { CheckCircle, Package, Truck, Home } from 'lucide-react';
import { trackMetaPurchase } from '../lib/metaPixel';

const OrderConfirmation = () => {
  const location = useLocation();
  const order = location.state?.order || null;
  const orderNumber = location.state?.orderNumber || order?.number || '';
  const awb = String(
    order?.shipping?.awbCode || order?.shipping?.awb || order?.shipping?.trackingNumber || '',
  ).trim();

  const purchaseItems = useMemo(() => {
    const candidates = Array.isArray(order?.items)
      ? order.items
      : Array.isArray(order?.lineItems)
        ? order.lineItems
        : [];

    return candidates.map((item) => ({
      id: item?.productId ?? item?.variantId ?? item?.id ?? item?.sku ?? item?.slug ?? null,
      productId:
        item?.sku ?? item?.productId ?? item?.variantId ?? item?.id ?? item?.slug ?? null,
      sku: item?.sku ?? null,
      slug: item?.slug ?? null,
      handle: item?.slug ?? item?.handle ?? null,
      name: item?.name ?? item?.title ?? item?.productName ?? 'Product',
      price: Number(item?.price ?? item?.unitPrice ?? item?.amount ?? 0),
      currency: item?.currency ?? order?.currency ?? order?.totals?.currency ?? 'INR',
      quantity: Number(item?.quantity ?? 1),
      size: item?.size ?? item?.variantTitle ?? null,
    }));
  }, [order]);

  const purchaseValue = useMemo(
    () =>
      Number(
        order?.totals?.total ??
          order?.total ??
          order?.amount ??
          purchaseItems.reduce(
            (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
            0,
          ),
      ),
    [order, purchaseItems],
  );

  const purchaseCurrency =
    order?.totals?.currency || order?.currency || purchaseItems[0]?.currency || 'INR';

  useEffect(() => {
    if (!order) return;

    trackMetaPurchase({
      orderId: order?.id || order?.number || order?._id || null,
      value: purchaseValue,
      currency: purchaseCurrency,
      items: purchaseItems,
    });
  }, [order, purchaseCurrency, purchaseItems, purchaseValue]);

  if (!order) {
    return <Navigate to="/orders" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-gray-50 px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl md:p-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-12 w-12 text-emerald-600" />
          </div>

          <h1 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">
            Order Confirmed
          </h1>
          <p className="text-lg text-gray-600">
            Your order <span className="font-semibold text-gray-900">#{orderNumber}</span> has
            been placed successfully.
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Your payment and order are saved. Shipment details will appear as soon as Shiprocket
            confirms the AWB.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              to={`/orders/${order.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-900"
            >
              <Package className="h-5 w-5" />
              View Order Details
            </Link>

            {awb ? (
              <Link
                to={`/track/${encodeURIComponent(awb)}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <Truck className="h-5 w-5" />
                Track Shipment
              </Link>
            ) : null}
          </div>

          <Link
            to="/products"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <Home className="h-5 w-5" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
