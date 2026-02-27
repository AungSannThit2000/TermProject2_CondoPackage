import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

const STATUS_OPTIONS = [
    { value: "", label: "All statuses" },
    { value: "ARRIVED", label: "At Condo" },
    { value: "PICKED_UP", label: "Picked Up" },
    { value: "RETURNED", label: "Returned" },
];

export default function AdminPackages() {
    const navigate = useNavigate();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [periodFilter, setPeriodFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const navItems = [
        { key: "dashboard", label: "Dashboard", icon: "▦", onClick: () => navigate("/admin") },
        { key: "packages", label: "Packages", icon: "📦", onClick: () => navigate("/admin/packages") },
        { key: "officers", label: "Officers", icon: "👥", onClick: () => navigate("/admin/officers") },
        { key: "rooms", label: "Rooms / Units", icon: "🏢", onClick: () => navigate("/admin/rooms") },
        { key: "tenants", label: "Tenants", icon: "🧑", onClick: () => navigate("/admin/tenants") },
        { key: "log", label: "Package Log", icon: "📝", onClick: () => navigate("/admin/log") },
    ];

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, periodFilter, startDate, endDate]);

    function loadData() {
        setLoading(true);
        const qs = new URLSearchParams();
        if (statusFilter) qs.append("status", statusFilter);
        if (periodFilter) qs.append("period", periodFilter);
        if (periodFilter === "custom" && startDate) {
            qs.append("start_date", startDate);
            qs.append("end_date", endDate || new Date().toISOString().slice(0, 10));
        }
        const pkgUrl = qs.toString() ? `/admin/packages?${qs.toString()}` : "/admin/packages";
        api
            .get(pkgUrl)
            .then((pkgRes) => {
                setPackages(pkgRes.data.packages || []);
            })
            .catch(() => alert("Failed to load packages"))
            .finally(() => setLoading(false));
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return packages.filter((p) => {
            const statusOk = statusFilter ? p.current_status === statusFilter : true;
            const searchOk = q
                ? (p.tracking_no || "").toLowerCase().includes(q) ||
                (p.tenant_name || "").toLowerCase().includes(q) ||
                (`${p.building_code || ""}${p.room_no || ""}`).toLowerCase().includes(q)
                : true;
            return statusOk && searchOk;
        });
    }, [packages, statusFilter, search]);

    async function handleDelete(pkgId) {
        if (!window.confirm("Delete this package?")) return;
        try {
            await api.delete(`/admin/packages/${pkgId}`);
            setPackages((prev) => prev.filter((p) => p.package_id !== pkgId));
        } catch {
            alert("Failed to delete package");
        }
    }

    return (
        <DashboardLayout
            title="Packages"
            subtitle="Manage packages and statuses"
            sidebarTitle="ADMIN PANEL"
            sidebarSubtitle="Building Management"
            activeKey="packages"
            userName="Administrator"
            userSub="Admin"
            navItems={navItems}
        >
            <div className="tableBox">
                <div className="tableHeader">Packages</div>
                <div className="tableControls">
                    <div className="filterGroup">
                        <select className="filterControl" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            {STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
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
                                    setEndDate(new Date().toISOString().slice(0, 10));
                                } else if (!endDate) {
                                    setEndDate(new Date().toISOString().slice(0, 10));
                                }
                            }}
                        >
                            <option value="">All time</option>
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
                                />
                                <input
                                    className="filterControl"
                                    type="date"
                                    value={endDate}
                                    max={new Date().toISOString().slice(0, 10)}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </>
                        ) : null}
                    </div>
                    <div className="searchBox">
                        <span className="searchIcon">🔍</span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tracking, tenant or unit"
                        />
                    </div>
                </div>

                <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Tracking</th>
                                <th>Tenant</th>
                                <th>Unit</th>
                                <th>Status</th>
                                <th>Arrived</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6">Loading…</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6">No packages found</td>
                                </tr>
                            ) : (
                                filtered.map((p) => (
                                    <tr key={p.package_id}>
                                        <td>{p.tracking_no || "—"}</td>
                                        <td>{p.tenant_name}</td>
                                        <td>
                                            {p.building_code}
                                            {p.room_no}
                                        </td>
                                        <td>
                                            <span className="badge">{p.current_status}</span>
                                        </td>
                                        <td>{p.arrived_at ? new Date(p.arrived_at).toLocaleString() : "-"}</td>
                                        <td style={{ display: "flex", gap: 8 }}>
                                            <button className="btnSecondary" onClick={() => navigate(`/admin/packages/${p.package_id}`)}>View</button>
                                            <button
                                                className="btnSecondary"
                                                style={{ background: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }}
                                                onClick={() => handleDelete(p.package_id)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
