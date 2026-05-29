import { useMemo, useState } from "react";

const SessionHistory = ({ sessions = [] }) => {
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const topicOptions = useMemo(() => {
    const topics = new Set(sessions.map((s) => s.topic || "General"));
    return ["all", ...Array.from(topics).sort()];
  }, [sessions]);

  const filtered = useMemo(() => {
    const lowered = query.toLowerCase();
    const list = sessions.filter((session) => {
      const matchesTopic = topicFilter === "all" || (session.topic || "General") === topicFilter;
      const matchesQuery =
        !lowered ||
        session.roomName?.toLowerCase().includes(lowered) ||
        session.topic?.toLowerCase().includes(lowered);
      return matchesTopic && matchesQuery;
    });

    const sorted = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "duration") {
        return (a.participationMinutes - b.participationMinutes) * dir;
      }
      return (new Date(a.date) - new Date(b.date)) * dir;
    });

    return sorted;
  }, [sessions, query, topicFilter, sortKey, sortDir]);

  return (
    <section className="dashboard-card history-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Session History</p>
          <h2>Every study session</h2>
        </div>
      </div>

      <div className="history-controls">
        <input
          type="search"
          placeholder="Search room or topic"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}>
          {topicOptions.map((topic) => (
            <option key={topic} value={topic}>
              {topic === "all" ? "All topics" : topic}
            </option>
          ))}
        </select>
        <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
          <option value="date">Sort by date</option>
          <option value="duration">Sort by duration</option>
        </select>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setSortDir((current) => (current === "asc" ? "desc" : "asc"))}
        >
          {sortDir === "asc" ? "Asc" : "Desc"}
        </button>
      </div>

      <div className="history-table">
        <div className="history-row history-head">
          <span>Room</span>
          <span>Topic</span>
          <span>Date</span>
          <span>Session</span>
          <span>You</span>
          <span>Participants</span>
        </div>
        {filtered.length === 0 ? (
          <div className="history-empty">No sessions match your filters.</div>
        ) : (
          filtered.map((session) => (
            <div key={session.sessionId} className="history-row">
              <span>{session.roomName}</span>
              <span>{session.topic || "General"}</span>
              <span>{new Date(session.date).toLocaleDateString()}</span>
              <span>{session.sessionDurationMinutes} mins</span>
              <span>{session.participationMinutes} mins</span>
              <span>{session.participantsCount || 0}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default SessionHistory;
