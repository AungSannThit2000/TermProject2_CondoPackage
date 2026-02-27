import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

export default function AdminPackageDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [pkg, setPkg] = useState(null);
    const [latestNote, setLatestNote] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api
            .get(`/admin/packages/${id}`)
            .then((res) => {
                setPkg(res.data.package);
                setLatestNote(res.data.latestNote || "");
            })
            .catch(() => alert("Failed to load package"))
            .finally(() => setLoading(false));
    }, [id]);

    function fmt(dt) {
        if (!dt) return "-";
        const d = new Date(dt);
        return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
    }

    return (
        <DashboardLayout
            title="Package Detail"
            subtitle="Admin view"
            sidebarTitle="ADMIN PANEL"
            sidebarSubtitle="Building Management"
            activeKey="packages"
            userName="Administrator"
            userSub="Admin"
            navItems={[
                { key: "dashboard", label: "Dashboard", icon: "▦", onClick: () => navigate("/admin") },
                { key: "packages", label: "Packages", icon: "📦", onClick: () => navigate("/admin/packages") },
                { key: "officers", label: "Officers", icon: "👥", onClick: () => navigate("/admin/officers") },
                { key: "buildings", label: "Buildings", icon: "🏬", onClick: () => navigate("/admin/buildings") },
                { key: "rooms", label: "Rooms / Units", icon: "🏢", onClick: () => navigate("/admin/rooms") },
                { key: "tenants", label: "Tenants", icon: "🧑", onClick: () => navigate("/admin/tenants") },
                { key: "log", label: "Package Log", icon: "📝", onClick: () => navigate("/admin/log") },
            ]}
        >
            {!pkg ? (
                <div className="tableBox" style={{ maxWidth: 980, margin: "0 auto" }}>
                    <div className="tableHeader">Package Detail</div>
                    <div style={{ padding: 18 }}>{loading ? "Loading…" : "Not found"}</div>
                </div>
            ) : (
                <div className="tableBox" style={{ maxWidth: 980, margin: "0 auto" }}>
                    <div className="tableHeader">Package Detail</div>

                    <div style={{ padding: 18 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            <ReadField label="Tracking Number" value={pkg.tracking_no || "-"} />
                            <ReadField label="Courier" value={pkg.carrier || "-"} />
                            <ReadField label="Tenant Name" value={pkg.tenant_name || "-"} />
                            <ReadField label="Unit / Room" value={`${pkg.building_code || ""}${pkg.room_no || ""}`} />
                            <ReadField label="Status" value={pkg.current_status} badge />
                            <ReadField label="Arrival Time" value={fmt(pkg.arrived_at)} />
                            <ReadField label="Pickup / Return Time" value={pkg.picked_up_at ? fmt(pkg.picked_up_at) : "Not picked up yet"} />
                            <ReadField label="Handled By (Officer)" value={pkg.handled_by_staff || "-"} />
                        </div>

                        <div style={{ marginTop: 14 }}>
                            <label className="label">Latest Note</label>
                            <div className="input" style={{ background: "#f9fafb" }}>{latestNote || "—"}</div>
                        </div>

                        <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
                            <button className="btnSecondary" onClick={() => navigate("/admin/packages")}>
                                ← Back to packages
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

function ReadField({ label, value, badge }) {
    return (
        <div>
            <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>{label}</label>
            {badge ? (
                <span className="badge">{value}</span>
            ) : (
                <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                    {value}
                </div>
            )}
        </div>
    );
}
