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

export default function AdminPackageLog() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const navItems = [
        { key: "dashboard", label: "Dashboard", icon: "▦", onClick: () => navigate("/admin") },
        { key: "packages", label: "Packages", icon: "📦", onClick: () => navigate("/admin/packages") },
        { key: "officers", label: "Officers", icon: "👥", onClick: () => navigate("/admin/officers") },
        { key: "buildings", label: "Buildings", icon: "🏬", onClick: () => navigate("/admin/buildings") },
        { key: "rooms", label: "Rooms / Units", icon: "🏢", onClick: () => navigate("/admin/rooms") },
        { key: "tenants", label: "Tenants", icon: "🧑", onClick: () => navigate("/admin/tenants") },
        { key: "log", label: "Package Log", icon: "📝", onClick: () => navigate("/admin/log") },
    ];

    useEffect(() => {
        loadData();
    }, [statusFilter]);

    function loadData() {
        setLoading(true);
        const params = statusFilter ? `?status=${statusFilter}` : "";
        api
            .get(`/admin/package-log${params}`)
            .then((res) => setLogs(res.data.logs || []))
            .catch(() => alert("Failed to load package log"))
            .finally(() => setLoading(false));
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return logs;
        return logs.filter((log) => {
            return (
                (log.tracking_no || "").toLowerCase().includes(q) ||
                (log.tenant_name || "").toLowerCase().includes(q) ||
                (`${log.building_code || ""}${log.room_no || ""}`).toLowerCase().includes(q) ||
                (log.updated_by || "").toLowerCase().includes(q) ||
                (log.note || "").toLowerCase().includes(q)
            );
        });
    }, [logs, search]);

    return (
        <DashboardLayout
            title="Package Log"
            subtitle="Full audit of package status changes"
            sidebarTitle="ADMIN PANEL"
            sidebarSubtitle="Building Management"
            activeKey="log"
            userName="Administrator"
            userSub="Admin"
            navItems={navItems}
        >
            <div className="tableBox">
                <div className="tableHeader">Activity Log</div>
                <div className="tableControls">
                    <div className="filterGroup">
                        <select className="filterControl" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            {STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="searchBox" style={{ width: "100%" }}>
                        <span className="searchIcon">🔍</span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tracking, tenant, unit, note or officer"
                        />
                    </div>
                </div>

                <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>When</th>
                                <th>Status</th>
                                <th>Tracking</th>
                                <th>Tenant / Unit</th>
                                <th>Updated By</th>
                                <th>Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6">Loading…</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="6">No log entries</td></tr>
                            ) : (
                                filtered.map((log) => (
                                    <tr key={`${log.package_id}-${log.status_time}`}>
                                        <td>{new Date(log.status_time).toLocaleString()}</td>
                                        <td><span className="badge">{log.status}</span></td>
                                        <td>{log.tracking_no || "—"}</td>
                                        <td>
                                            <div>{log.tenant_name}</div>
                                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                                                {log.building_code}
                                                {log.room_no}
                                            </div>
                                        </td>
                                        <td>{log.updated_by || "Unknown"}</td>
                                        <td style={{ maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={log.note || ""}>
                                            {log.note || "—"}
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
