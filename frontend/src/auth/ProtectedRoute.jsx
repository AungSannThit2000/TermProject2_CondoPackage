/**
 * Route guard component.
 * Blocks unauthenticated users and enforces role-based page access before rendering children.
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ allowRoles, children }) {
  const { isAuthed, role } = useAuth();

  if (!isAuthed) return <Navigate to="/login" replace />;
  if (allowRoles && !allowRoles.includes(role)) return <Navigate to="/login" replace />;

  return children;
}
