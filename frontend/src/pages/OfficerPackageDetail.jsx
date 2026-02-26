import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useOfficerDisplayName } from "../hooks/useOfficerDisplayName.js";

export default function OfficerPackageDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const displayName = useOfficerDisplayName();

    const [pkg, setPkg] = useState(null);
    const [status, setStatus] = useState("ARRIVED");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    const statusLabel = useMemo(() => {
        return {
            ARRIVED: "At Condo",
            PICKED_UP: "Picked Up",
            RETURNED: "Returned",
        };
    }, []);

    function fmt(dt) {
        if (!dt) return "-";
        const d = new Date(dt);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString();
    }

    useEffect(() => {
        api
            .get(`/officer/packages/${id}`)
            .then((res) => {
                setPkg(res.data.package);
                setStatus(res.data.package.current_status);
                setNote(res.data.latestNote || "");
            })
            .catch((err) => {
                console.error(err);
                alert("Failed to load package detail");
            });
    }, [id]);

    async function handleUpdate() {
        try {
            setSaving(true);
            await api.patch(`/officer/packages/${id}`, { status, note });
            alert("Updated!");
            navigate("/officer");
        } catch (e) {
            alert("Update failed");
        } finally {
            setSaving(false);
        }
    }

    return (
        <DashboardLayout
            title="Officer View"
            subtitle="Register new packages and manage pickups"
            sidebarTitle="OFFICER DESK"
            sidebarSubtitle="Lobby Counter"
            activeKey="log"
            userName={displayName || "Officer"}
            userSub="Front Desk"
            navItems={[
                { key: "dashboard", label: "Dashboard", icon: "▦", onClick: () => navigate("/officer") },
                { key: "add", label: "Add Package", icon: "＋", onClick: () => navigate("/officer/add") },
                { key: "log", label: "Package Log", icon: "≡", onClick: () => navigate("/officer/log") },
            ]}
        >
            {!pkg ? (
                <div className="tableBox" style={{ maxWidth: 980, margin: "0 auto" }}>
                    <div className="tableHeader">Package Detail</div>
                    <div style={{ padding: 18 }}>Loading…</div>
                </div>
            ) : (
                <div className="tableBox" style={{ maxWidth: 980, margin: "0 auto" }}>
                    <div className="tableHeader">Package Detail</div>

                    <div style={{ padding: 18 }}>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 14,
                            }}
                        >
                            <div>
                                <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                    Tracking Number
                                </label>
                                <input
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                                    value={pkg.tracking_no || ""}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                    Courier
                                </label>
                                <input
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                                    value={pkg.carrier || ""}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                    Tenant Name
                                </label>
                                <input
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                                    value={pkg.tenant_name || ""}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                    Unit / Room
                                </label>
                                <input
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                                    value={pkg.unit_room || ""}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                    Status
                                </label>
                                <select
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="ARRIVED">{statusLabel.ARRIVED}</option>
                                    <option value="PICKED_UP">{statusLabel.PICKED_UP}</option>
                                    <option value="RETURNED">{statusLabel.RETURNED}</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                    Arrival Time
                                </label>
                                <input
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                                    value={fmt(pkg.arrived_at)}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                    Pickup / Return Time
                                </label>
                                <input
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                                    value={pkg.picked_up_at ? fmt(pkg.picked_up_at) : "Not picked up yet"}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                    Handled By (Officer)
                                </label>
                                <input
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
                                    value={pkg.handled_by_staff || ""}
                                    readOnly
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: 14 }}>
                            <label style={{ display: "block", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                                Officer Note
                            </label>
                            <textarea
                                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}
                                rows={4}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Add any special notes, eg - fragile, food, etc."
                            />
                        </div>

                        <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
                            <button
                                className="btnPrimary"
                                disabled={saving}
                                onClick={handleUpdate}
                            >
                                {saving ? "Updating..." : "Update"}
                            </button>
                            <button className="btnSecondary" onClick={() => navigate("/officer")}>
                                ← Back to list
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
