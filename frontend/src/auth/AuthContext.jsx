/**
 * Auth state container.
 * Stores token/role/display name and exposes login/logout helpers to the whole app tree.
 */

import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

function getStoredValue(key) {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(key) || "";
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredValue("token"));
  const [role, setRole] = useState(() => getStoredValue("role"));
  const [displayName, setDisplayName] = useState(() => getStoredValue("displayName"));

  const isAuthed = !!token;

  function login({ token, role, displayName }) {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      if (displayName) localStorage.setItem("displayName", displayName);
    }
    setToken(token);
    setRole(role);
    if (displayName) setDisplayName(displayName);
  }

  function setDisplayNameValue(name) {
    if (name) {
      if (typeof window !== "undefined") {
        localStorage.setItem("displayName", name);
      }
      setDisplayName(name);
    }
  }

  function logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("displayName");
    }
    setToken("");
    setRole("");
    setDisplayName("");
  }

  const value = useMemo(
    () => ({ token, role, displayName, isAuthed, login, logout, setDisplayNameValue }),
    [token, role, displayName, isAuthed]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
