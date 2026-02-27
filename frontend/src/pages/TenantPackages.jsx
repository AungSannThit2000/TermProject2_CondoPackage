import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

const STATUS_LABELS = {
    ARRIVED: "At Condo",
    PICKED_UP: "Picked Up",
    RETURNED: "Returned",
};

export default function TenantPackages() {
    const navigate = useNavigate();

    const [packages, setPackages] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [periodFilter, setPeriodFilter] = useState("last30");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [search, setSearch] = useState("");
    const [logState, setLogState] = useState({
        pkg: null,
        logs: [],
        loading: false,
        error: null,
    });

    useEffect(() => {
        // reset custom range fields when leaving custom
        if (periodFilter !== "custom") {
            setStartDate("");
            setEndDate("");
        } else if (!endDate) {
            setEndDate(new Date().toISOString().slice(0, 10));
        }
    }, [periodFilter]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (statusFilter) params.append("status", statusFilter);
        if (periodFilter) params.append("period", periodFilter);
        if (periodFilter === "custom" && startDate) {
            params.append("start_date", startDate);
            params.append("end_date", endDate || new Date().toISOString().slice(0, 10));
        }

        setLoading(true);
        api
            .get(params.toString() ? `/tenant/packages?${params.toString()}` : "/tenant/packages")
            .then((res) => {
                setPackages(res.data.packages || []);
                setProfile(res.data.profile);
            })
            .catch(() => alert("Failed to load package history"))
            .finally(() => setLoading(false));
    }, [statusFilter, periodFilter, startDate, endDate]);

    const filteredPackages = useMemo(() => {
        const q = search.trim().toLowerCase();
        return packages.filter((p) => {
            const searchOk = q
                ? (p.tracking_no || "").toLowerCase().includes(q) ||
                (p.carrier || "").toLowerCase().includes(q) ||
                (p.sender_name || "").toLowerCase().includes(q) ||
                (STATUS_LABELS[p.current_status] || p.current_status || "").toLowerCase().includes(q)
                : true;
            return searchOk;
        });
    }, [packages, search]);

    function openLogModal(pkg) {
        setLogState({ pkg, logs: [], loading: true, error: null });
        api
            .get(`/tenant/packages/${pkg.package_id}/logs`)
            .then((res) =>
                setLogState((prev) => ({
                    pkg: prev.pkg,
                    logs: res.data.logs || [],
                    loading: false,
                    error: null,
                }))
            )
            .catch(() =>
                setLogState((prev) => ({
                    pkg: prev.pkg,
                    logs: [],
                    loading: false,
                    error: "Failed to load log history",
                }))
            );
    }

    function closeLog() {
        setLogState({ pkg: null, logs: [], loading: false, error: null });
    }

    const roomLabel = profile ? `${profile.building_code || ""}${profile.room_no || ""}` : "";
    const userBadge = roomLabel && profile?.full_name ? `${roomLabel} - ${profile.full_name}` : "Resident";

    return (
        <DashboardLayout
            title="Tenant View"
            subtitle="Check your deliveries and pickup history."
            sidebarTitle="TENANT"
            sidebarSubtitle={userBadge}
            activeKey="mypackages"
            userName={profile?.full_name || "Tenant"}
            userSub={userBadge}
            navItems={[
                { key: "dashboard", label: "Dashboard", icon: "▦", onClick: () => navigate("/tenant") },
                { key: "mypackages", label: "My Packages", icon: "📦", onClick: () => navigate("/tenant/packages") },
                { key: "profile", label: "Profile", icon: "👤", onClick: () => navigate("/tenant/profile") },
            ]}
        >
            <div className="tableBox">
                <div className="tableHeader">My Package History</div>

                <div className="tableControls">
                    <div className="filterGroup">
                        <select
                            className="filterControl"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All statuses</option>
                            <option value="ARRIVED">At Condo</option>
                            <option value="PICKED_UP">Picked up</option>
                            <option value="RETURNED">Returned</option>
                        </select>

                        <select
                            className="filterControl"
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value)}
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
                                    max={new Date().toISOString().slice(0, 10)}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    placeholder="End date"
                                />
                            </>
                        ) : null}
                    </div>

                    <div className="searchBox">
                        <span className="searchIcon">🔍</span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tracking, carrier, sender, or status"
                        />
                    </div>
                </div>

                <table className="table">
                    <thead>
                        <tr>
                            <th>Tracking No.</th>
                            <th>Carrier</th>
                            <th>Sender</th>
                            <th>Status</th>
                            <th>Arrived</th>
                            <th>Picked up / Returned</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7">Loading…</td>
                            </tr>
                        ) : filteredPackages.length === 0 ? (
                            <tr>
                                <td colSpan="7">No packages found</td>
                            </tr>
                        ) : (
                            filteredPackages.map((p) => (
                                <tr key={p.package_id}>
                                    <td>{p.tracking_no || "—"}</td>
                                    <td>{p.carrier || "—"}</td>
                                    <td>{p.sender_name || "—"}</td>
                                    <td>
                                        <span className="badge">{STATUS_LABELS[p.current_status] || p.current_status}</span>
                                    </td>
                                    <td>{p.arrived_at ? new Date(p.arrived_at).toLocaleString() : "-"}</td>
                                    <td>{p.picked_up_at ? new Date(p.picked_up_at).toLocaleString() : "-"}</td>
                                    <td>
                                        <button className="btnSecondary" onClick={() => openLogModal(p)}>
                                            View log
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {logState.pkg ? (
                <div className="tableBox" style={{ marginTop: 16 }}>
                    <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            Package Log — {logState.pkg.tracking_no || "No tracking"}{" "}
                            <span style={{ color: "#6b7280", fontWeight: 500 }}>
                                ({logState.pkg.carrier || "Carrier N/A"})
                            </span>
                        </div>
                        <button className="btnSecondary" onClick={closeLog}>
                            Close
                        </button>
                    </div>

                    <div style={{ maxHeight: "45vh", overflowY: "auto" }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Note</th>
                                    <th>Updated By</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logState.loading ? (
                                    <tr>
                                        <td colSpan="4">Loading…</td>
                                    </tr>
                                ) : logState.error ? (
                                    <tr>
                                        <td colSpan="4">{logState.error}</td>
                                    </tr>
                                ) : logState.logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="4">No log entries yet</td>
                                    </tr>
                                ) : (
                                    logState.logs.map((log, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <span className="badge">{STATUS_LABELS[log.status] || log.status}</span>
                                            </td>
                                            <td>{log.note || "—"}</td>
                                            <td>{log.updated_by || "Staff"}</td>
                                            <td>{log.status_time ? new Date(log.status_time).toLocaleString() : "-"}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
        </DashboardLayout>
    );
}
