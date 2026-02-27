import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

export default function AdminOfficers() {
    const navigate = useNavigate();
    const [officers, setOfficers] = useState([]);
    const [form, setForm] = useState({ username: "", password: "", full_name: "", phone: "", email: "" });
    const [loading, setLoading] = useState(true);
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
        api
            .get("/admin/officers")
            .then((res) => setOfficers(res.data.officers || []))
            .catch(() => alert("Failed to load officers"))
            .finally(() => setLoading(false));
    }

    async function handleCreate(e) {
        e.preventDefault();
        try {
            await api.post("/admin/officers", form);
            setForm({ username: "", password: "", full_name: "", phone: "", email: "" });
            setShowCreate(false);
            loadData();
            alert("Officer created");
        } catch (err) {
            const message = err.response?.data?.message || "Failed to create officer";
            alert(message);
        }
    }

    async function toggleStatus(staffId, currentStatus) {
        const next = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        try {
            await api.put(`/admin/officers/${staffId}`, { status: next });
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
                status: editTarget.status,
            };
            if (editPassword.trim()) {
                body.password = editPassword.trim();
            }
            await api.put(`/admin/officers/${editTarget.staff_id}`, body);
            setEditTarget(null);
            setEditPassword("");
            loadData();
            alert("Officer updated");
        } catch {
            alert("Failed to update officer");
        }
    }

    async function handleDelete(staffId) {
        if (!window.confirm("Delete this officer?")) return;
        try {
            await api.delete(`/admin/officers/${staffId}`);
            setOfficers((prev) => prev.filter((o) => o.staff_id !== staffId));
        } catch {
            alert("Failed to delete officer");
        }
    }

    return (
        <DashboardLayout
            title="Officers"
            subtitle="Manage officer accounts"
            sidebarTitle="ADMIN PANEL"
            sidebarSubtitle="Building Management"
            activeKey="officers"
            userName="Administrator"
            userSub="Admin"
            navItems={navItems}
        >
            <div className="tableBox">
                <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Officers</span>
                    <button className="btnPrimary" onClick={() => setShowCreate(true)} style={{ padding: "10px 14px" }}>
                        + Add Officer
                    </button>
                </div>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6">Loading…</td></tr>
                        ) : officers.length === 0 ? (
                            <tr><td colSpan="6">No officers</td></tr>
                        ) : (
                            officers.map((o) => (
                                <tr key={o.staff_id}>
                                    <td>{o.full_name}</td>
                                    <td>{o.username}</td>
                                    <td>{o.phone || "-"}</td>
                                    <td>{o.email || "-"}</td>
                                    <td><span className="badge">{o.status}</span></td>
                                    <td style={{ display: "flex", gap: 8 }}>
                                        <button className="btnSecondary" onClick={() => { setEditTarget(o); setEditPassword(""); }}>Edit</button>
                                        <button
                                            className="btnSecondary"
                                            style={{ background: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }}
                                            onClick={() => handleDelete(o.staff_id)}
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
                            maxWidth: 820,
                            width: "92%",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                            background: "#f8fafc",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Add Officer</span>
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
                            maxWidth: 820,
                            width: "92%",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                            background: "#f8fafc",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>Edit Officer</span>
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
