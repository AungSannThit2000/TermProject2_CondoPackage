/**
 * Tenant dashboard page.
 * Shows personal package counters and the latest waiting packages for quick resident visibility.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

export default function TenantDashboard() {
  const navigate = useNavigate();

  const [cards, setCards] = useState(null);
  const [packages, setPackages] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/tenant/dashboard")
      .then((res) => {
        setCards(res.data.cards);
        setPackages(res.data.latestWaiting);
        setProfile(res.data.profile);
      })
      .catch(() => {
        alert("Failed to load tenant dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  const roomLabel = profile ? `${profile.building_code || ""}${profile.room_no || ""}` : "";
  const userBadge = roomLabel && profile?.full_name ? `${roomLabel} - ${profile.full_name}` : "Resident";

  return (
    <DashboardLayout
      title="Tenant View"
      subtitle="Check your deliveries and pickup history."
      sidebarTitle="TENANT"
      sidebarSubtitle={userBadge}
      activeKey="dashboard"
      userName={profile?.full_name || "Tenant"}
      userSub={userBadge}
      navItems={[
        {
          key: "dashboard",
          label: "Dashboard",
          icon: "▦",
          onClick: () => navigate("/tenant"),
        },
        {
          key: "mypackages",
          label: "My Packages",
          icon: "📦",
          onClick: () => navigate("/tenant/packages"),
        },
        {
          key: "profile",
          label: "Profile",
          icon: "👤",
          onClick: () => navigate("/tenant/profile"),
        },
      ]}
    >
      {/* ===== Cards ===== */}
      <div className="cardsRow">
        <div className="cardBox">
          <div className="cardBoxTop">
            <div className="cardIcon">📦</div>
            <div>
              <div className="cardLabel">Packages waiting at counter</div>
              <div className="cardValue">
                {loading ? "…" : cards?.waiting}
              </div>
            </div>
          </div>
        </div>

        <div className="cardBox">
          <div className="cardBoxTop">
            <div className="cardIcon">✅</div>
            <div>
              <div className="cardLabel">Picked up this month</div>
              <div className="cardValue">
                {loading ? "…" : cards?.pickedUpThisMonth}
              </div>
            </div>
          </div>
        </div>

        <div className="cardBox">
          <div className="cardBoxTop">
            <div className="cardIcon">↩</div>
            <div>
              <div className="cardLabel">Returned</div>
              <div className="cardValue">
                {loading ? "…" : cards?.returned}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Table ===== */}
      <div className="tableBox">
        <div className="tableHeader">Latest Waiting Packages</div>

        <table className="table">
          <thead>
            <tr>
              <th>Tracking No</th>
              <th>Courier</th>
              <th>Status</th>
              <th>Arrival Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4">Loading…</td>
              </tr>
            ) : packages.length === 0 ? (
              <tr>
                <td colSpan="4">No waiting packages</td>
              </tr>
            ) : (
              packages.map((p, idx) => (
                <tr key={idx}>
                  <td>{p.tracking_no}</td>
                  <td>{p.carrier}</td>
                  <td>
                    <span className="badge">{p.current_status}</span>
                  </td>
                  <td>
                    {new Date(p.arrived_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
