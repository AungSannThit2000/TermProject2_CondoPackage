import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useOfficerDisplayName } from "../hooks/useOfficerDisplayName.js";

export default function OfficerPackageLog() {
    const navigate = useNavigate();
    const displayName = useOfficerDisplayName();

    const [logs, setLogs] = useState([]);
    const [unitOptions, setUnitOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [unitFilter, setUnitFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [visibleCount, setVisibleCount] = useState(20);

    const filteredLogs = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return logs;
        return logs.filter((log) => {
            const tracking = (log.tracking_no || "").toLowerCase();
            const tenant = (log.tenant_name || "").toLowerCase();
            const note = (log.note || "").toLowerCase();
            const unit = `${log.building_code || ""}${log.room_no || ""}`.toLowerCase();
            return (
                tracking.includes(q) ||
                tenant.includes(q) ||
                note.includes(q) ||
                unit.includes(q)
            );
        });
    }, [logs, search]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (statusFilter) params.append("status", statusFilter);
        if (unitFilter) params.append("unit", unitFilter);
        if (dateFilter) params.append("date", dateFilter);

        const query = params.toString();
        const logUrl = query ? `/officer/package-log?${query}` : "/officer/package-log";

        setLoading(true);
        Promise.all([api.get(logUrl), api.get("/officer/dashboard")])
            .then(([logRes, dashRes]) => {
                setLogs(logRes.data.logs || []);
                setUnitOptions(dashRes.data.unitOptions || []);
                setVisibleCount(20);
            })
            .catch(() => {
                alert("Failed to load package log");
            })
            .finally(() => setLoading(false));
    }, [statusFilter, unitFilter, dateFilter]);

    const statusOptions = [
        { value: "", label: "All statuses" },
        { value: "ARRIVED", label: "At Condo" },
        { value: "PICKED_UP", label: "Picked up" },
        { value: "RETURNED", label: "Returned" },
    ];

    const visibleLogs = useMemo(
        () => filteredLogs.slice(0, visibleCount),
        [filteredLogs, visibleCount]
    );

    useEffect(() => {
        setVisibleCount(20);
    }, [statusFilter, unitFilter, dateFilter, search]);

    return (
        <DashboardLayout
            title="Package Log"
            subtitle="View every package update across the condo"
            sidebarTitle="OFFICER DESK"
            sidebarSubtitle="Condo Juristic Office"
            activeKey="log"
            userName={displayName || "Officer"}
            userSub="Front Desk"
            navItems={[
                { key: "dashboard", label: "Dashboard", icon: "▦", onClick: () => navigate("/officer") },
                { key: "add", label: "Add Package", icon: "＋", onClick: () => navigate("/officer/add") },
                { key: "log", label: "Package Log", icon: "≡", onClick: () => navigate("/officer/log") },
            ]}
        >
            <div className="tableBox">
                <div className="tableHeader">Package Activity Log</div>

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

                        <input
                            className="filterControl"
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />

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
                            placeholder="Search tracking, tenant, unit or note"
                        />
                    </div>
                </div>

                <div
                    style={{
                        maxHeight: "calc(100vh - 240px)",
                        overflowY: "auto",
                        borderRadius: 12,
                    }}
                >
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
                                <tr>
                                    <td colSpan="6">Loading…</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6">No activity found</td>
                                </tr>
                            ) : (
                                visibleLogs.map((log) => (
                                    <tr key={`${log.package_id}-${log.status_time}`}>
                                        <td>{new Date(log.status_time).toLocaleString()}</td>
                                        <td>
                                            <span className="badge">{log.status}</span>
                                        </td>
                                        <td>{log.tracking_no || "—"}</td>
                                        <td>
                                            <div>{log.tenant_name}</div>
                                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                                                {log.building_code}
                                                {log.room_no}
                                            </div>
                                        </td>
                                        <td>{log.updated_by || "Unknown"}</td>
                                        <td>
                                            <div
                                                style={{
                                                    maxWidth: 260,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                                title={log.note || ""}
                                            >
                                                {log.note || "—"}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filteredLogs.length > visibleLogs.length ? (
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
                            onClick={() => setVisibleCount((c) => c + 20)}
                        >
                            Show more
                        </button>
                        <div style={{ fontSize: 13, color: "#6b7280" }}>
                            Showing {visibleLogs.length} of {filteredLogs.length}
                        </div>
                    </div>
                ) : null}
            </div>
        </DashboardLayout>
    );
}
