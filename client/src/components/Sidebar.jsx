import { NavLink } from "react-router-dom";
import SidebarUserMenu from "./SidebarUserMenu";

const navGroups = [
  {
    title: "Main",
    items: [
      { label: "Study Rooms", to: "/rooms", icon: "📚" },
      { label: "Sessions", to: "/sessions", icon: "⏱" },
    ],
  },
  {
    title: "Analytics",
    items: [{ label: "Analytics", to: "/analytics", icon: "📈" }],
  },
  {
    title: "Community",
    items: [{ label: "Leaderboard", to: "/leaderboard", icon: "🥇" }],
  },
  {
    title: "Personal",
    items: [
      { label: "Profile", to: "/profile", icon: "👤" },
    ],
  },
];

const Sidebar = ({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }) => {
  return (
    <aside className={`sidebar${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}>
      <div className="sidebar__header">
        <div className="sidebar__brand">
          <span className="sidebar__logo">◆</span>
          {!collapsed ? <span className="sidebar__brand-text">StudySphere</span> : null}
        </div>
        <button type="button" className="icon-button sidebar__toggle" onClick={onToggleCollapse}>
          {collapsed ? "»" : "«"}
        </button>
        <button type="button" className="icon-button sidebar__close" onClick={onCloseMobile}>
          ✕
        </button>
      </div>

      <nav className="sidebar__nav">
        {navGroups.map((group) => (
          <div key={group.title} className="sidebar__group">
            {!collapsed ? <p className="sidebar__group-title">{group.title}</p> : null}
            <div className="sidebar__items">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `sidebar__item${isActive ? " is-active" : ""}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {!collapsed ? <span className="sidebar__label">{item.label}</span> : null}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <SidebarUserMenu collapsed={collapsed} />
    </aside>
  );
};

export default Sidebar;
