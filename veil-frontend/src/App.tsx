import { Navigate, Route, Routes } from 'react-router-dom';
import { StoreLayout } from './components/Storefront';
import {
  AdminCatalogPage,
  AdminCustomersPage,
  AdminDashboardPage,
  AdminGate,
  AdminLoginPage,
  AdminOrdersPage,
  AdminSettingsPage,
} from './pages/AdminPages';
import {
  CheckoutPage,
  HomePage,
  OrderSuccessPage,
  PackagePage,
  ProductPage,
  ShopPage,
  TrackPage,
} from './pages/StorePages';

export default function App() {
  return <Routes>
    <Route element={<StoreLayout />}>
      <Route index element={<HomePage />} />
      <Route path="shop" element={<ShopPage />} />
      <Route path="packages" element={<ShopPage packagesOnly />} />
      <Route path="products/:slug" element={<ProductPage />} />
      <Route path="packages/:slug" element={<PackagePage />} />
      <Route path="checkout" element={<CheckoutPage />} />
      <Route path="order-success/:orderNumber" element={<OrderSuccessPage />} />
      <Route path="track" element={<TrackPage />} />
    </Route>
    <Route path="admin/login" element={<AdminLoginPage />} />
    <Route path="admin" element={<AdminGate />}>
      <Route index element={<AdminDashboardPage />} />
      <Route path="orders" element={<AdminOrdersPage />} />
      <Route path="products" element={<AdminCatalogPage />} />
      <Route path="packages" element={<AdminCatalogPage packages />} />
      <Route path="customers" element={<AdminCustomersPage />} />
      <Route path="settings" element={<AdminSettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
