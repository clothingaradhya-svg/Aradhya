// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/auth-context';
import { AdminProvider } from './contexts/admin-auth-context';
import AnalyticsTracker from './components/AnalyticsTracker';
import MetaAdvancedMatchingTracker from './components/MetaAdvancedMatchingTracker';
import ScrollToTop from './components/ScrollToTop';

const Layout = lazy(() => import('./components/Layout'));
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const CartPage = lazy(() => import('./pages/CartPage'));
const AllProductsPage = lazy(() => import('./pages/AllProductsPage'));
const Address = lazy(() => import('./pages/Address'));
const Payment = lazy(() => import('./pages/Payment'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const OrderDetails = lazy(() => import('./pages/OrderDetails'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const TrackShipmentPage = lazy(() => import('./pages/TrackShipmentPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogArticlePage = lazy(() => import('./pages/BlogArticlePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ShiprocketPage = lazy(() => import('./pages/ShiprocketPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const CancelRefundExchange = lazy(() => import('./pages/CancelRefundExchange'));
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'));
const AdminCollections = lazy(() => import('./pages/admin/AdminCollections'));
const AdminCollectionForm = lazy(() => import('./pages/admin/AdminCollectionForm'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminDiscounts = lazy(() => import('./pages/admin/AdminDiscounts'));
const AdminHomepageSections = lazy(() => import('./pages/admin/AdminHomepageSections'));

const RouteFallback = () => <div className="min-h-screen bg-white" />;

export default function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MetaAdvancedMatchingTracker />
        <AnalyticsTracker />
        <ScrollToTop />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              path="/admin/login"
              element={(
                <AdminProvider>
                  <AdminLogin />
                </AdminProvider>
              )}
            />
            <Route
              path="/admin"
              element={(
                <AdminProvider>
                  <AdminLayout />
                </AdminProvider>
              )}
            >
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<AdminProductForm />} />
              <Route path="products/:id" element={<AdminProductForm />} />
              <Route path="homepage-sections" element={<AdminHomepageSections />} />
              <Route path="collections" element={<AdminCollections />} />
              <Route path="collections/new" element={<AdminCollectionForm />} />
              <Route path="collections/:id" element={<AdminCollectionForm />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="discounts" element={<AdminDiscounts />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="products" element={<AllProductsPage />} />
              <Route path="collections/:handle" element={<CollectionPage />} />
              <Route path="shoes" element={<AllProductsPage initialCategory="shoes" />} />
              <Route path="shoes/loafers" element={<AllProductsPage initialCategory="loafers" />} />
              <Route path="shoes/boots" element={<AllProductsPage initialCategory="boots" />} />
              <Route path="shoes/sneakers" element={<AllProductsPage initialCategory="sneakers" />} />
              <Route path="shoes/sandals" element={<AllProductsPage initialCategory="sandals" />} />
              <Route path="apparel" element={<Navigate to="/products?category=t-shirts" replace />} />
              <Route path="product/:slug" element={<ProductDetails />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout/address" element={<Address />} />
              <Route path="checkout/payment" element={<Payment />} />
              <Route path="checkout/success" element={<OrderConfirmation />} />
              <Route path="orders" element={<OrderDetails />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="track/:awb" element={<TrackShipmentPage />} />
              <Route path="cancel-refund-exchange" element={<CancelRefundExchange />} />
              <Route path="legal" element={<Navigate to="/legal/privacy-policy" replace />} />
              <Route path="legal/:section" element={<LegalPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="blog" element={<BlogPage />} />
              <Route path="blog/:slug" element={<BlogArticlePage />} />
              <Route path="faq" element={<ContactPage />} />
              <Route path="shiprocket-demo" element={<ShiprocketPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="product" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
