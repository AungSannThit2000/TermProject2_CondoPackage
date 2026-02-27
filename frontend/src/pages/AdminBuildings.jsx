import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

export default function AdminBuildings() {
    const navigate = useNavigate();
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState({ building_code: "", building_name: "" });

    const navItems = [
        { key: "dashboard", label: "Dashboard", icon: "▦", onClick: () => navigate("/admin") },
        { key: "packages", label: "Packages", icon: "📦", onClick: () => navigate("/admin/packages") },
        { key: "officers", label: "Officers", icon: "👥", onClick: () => navigate("/admin/officers") },
        { key: "buildings", label: "Buildings", icon: "🏬", onClick: () => navigate("/admin/buildings") },
        { key: "rooms", label: "Rooms / Units", icon: "🏢", onClick: () => navigate("/admin/rooms") },
        { key: "tenants", label: "Tenants", icon: "🧑", onClick: () => navigate("/admin/tenants") },
        { key: "log", label: "Package Log", icon: "📝", onClick: () => navigate("/admin/log") },
    ];

    const loadData = useCallback(() => {
        setLoading(true);
        api
            .get("/admin/buildings")
            .then((res) => setBuildings(res.data.buildings || []))
            .catch(() => alert("Failed to load buildings"))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [loadData]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return buildings;
        return buildings.filter((b) => {
            return (
                (b.building_code || "").toLowerCase().includes(q) ||
                (b.building_name || "").toLowerCase().includes(q)
            );
        });
    }, [buildings, search]);

    async function handleCreate(e) {
        e.preventDefault();
        if (!form.building_code.trim()) {
            alert("Building code is required.");
            return;
        }

        try {
            await api.post("/admin/buildings", {
                building_code: form.building_code.trim(),
                building_name: form.building_name.trim() || null,
            });
            setForm({ building_code: "", building_name: "" });
            setShowCreate(false);
            loadData();
        } catch (err) {
            const message = err.response?.data?.message || "Failed to create building";
            alert(message);
        }
    }

    async function handleEditSave(e) {
        e.preventDefault();
        if (!editTarget) return;
        if (!String(editTarget.building_code || "").trim()) {
            alert("Building code is required.");
            return;
        }

        try {
            await api.put(`/admin/buildings/${editTarget.building_id}`, {
                building_code: String(editTarget.building_code || "").trim(),
                building_name: String(editTarget.building_name || "").trim() || null,
            });
            setEditTarget(null);
            loadData();
        } catch (err) {
            const message = err.response?.data?.message || "Failed to update building";
            alert(message);
        }
    }

    async function handleDelete(buildingId) {
        const ok = window.confirm(
            "Delete this building? This will also delete related rooms, tenants, and package records."
        );
        if (!ok) return;

        try {
            await api.delete(`/admin/buildings/${buildingId}`);
            setBuildings((prev) => prev.filter((b) => b.building_id !== buildingId));
        } catch (err) {
            const message = err.response?.data?.message || "Failed to delete building";
            alert(message);
        }
    }

    return (
        <DashboardLayout
            title="Buildings"
            subtitle="Manage building records"
            sidebarTitle="ADMIN PANEL"
            sidebarSubtitle="Building Management"
            activeKey="buildings"
            userName="Administrator"
            userSub="Admin"
            navItems={navItems}
        >
            <div className="cardsRow">
                <div className="cardBox">
                    <div className="cardBoxTop">
                        <div className="cardIcon">🏬</div>
                        <div>
                            <div className="cardLabel">Buildings</div>
                            <div className="cardValue">{buildings.length}</div>
                        </div>
                    </div>
                </div>
                <div className="cardBox">
                    <div className="cardBoxTop">
                        <div className="cardIcon">🚪</div>
                        <div>
                            <div className="cardLabel">Total Rooms</div>
                            <div className="cardValue">
                                {buildings.reduce((sum, b) => sum + Number(b.room_count || 0), 0)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="tableBox">
                <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Buildings</span>
                    <button className="btnPrimary" onClick={() => setShowCreate(true)} style={{ padding: "10px 12px" }}>
                        + Add Building
                    </button>
                </div>

                <div className="tableControls">
                    <div className="searchBox" style={{ width: "100%" }}>
                        <span className="searchIcon">🔍</span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search building code or name"
                        />
                    </div>
                </div>

                <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Rooms</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4">Loading…</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="4">No buildings</td></tr>
                            ) : (
                                filtered.map((b) => (
                                    <tr key={b.building_id}>
                                        <td>{b.building_code}</td>
                                        <td>{b.building_name || "-"}</td>
                                        <td>{b.room_count || 0}</td>
                                        <td style={{ display: "flex", gap: 8 }}>
                                            <button className="btnSecondary" onClick={() => setEditTarget(b)}>
                                                Edit
                                            </button>
                                            <button
                                                className="btnSecondary"
                                                style={{ background: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }}
                                                onClick={() => handleDelete(b.building_id)}
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

            {(showCreate || editTarget) && (
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
                    onClick={() => {
                        setShowCreate(false);
                        setEditTarget(null);
                    }}
                >
                    <div
                        className="tableBox"
                        style={{
                            maxWidth: 760,
                            width: "90%",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                            background: "#f8fafc",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>{showCreate ? "Add Building" : "Edit Building"}</span>
                            <button className="btnSecondary" onClick={() => { setShowCreate(false); setEditTarget(null); }}>
                                Close
                            </button>
                        </div>

                        {showCreate ? (
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
                                    <label className="label">Building code</label>
                                    <input
                                        placeholder="e.g. A"
                                        value={form.building_code}
                                        onChange={(e) => setForm((prev) => ({ ...prev, building_code: e.target.value }))}
                                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                    />
                                </div>
                                <div>
                                    <label className="label">Building name</label>
                                    <input
                                        placeholder="Building name"
                                        value={form.building_name}
                                        onChange={(e) => setForm((prev) => ({ ...prev, building_name: e.target.value }))}
                                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                    />
                                </div>
                                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                                    <button className="btnPrimary" type="submit">Add Building</button>
                                    <button className="btnSecondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                                </div>
                            </form>
                        ) : editTarget ? (
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
                                    <label className="label">Building code</label>
                                    <input
                                        value={editTarget.building_code || ""}
                                        onChange={(e) => setEditTarget((prev) => ({ ...prev, building_code: e.target.value }))}
                                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                    />
                                </div>
                                <div>
                                    <label className="label">Building name</label>
                                    <input
                                        value={editTarget.building_name || ""}
                                        onChange={(e) => setEditTarget((prev) => ({ ...prev, building_name: e.target.value }))}
                                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                    />
                                </div>
                                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                                    <button className="btnPrimary" type="submit">Save</button>
                                    <button className="btnSecondary" type="button" onClick={() => setEditTarget(null)}>Cancel</button>
                                </div>
                            </form>
                        ) : null}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
