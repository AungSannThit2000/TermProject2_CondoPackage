import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import DashboardLayout from "../components/DashboardLayout.jsx";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [cards, setCards] = useState(null);
    const [quick, setQuick] = useState(null);
    const [pkgStats, setPkgStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api
            .get("/admin/summary")
            .then((res) => {
                setCards(res.data.cards);
                setQuick(res.data.quickStats);
                setPkgStats(res.data.packageStats);
            })
            .catch(() => alert("Failed to load admin summary"))
            .finally(() => setLoading(false));
    }, []);

    const navItems = [
        { key: "dashboard", label: "Dashboard", icon: "▦", onClick: () => navigate("/admin") },
        { key: "packages", label: "Packages", icon: "📦", onClick: () => navigate("/admin/packages") },
        { key: "officers", label: "Officers", icon: "👥", onClick: () => navigate("/admin/officers") },
        { key: "buildings", label: "Buildings", icon: "🏬", onClick: () => navigate("/admin/buildings") },
        { key: "rooms", label: "Rooms / Units", icon: "🏢", onClick: () => navigate("/admin/rooms") },
        { key: "tenants", label: "Tenants", icon: "🧑", onClick: () => navigate("/admin/tenants") },
        { key: "log", label: "Package Log", icon: "📝", onClick: () => navigate("/admin/log") },
    ];

    return (
        <DashboardLayout
            title="Dashboard"
            subtitle="Monitors officers, units, tenants and packages"
            sidebarTitle="ADMIN PANEL"
            sidebarSubtitle="Building Management"
            activeKey="dashboard"
            userName="Administrator"
            userSub="Admin"
            navItems={navItems}
        >
            <div className="cardsRow">
                <Card icon="🧑‍💼" label="Active Officers" value={loading ? "…" : cards?.activeOfficers} />
                <Card icon="🏢" label="Units (Total)" value={loading ? "…" : cards?.totalUnits} />
                <Card icon="👥" label="Active Tenants" value={loading ? "…" : cards?.tenantsRegistered} />
            </div>

            <div className="cardsRow">
                <Card icon="📦" label="Packages at Condo" value={loading ? "…" : pkgStats?.packagesAtCondo} />
                <Card icon="✅" label="Picked Up Today" value={loading ? "…" : pkgStats?.pickedUpToday} />
                <Card icon="↩" label="Returned This Month" value={loading ? "…" : pkgStats?.returnedThisMonth} />
            </div>

            <div className="cardsRow" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="cardBox" style={{ minHeight: 180 }}>
                    <div className="cardBoxTop">
                        <div>
                            <div className="cardLabel">System Status</div>
                            <div className="cardValue" style={{ fontSize: 16, fontWeight: 600 }}>
                                All systems operational
                            </div>
                            <div style={{ marginTop: 8, color: "#16a34a", fontWeight: 600 }}>● Online</div>
                        </div>
                    </div>
                </div>

                <div className="cardBox" style={{ minHeight: 180 }}>
                    <div className="cardBoxTop">
                        <div>
                            <div className="cardLabel">Quick Stats</div>
                        </div>
                    </div>
                    <div style={{ marginTop: 12, lineHeight: 1.7 }}>
                        <div>Total Officers: <strong>{loading ? "…" : quick?.total ?? "-"}</strong></div>
                        <div style={{ color: "#16a34a" }}>Active: <strong>{loading ? "…" : quick?.active ?? "-"}</strong></div>
                        <div style={{ color: "#dc2626" }}>Inactive: <strong>{loading ? "…" : quick?.inactive ?? "-"}</strong></div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function Card({ icon, label, value }) {
    return (
        <div className="cardBox">
            <div className="cardBoxTop">
                <div className="cardIcon">{icon}</div>
                <div>
                    <div className="cardLabel">{label}</div>
                    <div className="cardValue">{value}</div>
                </div>
            </div>
        </div>
    );
}
