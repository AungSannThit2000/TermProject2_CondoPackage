import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

export default function TenantProfile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ phone: "", email: "" });
    const [message, setMessage] = useState(null);

    useEffect(() => {
        api
            .get("/tenant/profile")
            .then((res) => {
                setProfile(res.data.profile);
                setForm({
                    phone: res.data.profile?.phone || "",
                    email: res.data.profile?.email || "",
                });
            })
            .catch(() => alert("Failed to load profile"))
            .finally(() => setLoading(false));
    }, []);

    const roomLabel = profile ? `${profile.building_code || ""}${profile.room_no || ""}` : "";
    const userBadge = roomLabel && profile?.full_name ? `${roomLabel} - ${profile.full_name}` : "Resident";

    function onChange(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSave(e) {
        e.preventDefault();
        setMessage(null);
        setSaving(true);
        try {
            const res = await api.put("/tenant/profile", {
                phone: form.phone.trim(),
                email: form.email.trim(),
            });
            setProfile(res.data.profile);
            setMessage({ type: "success", text: "Profile updated" });
        } catch (err) {
            const text = err.response?.data?.message || "Failed to update profile";
            setMessage({ type: "error", text });
        } finally {
            setSaving(false);
        }
    }

    return (
        <DashboardLayout
            title="Profile"
            subtitle="Your condo contact details"
            sidebarTitle="TENANT"
            sidebarSubtitle={userBadge}
            activeKey="profile"
            userName={profile?.full_name || "Tenant"}
            userSub={userBadge}
            navItems={[
                { key: "dashboard", label: "Dashboard", icon: "▦", onClick: () => navigate("/tenant") },
                { key: "mypackages", label: "My Packages", icon: "📦", onClick: () => navigate("/tenant/packages") },
                { key: "profile", label: "Profile", icon: "👤", onClick: () => navigate("/tenant/profile") },
            ]}
        >
            <div className="tableBox" style={{ maxWidth: 720, margin: "0 auto" }}>
                <div className="tableHeader">Profile</div>
                {loading ? (
                    <div style={{ padding: 18 }}>Loading…</div>
                ) : !profile ? (
                    <div style={{ padding: 18 }}>Profile not found</div>
                ) : (
                    <form style={{ padding: 18 }} onSubmit={handleSave}>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 18,
                                marginBottom: 20,
                            }}
                        >
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                    <span role="img" aria-label="person">👤</span>
                                    <span style={{ fontWeight: 600, color: "#374151" }}>Tenant Name</span>
                                </div>
                                <div
                                    style={{
                                        background: "#f8fafc",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 16,
                                        padding: "14px 16px",
                                        color: "#111827",
                                    }}
                                >
                                    {profile.full_name || "-"}
                                </div>
                            </div>

                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                    <span role="img" aria-label="home">🏠</span>
                                    <span style={{ fontWeight: 600, color: "#374151" }}>Unit / Room</span>
                                </div>
                                <div
                                    style={{
                                        background: "#f8fafc",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 16,
                                        padding: "14px 16px",
                                        color: "#111827",
                                    }}
                                >
                                    {profile.building_code}
                                    {profile.room_no}
                                </div>
                            </div>

                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                    <span role="img" aria-label="phone">📞</span>
                                    <span style={{ fontWeight: 600, color: "#374151" }}>Phone</span>
                                </div>
                                <input
                                    style={{
                                        width: "100%",
                                        background: "#fff",
                                        border: "1px solid #d1d5db",
                                        borderRadius: 12,
                                        padding: "12px 14px",
                                        color: "#111827",
                                        fontSize: 15,
                                    }}
                                    value={form.phone}
                                    onChange={(e) => onChange("phone", e.target.value)}
                                    placeholder="Enter phone"
                                />
                            </div>

                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                    <span role="img" aria-label="email">✉️</span>
                                    <span style={{ fontWeight: 600, color: "#374151" }}>Email</span>
                                </div>
                                <input
                                    style={{
                                        width: "100%",
                                        background: "#fff",
                                        border: "1px solid #d1d5db",
                                        borderRadius: 12,
                                        padding: "12px 14px",
                                        color: "#111827",
                                        fontSize: 15,
                                    }}
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => onChange("email", e.target.value)}
                                    placeholder="Enter email"
                                />
                            </div>
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                gap: 12,
                            }}
                        >
                            <div
                                style={{
                                    background: "#f8fafc",
                                    borderRadius: 16,
                                    padding: 14,
                                    border: "1px solid #e5e7eb",
                                }}
                            >
                                <div style={{ fontWeight: 600, color: "#6b21a8", display: "flex", alignItems: "center", gap: 8 }}>
                                    🏢 <span>Building</span>
                                </div>
                                <div style={{ marginTop: 6, color: "#111827" }}>
                                    {profile.building_code || "-"}
                                </div>
                            </div>
                            <div
                                style={{
                                    background: "#f8fafc",
                                    borderRadius: 16,
                                    padding: 14,
                                    border: "1px solid #e5e7eb",
                                }}
                            >
                                <div style={{ fontWeight: 600, color: "#2563eb", display: "flex", alignItems: "center", gap: 8 }}>
                                    🧑 <span>Floor</span>
                                </div>
                                <div style={{ marginTop: 6, color: "#111827" }}>
                                    {profile.floor === null || profile.floor === undefined ? "-" : `Floor (${profile.floor})`}
                                </div>
                            </div>
                            <div
                                style={{
                                    background: "#f8fafc",
                                    borderRadius: 16,
                                    padding: 14,
                                    border: "1px solid #e5e7eb",
                                }}
                            >
                                <div style={{ fontWeight: 600, color: "#16a34a", display: "flex", alignItems: "center", gap: 8 }}>
                                    ☎️ <span>Status</span>
                                </div>
                                <div style={{ marginTop: 6, color: "#111827" }}>
                                    Active
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, gap: 12 }}>
                            {message ? (
                                <div
                                    style={{
                                        alignSelf: "center",
                                        color: message.type === "success" ? "#166534" : "#b91c1c",
                                        fontWeight: 600,
                                    }}
                                >
                                    {message.text}
                                </div>
                            ) : null}
                            <button
                                type="submit"
                                className="btnPrimary"
                                disabled={saving}
                                style={{ minWidth: 120 }}
                            >
                                {saving ? "Saving…" : "Save changes"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </DashboardLayout>
    );
}
