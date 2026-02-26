/**
 * Officer add-package page.
 * Collects package details, ties them to a tenant room, and submits a new package record.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useOfficerDisplayName } from "../hooks/useOfficerDisplayName.js";

function toLocalInput(value) {
  const d = new Date(value);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function OfficerAddPackage() {
  const navigate = useNavigate();
  const displayName = useOfficerDisplayName();

  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [buildingId, setBuildingId] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [status, setStatus] = useState("ARRIVED");
  const [note, setNote] = useState("");
  const [arrival, setArrival] = useState(toLocalInput(new Date()));
  const [saving, setSaving] = useState(false);

  const filteredRooms = useMemo(
    () => rooms.filter((r) => String(r.building_id) === String(buildingId)),
    [rooms, buildingId]
  );

  const selectedRoom = useMemo(
    () => rooms.find((r) => String(r.building_id) === String(buildingId) && String(r.room_no) === String(roomNo)),
    [rooms, buildingId, roomNo]
  );

  useEffect(() => {
    api
      .get("/officer/package-form")
      .then((res) => {
        const fetchedBuildings = res.data.buildings || [];
        const fetchedRooms = res.data.rooms || [];

        setBuildings(fetchedBuildings);
        setRooms(fetchedRooms);

        const defaultBuildingId = fetchedBuildings[0]?.building_id
          ? String(fetchedBuildings[0].building_id)
          : "";
        setBuildingId(defaultBuildingId);

        const firstRoom = fetchedRooms.find(
          (r) => !defaultBuildingId || String(r.building_id) === defaultBuildingId
        );
        if (firstRoom) {
          setRoomNo(String(firstRoom.room_no));
          setTenantId(String(firstRoom.tenant_id));
        }
      })
      .catch(() => alert("Failed to load form options"));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!tenantId) return alert("Please select a building and room");

    try {
      setSaving(true);
      await api.post("/officer/packages", {
        tracking_no: tracking || null,
        carrier: carrier || null,
        tenant_id: tenantId,
        status,
        note,
        arrived_at: arrival ? new Date(arrival).toISOString() : null,
      });
      alert("Package added");
      navigate("/officer");
    } catch (err) {
      alert("Failed to add package");
    } finally {
      setSaving(false);
    }
  }

  const statusOptions = [
    { value: "ARRIVED", label: "At Condo" },
    { value: "PICKED_UP", label: "Picked Up" },
    { value: "RETURNED", label: "Returned" },
  ];

  return (
    <DashboardLayout
      title="Officer View"
      subtitle="Register new packages and manage pickups"
      sidebarTitle="OFFICER DESK"
      sidebarSubtitle="Lobby Counter"
      activeKey="add"
      userName={displayName || "Officer"}
      userSub="Front Desk"
      navItems={[
        { key: "dashboard", label: "Dashboard", icon: "▦", onClick: () => navigate("/officer") },
        { key: "add", label: "Add Package", icon: "＋", onClick: () => navigate("/officer/add") },
        { key: "log", label: "Package Log", icon: "≡", onClick: () => navigate("/officer/log") },
      ]}
    >
      <div className="formCard">
        <div className="formHeader">Register New Package</div>
        <form className="formGrid" onSubmit={handleSubmit}>
          <div className="field">
            <label>Tracking Number</label>
            <input
              placeholder="e.g. TH12345678"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Courier</label>
            <input
              placeholder="e.g. Kerry"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Building</label>
            <select
              value={buildingId}
              onChange={(e) => {
                const nextBuilding = e.target.value;
                setBuildingId(nextBuilding);
                const nextRoom = rooms.find((r) => String(r.building_id) === nextBuilding);
                if (nextRoom) {
                  setRoomNo(String(nextRoom.room_no));
                  setTenantId(String(nextRoom.tenant_id));
                } else {
                  setRoomNo("");
                  setTenantId("");
                }
              }}
            >
              {buildings.map((b) => (
                <option key={b.building_id} value={b.building_id}>
                  {b.building_code} {b.building_name ? `- ${b.building_name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Room</label>
            <select
              value={roomNo}
              onChange={(e) => {
                const nextNo = e.target.value;
                setRoomNo(nextNo);
                const nextRoom = rooms.find(
                  (r) => String(r.building_id) === String(buildingId) && String(r.room_no) === String(nextNo)
                );
                setTenantId(nextRoom ? String(nextRoom.tenant_id) : "");
              }}
            >
              {filteredRooms.map((r) => (
                <option key={`${r.building_id}:${r.room_no}`} value={r.room_no}>
                  Room {r.room_no}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Tenant Name</label>
            <input placeholder="Auto-filled from room" value={selectedRoom?.tenant_name || ""} readOnly />
          </div>

          <div className="field">
            <label>Arrival Time</label>
            <input
              type="datetime-local"
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field full">
            <label>Officer Note</label>
            <textarea
              rows={4}
              placeholder="Add any special notes, eg - fragile, food, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="formActions">
            <button type="submit" className="btnPrimary" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" className="btnSecondary" onClick={() => navigate("/officer")}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
