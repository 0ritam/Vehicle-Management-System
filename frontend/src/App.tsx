import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import Layout from "@/components/Layout"
import ProtectedRoute from "@/components/ProtectedRoute"
import LoginPage from "@/pages/LoginPage"
import DashboardPage from "@/pages/DashboardPage"
import ComponentsPage from "@/pages/ComponentsPage"
import VehiclesPage from "@/pages/VehiclesPage"
import OrdersListPage from "@/pages/OrdersListPage"
import OrderDetailPage from "@/pages/OrderDetailPage"
import OrderCreatePage from "@/pages/OrderCreatePage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/components" element={<ComponentsPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/orders" element={<OrdersListPage />} />
          <Route path="/orders/new" element={<OrderCreatePage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
