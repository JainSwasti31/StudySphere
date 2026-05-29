import React from "react";

const initials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
};

const ParticipantList = ({ members = [], online = new Set(), ownerId }) => {
  return (
    <aside className="participant-list">
      <div className="participant-list__header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3>Participants</h3>
        </div>
        <span className="participant-count">{members.length}</span>
      </div>

      <ul className="participant-list__items">
        {members.map((m) => {
          const memberId = m._id || m.id;
          const memberKey = memberId ? memberId.toString() : "";
          const isOnline = online.has(memberKey);
          const isOwner = ownerId && memberId && ownerId.toString() === memberId.toString();
          return (
            <li key={memberId} className="participant-item">
              <div className="avatar">
                <div className="avatar__circle">{initials(m.name || m.email)}</div>
                <span className={`avatar__dot ${isOnline ? "online" : "offline"}`} />
              </div>
              <div className="participant-meta" style={{ flex: 1, minWidth: 0 }}>
                <div className="participant-name">{m.name || m.email}</div>
              </div>
              {isOwner && (
                <span className="participant-role-badge">Owner</span>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default ParticipantList;
