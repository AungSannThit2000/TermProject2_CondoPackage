/**
 * Reusable dashboard shell.
 * Provides consistent sidebar/topbar layout so each role page can focus on its own business logic.
 */

import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function DashboardLayout({
  title,
  subtitle,
  sidebarTitle,
  sidebarSubtitle,
  navItems,
  activeKey,
  userName,
  userSub,
  children,
}) {
  const { logout, role } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="dash">
      <aside className="dashSide">
        <div className="dashSideHeader">
          <div className="dashSideTitle">{sidebarTitle}</div>
          <div className="dashSideSub">{sidebarSubtitle}</div>
        </div>

        <div className="dashNavLabel">NAVIGATION</div>

        <div className="dashNav">
          {navItems.map((it) => (
            <button
              key={it.key}
              className={`dashNavItem ${activeKey === it.key ? "active" : ""}`}
              onClick={it.onClick}
            >
              <span className="dashNavIcon">{it.icon}</span>
              {it.label}
            </button>
          ))}
        </div>

        <div className="dashUser">
          <div className="dashUserAvatar">👤</div>
          <div className="dashUserInfo">
            <div className="dashUserName">{userName}</div>
            <div className="dashUserSub">{userSub}</div>
            <div className="dashUserRole">Logged in as {role}</div>
          </div>

          <button className="dashLogout" onClick={handleLogout}>
            ↩ Log Out
          </button>
        </div>
      </aside>

      <main className="dashMain">
        <div className="dashTop">
          <div>
            <h2 className="dashTitle">{title}</h2>
            <div className="dashSubtitle">{subtitle}</div>
          </div>

          <div className="dashTopRight">
            <div className="dashPill">👤 {userSub}</div>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}