import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

export default function AdminTenants() {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [form, setForm] = useState({ username: "", password: "", full_name: "", phone: "", email: "", building_id: "", room_no: "" });
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [editPassword, setEditPassword] = useState("");

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
    }, []);

    function loadData() {
        setLoading(true);
        Promise.all([api.get("/admin/tenants"), api.get("/admin/rooms")])
            .then(([tRes, rRes]) => {
                setTenants(tRes.data.tenants || []);
                setRooms(rRes.data.rooms || []);
            })
            .catch(() => alert("Failed to load tenants"))
            .finally(() => setLoading(false));
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return tenants;
        return tenants.filter((t) => {
            return (
                (t.full_name || "").toLowerCase().includes(q) ||
                (t.username || "").toLowerCase().includes(q) ||
                (`${t.building_code || ""}${t.room_no || ""}`).toLowerCase().includes(q)
            );
        });
    }, [tenants, search]);

    async function handleCreate(e) {
        e.preventDefault();
        if (!form.username || !form.password || !form.full_name || !form.building_id || !form.room_no) {
            alert("Username, password, name and room are required");
            return;
        }
        try {
            await api.post("/admin/tenants", {
                username: form.username,
                password: form.password,
                full_name: form.full_name,
                phone: form.phone || null,
                email: form.email || null,
                building_id: Number(form.building_id),
                room_no: form.room_no,
            });
            setForm({ username: "", password: "", full_name: "", phone: "", email: "", building_id: "", room_no: "" });
            setShowCreate(false);
            loadData();
            alert("Tenant created");
        } catch (err) {
            const message = err.response?.data?.message || "Failed to create tenant";
            alert(message);
        }
    }

    async function toggleStatus(tenantId, currentStatus) {
        const next = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        try {
            await api.put(`/admin/tenants/${tenantId}`, { status: next });
            loadData();
        } catch {
            alert("Failed to update status");
        }
    }

    async function handleEditSave(e) {
        e.preventDefault();
        if (!editTarget) return;
        try {
            const body = {
                full_name: editTarget.full_name,
                phone: editTarget.phone,
                email: editTarget.email,
                building_id: editTarget.building_id ? Number(editTarget.building_id) : undefined,
                room_no: editTarget.room_no,
                status: editTarget.status,
            };
            if (editPassword.trim()) {
                body.password = editPassword.trim();
            }
            await api.put(`/admin/tenants/${editTarget.tenant_id}`, body);
            setEditTarget(null);
            setEditPassword("");
            loadData();
            alert("Tenant updated");
        } catch {
            alert("Failed to update tenant");
        }
    }

    async function handleDelete(tenantId) {
        if (!window.confirm("Delete this tenant?")) return;
        try {
            await api.delete(`/admin/tenants/${tenantId}`);
            setTenants((prev) => prev.filter((t) => t.tenant_id !== tenantId));
        } catch {
            alert("Failed to delete tenant");
        }
    }

    return (
        <DashboardLayout
            title="Tenants"
            subtitle="Manage tenant accounts"
            sidebarTitle="ADMIN PANEL"
            sidebarSubtitle="Building Management"
            activeKey="tenants"
            userName="Administrator"
            userSub="Admin"
            navItems={navItems}
        >
            <div className="tableBox">
                <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Tenants</span>
                    <button className="btnPrimary" onClick={() => setShowCreate(true)} style={{ padding: "10px 14px" }}>
                        + Add Tenant
                    </button>
                </div>
                <div className="tableControls">
                    <div className="searchBox" style={{ width: "100%" }}>
                        <span className="searchIcon">🔍</span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tenant name, username or unit"
                        />
                    </div>
                </div>
                <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Unit</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7">Loading…</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="7">No tenants</td></tr>
                            ) : (
                                filtered.map((t) => (
                                    <tr key={t.tenant_id}>
                                        <td>{t.full_name}</td>
                                        <td>{t.username}</td>
                                        <td>
                                            {t.building_code}
                                            {t.room_no}
                                        </td>
                                        <td>{t.phone || "-"}</td>
                                        <td>{t.email || "-"}</td>
                                        <td><span className="badge">{t.status}</span></td>
                                        <td style={{ display: "flex", gap: 8 }}>
                                            <button className="btnSecondary" onClick={() => { setEditTarget(t); setEditPassword(""); }}>Edit</button>
                                            <button
                                                className="btnSecondary"
                                                style={{ background: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }}
                                                onClick={() => handleDelete(t.tenant_id)}
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

            {showCreate && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 50,
                    }}
                    onClick={() => setShowCreate(false)}
                >
                    <div
                        className="tableBox"
                        style={{
                            maxWidth: 860,
                            width: "92%",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                            background: "#f8fafc",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Add Tenant</span>
                            <button className="btnSecondary" onClick={() => setShowCreate(false)}>Close</button>
                        </div>
                        <form
                            onSubmit={handleCreate}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 16,
                                padding: 18,
                                background: "#fff",
                                borderRadius: 16,
                                border: "1px solid #e5e7eb",
                                margin: "0 12px 16px",
                            }}
                        >
                            <div>
                                <label className="label">Username</label>
                                <input
                                    placeholder="Username"
                                    value={form.username}
                                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                />
                            </div>
                            <div>
                                <label className="label">Password</label>
                                <input
                                    placeholder="Password"
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                />
                            </div>
                            <div>
                                <label className="label">Full Name</label>
                                <input
                                    placeholder="Full name"
                                    value={form.full_name}
                                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                />
                            </div>
                            <div>
                                <label className="label">Phone</label>
                                <input
                                    placeholder="Phone"
                                    value={form.phone}
                                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                />
                            </div>
                            <div>
                                <label className="label">Email</label>
                                <input
                                    placeholder="Email"
                                    value={form.email}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                />
                            </div>
                            <div>
                                <label className="label">Room</label>
                                <select
                                    value={form.building_id && form.room_no ? `${form.building_id}:${form.room_no}` : ""}
                                    onChange={(e) => {
                                        const [bId, rNo] = e.target.value.split(":");
                                        setForm((f) => ({ ...f, building_id: bId, room_no: rNo }));
                                    }}
                                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                >
                                    <option value="">Select room</option>
                                    {rooms.map((r) => (
                                        <option key={`${r.building_id}:${r.room_no}`} value={`${r.building_id}:${r.room_no}`}>
                                            {r.building_code}
                                            {r.room_no}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                                <button className="btnPrimary" type="submit">Create</button>
                                <button className="btnSecondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editTarget && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 50,
                    }}
                    onClick={() => setEditTarget(null)}
                >
                    <div
                        className="tableBox"
                        style={{
                            maxWidth: 860,
                            width: "92%",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                            background: "#f8fafc",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Edit Tenant</span>
                            <button className="btnSecondary" onClick={() => setEditTarget(null)}>Close</button>
                        </div>
                        <form
                            onSubmit={handleEditSave}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 16,
                                padding: 18,
                                background: "#fff",
                                borderRadius: 16,
                                border: "1px solid #e5e7eb",
                                margin: "0 12px 16px",
                            }}
                        >
                            <div>
                                <label className="label">Full Name</label>
                                <input
                                    value={editTarget.full_name || ""}
                                    onChange={(e) => setEditTarget((t) => ({ ...t, full_name: e.target.value }))}
                                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                />
                            </div>
                            <div>
                                <label className="label">Phone</label>
                                <input
                                    value={editTarget.phone || ""}
                                    onChange={(e) => setEditTarget((t) => ({ ...t, phone: e.target.value }))}
                                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                />
                            </div>
                            <div>
                                <label className="label">Email</label>
                                <input
                                    value={editTarget.email || ""}
                                    onChange={(e) => setEditTarget((t) => ({ ...t, email: e.target.value }))}
                                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                />
                            </div>
                            <div>
                                <label className="label">New Password (optional)</label>
                                <input
                                    type="password"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    placeholder="Leave blank to keep current password"
                                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                />
                            </div>
                            <div>
                                <label className="label">Room</label>
                                <select
                                    value={
                                        editTarget.building_id && editTarget.room_no
                                            ? `${editTarget.building_id}:${editTarget.room_no}`
                                            : ""
                                    }
                                    onChange={(e) => {
                                        const [bId, rNo] = e.target.value.split(":");
                                        setEditTarget((t) => ({ ...t, building_id: bId, room_no: rNo }));
                                    }}
                                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                >
                                    {rooms.map((r) => (
                                        <option key={`${r.building_id}:${r.room_no}`} value={`${r.building_id}:${r.room_no}`}>
                                            {r.building_code}
                                            {r.room_no}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Status</label>
                                <select
                                    value={editTarget.status}
                                    onChange={(e) => setEditTarget((t) => ({ ...t, status: e.target.value }))}
                                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </div>
                            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                                <button className="btnPrimary" type="submit">Save</button>
                                <button className="btnSecondary" type="button" onClick={() => setEditTarget(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
