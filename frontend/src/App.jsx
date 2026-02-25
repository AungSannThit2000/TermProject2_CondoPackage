import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import { useAuth } from "./auth/AuthContext.jsx";

function HomeRedirect() {
  const { role } = useAuth();
  if (role === "ADMIN") return <Navigate to="/admin" replace />;
  if (role === "OFFICER") return <Navigate to="/officer" replace />;
  if (role === "TENANT") return <Navigate to="/tenant" replace />;
  return <Navigate to="/login" replace />;
}

function RoleHome({ title }) {
  const { displayName, logout } = useAuth();
  return (
    <div style={{ maxWidth: 720, margin: "48px auto", padding: 24 }}>
      <h1>{title}</h1>
      <p>Welcome, {displayName || "User"}.</p>
      <p>Day 1 module complete: authentication and role-based protected routes are working.</p>
      <button onClick={logout}>Logout</button>
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
            <RoleHome title="Officer Home" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenant"
        element={
          <ProtectedRoute allowRoles={["TENANT"]}>
            <RoleHome title="Tenant Home" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowRoles={["ADMIN"]}>
            <RoleHome title="Admin Home" />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}