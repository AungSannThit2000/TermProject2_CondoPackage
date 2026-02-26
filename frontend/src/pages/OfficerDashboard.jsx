/**
 * Officer dashboard page.
 * Shows package KPI cards plus a searchable/filterable working list for front-desk staff.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useOfficerDisplayName } from "../hooks/useOfficerDisplayName.js";

export default function OfficerDashboard() {
  const navigate = useNavigate();
  const displayName = useOfficerDisplayName();

  const [cards, setCards] = useState(null);
  const [packages, setPackages] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [periodFilter, setPeriodFilter] = useState("today");
  const [visibleCount, setVisibleCount] = useState(10);

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((p) => {
      const tracking = (p.tracking_no || "").toLowerCase();
      const tenant = (p.tenant_name || "").toLowerCase();
      return tracking.includes(q) || tenant.includes(q);
    });
  }, [packages, search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (unitFilter) params.append("unit", unitFilter);
    if (periodFilter) params.append("period", periodFilter);
    if (periodFilter === "custom" && startDate) {
      params.append("start_date", startDate);
      params.append("end_date", endDate || new Date().toISOString().slice(0, 10));
    }
    if (periodFilter === "custom") {
      params.append("date", ""); // ensure server ignores default today path
    }

    const query = params.toString();
    const url = query ? `/officer/dashboard?${query}` : "/officer/dashboard";

    setLoading(true);
    api
      .get(url)
      .then((res) => {
        setCards(res.data.cards);
        setPackages(res.data.todayPackages);
        setUnitOptions(res.data.unitOptions || []);
        setVisibleCount(10); // reset when data changes
      })
      .catch(() => {
        alert("Failed to load officer dashboard");
      })
      .finally(() => setLoading(false));
  }, [statusFilter, unitFilter, startDate, endDate, periodFilter]);

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "ARRIVED", label: "At Condo" },
    { value: "PICKED_UP", label: "Picked up" },
    { value: "RETURNED", label: "Returned" },
  ];

  const visiblePackages = useMemo(
    () => filteredPackages.slice(0, visibleCount),
    [filteredPackages, visibleCount]
  );

  useEffect(() => {
    // reset visible count when filters/search change
    setVisibleCount(10);
  }, [statusFilter, unitFilter, startDate, endDate, periodFilter, search]);

  return (
    <DashboardLayout
      title="Officer Dashboard"
      subtitle="Register arriving packages and manage pickups"
      sidebarTitle="OFFICER DESK"
      sidebarSubtitle="Condo Juristic Office"
      activeKey="dashboard"
      userName={displayName || "Officer"}
      userSub="Front Desk"
      navItems={[
        {
          key: "dashboard",
          label: "Dashboard",
          icon: "▦",
          onClick: () => navigate("/officer"),
        },
        {
          key: "add",
          label: "Add Package",
          icon: "＋",
          onClick: () => navigate("/officer/add"),
        },
        {
          key: "log",
          label: "Package Log",
          icon: "≡",
          onClick: () => navigate("/officer/log"),
        },
      ]}
    >
      {/* ===== Cards ===== */}
      <div className="cardsRow">
        <div className="cardBox">
          <div className="cardBoxTop">
            <div className="cardIcon">📦</div>
            <div>
              <div className="cardLabel">Packages at condo</div>
              <div className="cardValue">
                {loading ? "…" : cards?.packagesAtCondo}
              </div>
            </div>
          </div>
        </div>

        <div className="cardBox">
          <div className="cardBoxTop">
            <div className="cardIcon">✅</div>
            <div>
              <div className="cardLabel">Picked up today</div>
              <div className="cardValue">
                {loading ? "…" : cards?.pickedUpToday}
              </div>
            </div>
          </div>
        </div>

        <div className="cardBox">
          <div className="cardBoxTop">
            <div className="cardIcon">↩</div>
            <div>
              <div className="cardLabel">Returned this month</div>
              <div className="cardValue">
                {loading ? "…" : cards?.returnedThisMonth}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Table ===== */}
      <div className="tableBox">
        <div className="tableHeader">Package List</div>

        <div className="tableControls">
          <div className="filterGroup">
            <select
              className="filterControl"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              className="filterControl"
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                if (e.target.value !== "custom") {
                  setStartDate("");
                  setEndDate("");
                } else if (!endDate) {
                  setEndDate(new Date().toISOString().slice(0, 10));
                }
              }}
            >
              <option value="today">Today</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="month">This month</option>
              <option value="custom">Custom range</option>
            </select>

            {periodFilter === "custom" ? (
              <>
                <input
                  className="filterControl"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start date"
                />
                <input
                  className="filterControl"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  placeholder="End date"
                />
              </>
            ) : null}

            <select
              className="filterControl"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
            >
              <option value="">All units</option>
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="searchBox">
            <span className="searchIcon">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracking or tenant's name"
            />
          </div>
        </div>

        <div
          style={{
            maxHeight: "calc(100vh - 320px)",
            overflowY: "auto",
            borderRadius: 12,
          }}
        >
          <table className="table">
            <thead>
              <tr>
                <th>Tracking No</th>
                <th>Tenant</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Arrival Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">Loading…</td>
                </tr>
              ) : filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan="6">No packages found</td>
                </tr>
              ) : (
                visiblePackages.map((p) => (
                  <tr key={p.package_id}>
                    <td>{p.tracking_no}</td>
                    <td>{p.tenant_name}</td>
                    <td>
                      {p.building_code}
                      {p.room_no}
                    </td>
                    <td>
                      <span className="badge">{p.current_status}</span>
                    </td>
                    <td>{new Date(p.arrived_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="btnView"
                        onClick={() => navigate(`/officer/packages/${p.package_id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredPackages.length > visiblePackages.length ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <button
              className="btnSecondary"
              onClick={() => setVisibleCount((c) => c + 10)}
            >
              Show more
            </button>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Showing {visiblePackages.length} of {filteredPackages.length}
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
