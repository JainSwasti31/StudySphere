const SessionDetailsModal = ({ details, onClose }) => {
  if (!details) return null;

  const { session, personal, participants } = details;
  const attendancePct =
    session.durationMinutes > 0
      ? Math.min(100, Math.round((personal.participationMinutes / session.durationMinutes) * 100))
      : 0;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="dashboard-card session-details-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Session details"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="card-header">
          <div>
            <p className="eyebrow">Session details</p>
            <h2 style={{ marginBottom: 4 }}>{session.roomName}</h2>
            <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>{session.topic || "General"}</span>
          </div>
          <button type="button" className="secondary-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Time info */}
        <div className="session-details-grid">
          <div className="session-details-cell">
            <span>Start time</span>
            <strong>{new Date(session.startedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</strong>
          </div>
          <div className="session-details-cell">
            <span>End time</span>
            <strong>
              {session.endedAt
                ? new Date(session.endedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                : "In progress"}
            </strong>
          </div>
          <div className="session-details-cell">
            <span>Total duration</span>
            <strong>{session.durationMinutes} mins</strong>
          </div>
          <div className="session-details-cell">
            <span>Status</span>
            <strong style={{ textTransform: "capitalize" }}>{session.status}</strong>
          </div>
        </div>

        {/* Personal contribution */}
        <div className="session-details-contribution">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>Your contribution</span>
            <strong>{personal.participationMinutes} mins ({attendancePct}%)</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${attendancePct}%` }} />
          </div>
        </div>

        {/* Participants */}
        <div>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Participants ({participants.length})</p>
          <ul className="session-details-participants">
            {participants.map((p) => {
              const pct =
                session.durationMinutes > 0
                  ? Math.min(100, Math.round((p.participationMinutes / session.durationMinutes) * 100))
                  : 0;
              return (
                <li key={p.userId} className="session-details-participant">
                  <div className="session-details-participant__info">
                    <strong>{p.name}</strong>
                    <span>{p.participationMinutes} mins</span>
                  </div>
                  <div className="progress-track" style={{ flex: 1, minWidth: 80 }}>
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="session-details-participant__pct">{pct}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default SessionDetailsModal;
