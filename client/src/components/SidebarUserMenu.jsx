import { useState } from "react";
import { useAuthStore } from "../store/authStore";

const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const SidebarUserMenu = ({ collapsed }) => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [open, setOpen] = useState(false);

  return (
    <div className={`sidebar-user${collapsed ? " is-collapsed" : ""}`}>
      <button type="button" className="sidebar-user__trigger" onClick={() => setOpen((v) => !v)}>
        <span className="sidebar-user__avatar">{initials(user?.name || user?.email)}</span>
        {!collapsed ? (
          <span className="sidebar-user__meta">
            <strong>{user?.name || "User"}</strong>
            <span>{user?.email || ""}</span>
          </span>
        ) : null}
        {!collapsed ? <span className="sidebar-user__caret">▾</span> : null}
      </button>
      {open ? (
        <div className="sidebar-user__menu">
          <button type="button" onClick={clearAuth}>
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default SidebarUserMenu;
