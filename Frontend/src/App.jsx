import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import AdminLayout from './components/AdminLayout'
import { PageLoader } from './components/ui'

import Home from './pages/Home'
import Menu from './pages/Menu'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import ServiceInquiry from './pages/ServiceInquiry'
import About from './pages/About'
import Contact from './pages/Contact'

// The admin area is loaded only when it is opened, so the shop stays fast.
const AdminLogin = lazy(() => import('./pages/admin/Login'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Orders = lazy(() => import('./pages/admin/Orders'))
const Products = lazy(() => import('./pages/admin/Products'))
const Availability = lazy(() => import('./pages/admin/Availability'))
const Catering = lazy(() => import('./pages/admin/Catering'))
const Customers = lazy(() => import('./pages/admin/Customers'))
const Payments = lazy(() => import('./pages/admin/Payments'))
const Reports = lazy(() => import('./pages/admin/Reports'))
const SettingsPage = lazy(() => import('./pages/admin/Settings'))

function NotFound() {
  return (
    <div className="container-page py-28 text-center">
      <p className="text-6xl">🍰</p>
      <h1 className="mt-4 text-4xl font-semibold">Page not found</h1>
      <p className="mt-2 text-cocoa-500">That page seems to have been eaten.</p>
      <Link to="/" className="btn btn-primary mt-6">Back to home</Link>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/menu/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:orderNumber" element={<OrderConfirmation />} />
          <Route path="/catering" element={<ServiceInquiry mode="catering" />} />
          <Route path="/event-planning" element={<ServiceInquiry mode="event" />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="products" element={<Products />} />
          <Route path="availability" element={<Availability />} />
          <Route path="catering" element={<Catering mode="catering" />} />
          <Route path="event-planning" element={<Catering mode="event" />} />
          <Route path="customers" element={<Customers />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
