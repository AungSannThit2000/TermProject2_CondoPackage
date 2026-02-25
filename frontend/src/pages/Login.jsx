/**
 * Login page.
 * Sends credentials to the backend, saves the returned session, and routes users by role.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Adjust body keys if your backend expects different names
      // e.g. { username, password } OR { email, password }
      const res = await api.post("/auth/login", { username, password });

      const { token, role, displayName } = res.data;

      if (!token || !role) {
        throw new Error("Login response missing token/role");
      }

      // If remember unchecked, store token only in memory is more complex.
      // For beginner version, we’ll keep localStorage always.
      // If you really want remember-me behavior later, we can move to sessionStorage.
      login({ token, role, displayName });

      if (role === "ADMIN") navigate("/admin");
      else if (role === "OFFICER") navigate("/officer");
      else navigate("/tenant");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg">
      <div className="card">
        <div className="logo">⬡</div>
        <h1 className="title">Condo Package System</h1>
        <p className="subtitle">Welcome back! Please login to continue</p>

        <form onSubmit={handleSubmit} className="form">
          <label className="label">Username</label>
          <div className="inputWrap">
            <span className="icon">👤</span>
            <input
              className="input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <label className="label">Password</label>
          <div className="inputWrap">
            <span className="icon">🔒</span>
            <input
              className="input"
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="row">
            <label className="check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              className="linkBtn"
              onClick={() => alert("Forgot password flow later")}
            >
              Forgot password?
            </button>
          </div>

          {error ? <div className="error">{error}</div> : null}

          <button className="btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
