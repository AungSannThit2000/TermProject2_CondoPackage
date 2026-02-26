import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import OfficerDashboard from "./pages/OfficerDashboard.jsx";
import OfficerAddPackage from "./pages/OfficerAddPackage.jsx";
import OfficerPackageDetail from "./pages/OfficerPackageDetail.jsx";
import OfficerPackageLog from "./pages/OfficerPackageLog.jsx";

function HomeRedirect() {
  const { role } = useAuth();
  if (role === "ADMIN") return <Navigate to="/admin" replace />;
  if (role === "OFFICER") return <Navigate to="/officer" replace />;
  if (role === "TENANT") return <Navigate to="/tenant" replace />;
  return <Navigate to="/login" replace />;
}

function Placeholder({ title }) {
  return (
    <div style={{ maxWidth: 720, margin: "48px auto", padding: 24 }}>
      <h1>{title}</h1>
      <p>This role module is scheduled for a later day.</p>
    </div>
  );
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
        path="/tenant"
        element={
          <ProtectedRoute allowRoles={["TENANT"]}>
            <Placeholder title="Tenant Module Pending" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowRoles={["ADMIN"]}>
            <Placeholder title="Admin Module Pending" />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}