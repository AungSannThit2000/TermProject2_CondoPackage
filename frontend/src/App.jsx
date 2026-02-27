/**
 * App routing table.
 * Declares all public/protected routes and redirects users to the correct dashboard by role.
 */

import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import OfficerDashboard from "./pages/OfficerDashboard.jsx";
import TenantDashboard from "./pages/TenantDashboard.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import OfficerPackageDetail from "./pages/OfficerPackageDetail.jsx";
import OfficerAddPackage from "./pages/OfficerAddPackage.jsx";
import OfficerPackageLog from "./pages/OfficerPackageLog.jsx";
import TenantPackages from "./pages/TenantPackages.jsx";
import TenantProfile from "./pages/TenantProfile.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminPackages from "./pages/AdminPackages.jsx";
import AdminOfficers from "./pages/AdminOfficers.jsx";
import AdminRooms from "./pages/AdminRooms.jsx";
import AdminTenants from "./pages/AdminTenants.jsx";
import AdminPackageLog from "./pages/AdminPackageLog.jsx";
import AdminPackageDetail from "./pages/AdminPackageDetail.jsx";
import { useAuth } from "./auth/AuthContext.jsx";

function HomeRedirect() {
  const { role } = useAuth();
  if (role === "ADMIN") return <Navigate to="/admin" replace />;
  if (role === "OFFICER") return <Navigate to="/officer" replace />;
  if (role === "TENANT") return <Navigate to="/tenant" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/officer"
        element={
          <ProtectedRoute allowRoles={["OFFICER", "ADMIN"]}>
            <OfficerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/add"
        element={
          <ProtectedRoute allowRoles={["OFFICER", "ADMIN"]}>
            <OfficerAddPackage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tenant"
        element={
          <ProtectedRoute allowRoles={["TENANT"]}>
            <TenantDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenant/packages"
        element={
          <ProtectedRoute allowRoles={["TENANT"]}>
            <TenantPackages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenant/profile"
        element={
          <ProtectedRoute allowRoles={["TENANT"]}>
            <TenantProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/officer/packages/:id"
        element={
          <ProtectedRoute allowRoles={["OFFICER", "ADMIN"]}>
            <OfficerPackageDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/officer/log"
        element={
          <ProtectedRoute allowRoles={["OFFICER", "ADMIN"]}>
            <OfficerPackageLog />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowRoles={["ADMIN"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/packages"
        element={
          <ProtectedRoute allowRoles={["ADMIN"]}>
            <AdminPackages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/officers"
        element={
          <ProtectedRoute allowRoles={["ADMIN"]}>
            <AdminOfficers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/rooms"
        element={
          <ProtectedRoute allowRoles={["ADMIN"]}>
            <AdminRooms />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tenants"
        element={
          <ProtectedRoute allowRoles={["ADMIN"]}>
            <AdminTenants />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/log"
        element={
          <ProtectedRoute allowRoles={["ADMIN"]}>
            <AdminPackageLog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/packages/:id"
        element={
          <ProtectedRoute allowRoles={["ADMIN"]}>
            <AdminPackageDetail />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
