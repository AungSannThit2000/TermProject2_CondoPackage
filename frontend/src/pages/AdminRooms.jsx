import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

export default function AdminRooms() {
    const navigate = useNavigate();
    const [buildings, setBuildings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rForm, setRForm] = useState({ building_id: "", room_no: "", floor: "", status: "ACTIVE" });
    const [showRoom, setShowRoom] = useState(false);
    const [editRoom, setEditRoom] = useState(null);

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
        Promise.all([api.get("/admin/buildings"), api.get("/admin/rooms")])
            .then(([b, r]) => {
                setBuildings(b.data.buildings || []);
                setRooms(r.data.rooms || []);
            })
            .catch(() => alert("Failed to load rooms"))
            .finally(() => setLoading(false));
    }

    async function addRoom(e) {
        e.preventDefault();
        if (!rForm.building_id) {
            alert("Please select a building.");
            return;
        }
        if (!rForm.room_no) {
            alert("Please enter a room number.");
            return;
        }
        try {
            await api.post("/admin/rooms", {
                building_id: Number(rForm.building_id),
                room_no: rForm.room_no,
                floor: rForm.floor || null,
                status: rForm.status,
            });
            setRForm({ building_id: "", room_no: "", floor: "", status: "ACTIVE" });
            setShowRoom(false);
            loadData();
        } catch (err) {
            const msg = err?.response?.data?.message || "Failed to add room";
            alert(msg);
        }
    }

    async function updateRoom(e) {
        e.preventDefault();
        if (!editRoom) return;
        try {
            await api.put(
                `/admin/rooms/${editRoom.building_id}/${encodeURIComponent(editRoom.original_room_no)}`,
                {
                    room_no: editRoom.room_no,
                    floor: editRoom.floor,
                    status: editRoom.status,
                }
            );
            setEditRoom(null);
            loadData();
        } catch {
            alert("Failed to update room");
        }
    }

    async function deleteRoom(buildingId, roomNo) {
        if (!window.confirm("Delete this room?")) return;
        try {
            await api.delete(`/admin/rooms/${buildingId}/${encodeURIComponent(roomNo)}`);
            setRooms((prev) => prev.filter((r) => !(r.building_id === buildingId && r.room_no === roomNo)));
        } catch {
            alert("Failed to delete room (in use?)");
        }
    }

    return (
        <DashboardLayout
            title="Rooms / Units"
            subtitle="Manage buildings and rooms"
            sidebarTitle="ADMIN PANEL"
            sidebarSubtitle="Building Management"
            activeKey="rooms"
            userName="Administrator"
            userSub="Admin"
            navItems={navItems}
        >
            <div className="cardsRow">
                <div className="cardBox">
                    <div className="cardBoxTop">
                        <div className="cardIcon">🏢</div>
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
                            <div className="cardLabel">Rooms</div>
                            <div className="cardValue">{rooms.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="tableBox">
                <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Rooms</span>
                    <button className="btnPrimary" onClick={() => setShowRoom(true)} style={{ padding: "10px 12px" }}>
                        + Add Room
                    </button>
                </div>
                <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Building</th>
                                <th>Room</th>
                                <th>Floor</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5">Loading…</td></tr>
                            ) : rooms.length === 0 ? (
                                <tr><td colSpan="5">No rooms</td></tr>
                            ) : (
                                rooms.map((r) => (
                                    <tr key={`${r.building_id}:${r.room_no}`}>
                                        <td>{r.building_code}</td>
                                        <td>{r.room_no}</td>
                                        <td>{r.floor || "-"}</td>
                                        <td><span className="badge">{r.status}</span></td>
                                        <td style={{ display: "flex", gap: 8 }}>
                                            <button className="btnSecondary" onClick={() => setEditRoom({ ...r, original_room_no: r.room_no })}>Edit</button>
                                            <button
                                                className="btnSecondary"
                                                style={{ background: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }}
                                                onClick={() => deleteRoom(r.building_id, r.room_no)}
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

            {(showRoom || editRoom) && (
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
                        setShowRoom(false);
                        setEditRoom(null);
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
                            <span>{showRoom ? "Add Room" : "Edit Room"}</span>
                            <button className="btnSecondary" onClick={() => { setShowRoom(false); setEditRoom(null); }}>Close</button>
                        </div>
                        {showRoom ? (
                            <form
                                onSubmit={addRoom}
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
                                    <label className="label">Building</label>
                                    <select
                                        value={rForm.building_id}
                                        onChange={(e) => setRForm((f) => ({ ...f, building_id: e.target.value }))}
                                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                    >
                                        <option value="">Select building</option>
                                        {buildings.map((b) => (
                                            <option key={b.building_id} value={b.building_id}>
                                                {b.building_code} {b.building_name ? `- ${b.building_name}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Room no</label>
                                    <input
                                        placeholder="Room no"
                                        value={rForm.room_no}
                                        onChange={(e) => setRForm((f) => ({ ...f, room_no: e.target.value }))}
                                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                    />
                                </div>
                                <div>
                                    <label className="label">Floor</label>
                                    <input
                                        placeholder="Floor"
                                        value={rForm.floor}
                                        onChange={(e) => setRForm((f) => ({ ...f, floor: e.target.value }))}
                                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                    />
                                </div>
                                <div>
                                    <label className="label">Status</label>
                                    <select
                                        value={rForm.status}
                                        onChange={(e) => setRForm((f) => ({ ...f, status: e.target.value }))}
                                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                    </select>
                                </div>
                                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                                    <button className="btnPrimary" type="submit">Add Room</button>
                                    <button className="btnSecondary" type="button" onClick={() => setShowRoom(false)}>Cancel</button>
                                </div>
                            </form>
                        ) : editRoom ? (
                            <form
                                onSubmit={updateRoom}
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
                                    <label className="label">Building</label>
                                    <input
                                        value={editRoom.building_code}
                                        disabled
                                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f3f4f6" }}
                                    />
                                </div>
                                <div>
                                    <label className="label">Room no</label>
                                    <input
                                        value={editRoom.room_no}
                                        onChange={(e) => setEditRoom((r) => ({ ...r, room_no: e.target.value }))}
                                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                    />
                                </div>
                                <div>
                                    <label className="label">Floor</label>
                                    <input
                                        value={editRoom.floor || ""}
                                        onChange={(e) => setEditRoom((r) => ({ ...r, floor: e.target.value }))}
                                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                    />
                                </div>
                                <div>
                                    <label className="label">Status</label>
                                    <select
                                        value={editRoom.status}
                                        onChange={(e) => setEditRoom((r) => ({ ...r, status: e.target.value }))}
                                        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#f9fafb" }}
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                    </select>
                                </div>
                                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                                    <button className="btnPrimary" type="submit">Save</button>
                                    <button className="btnSecondary" type="button" onClick={() => setEditRoom(null)}>Cancel</button>
                                </div>
                            </form>
                        ) : null}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
