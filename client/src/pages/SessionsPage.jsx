import { useEffect, useMemo, useState } from "react";
import { getRooms } from "../api/roomApi";
import { getSessionDetails, getSessionHistory } from "../api/sessionApi";
import SessionDetailsModal from "../components/SessionDetailsModal";

const StatusChip = ({ status }) => {
  const tone = status === "ended" ? "danger" : status === "paused" ? "warning" : "success";
  return <span className={`session-badge session-badge--${tone}`}>{status}</span>;
};

const SessionsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    topic: "",
    roomId: "",
    minDuration: "",
    maxDuration: "",
  });
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const topics = useMemo(() => {
    const set = new Set(sessions.map((item) => item.topic || "General"));
    return Array.from(set).sort();
  }, [sessions]);

  const loadSessions = async (params = {}) => {
    setLoading(true);
    setError("");
    try {
      const [historyResp, roomsResp] = await Promise.all([
        getSessionHistory(params),
        getRooms(),
      ]);
      setStats(historyResp.stats);
      setSessions(historyResp.sessions || []);
      setRooms(roomsResp.rooms || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const applyFilters = () => {
    loadSessions({
      topic: filters.topic || undefined,
      roomId: filters.roomId || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      minDuration: filters.minDuration || undefined,
      maxDuration: filters.maxDuration || undefined,
    });
  };

  const resetFilters = () => {
    const cleared = { startDate: "", endDate: "", topic: "", roomId: "", minDuration: "", maxDuration: "" };
    setFilters(cleared);
    loadSessions();
  };

  const openDetails = async (sessionId) => {
    setDetailsLoading(true);
    try {
      const data = await getSessionDetails(sessionId);
      setDetails(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load session details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const recentSessions = sessions.slice(0, 6);

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Sessions</p>
          <h1>Session history</h1>
          <p className="subcopy">Track your study sessions, durations, and participation trends.</p>
        </div>
      </header>

      {error ? <div className="dashboard-alert">{error}</div> : null}

      {/* Stats — always show once loading is done */}
      {!loading ? (
        <section className="dashboard-grid summary-grid">
          <article className="dashboard-card summary-card">
            <p className="eyebrow">Total sessions</p>
            <h2>{stats?.totalSessions ?? 0}</h2>
          </article>
          <article className="dashboard-card summary-card">
            <p className="eyebrow">Total study hours</p>
            <h2>{stats?.totalStudyHours ?? 0} hrs</h2>
          </article>
          <article className="dashboard-card summary-card">
            <p className="eyebrow">Average duration</p>
            <h2>{stats?.averageSessionMinutes ?? 0} mins</h2>
          </article>
          <article className="dashboard-card summary-card">
            <p className="eyebrow">Current streak</p>
            <h2>{stats?.currentStreakDays ?? 0} days</h2>
          </article>
        </section>
      ) : null}

      {/* Filters */}
      <section className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Filters</p>
            <h2>Refine sessions</h2>
          </div>
          <div className="form-row" style={{ flexWrap: "nowrap" }}>
            <button type="button" className="secondary-button" onClick={resetFilters} disabled={loading}>
              Reset
            </button>
            <button type="button" className="primary-button" onClick={applyFilters} disabled={loading}>
              Apply
            </button>
          </div>
        </div>
        <div className="sessions-filters-grid">
          <label>
            Start date
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
          </label>
          <label>
            End date
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
          </label>
          <label>
            Topic
            <select name="topic" value={filters.topic} onChange={handleFilterChange}>
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </label>
          <label>
            Room
            <select name="roomId" value={filters.roomId} onChange={handleFilterChange}>
              <option value="">All rooms</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </label>
          <label>
            Min duration (mins)
            <input type="number" name="minDuration" value={filters.minDuration} onChange={handleFilterChange} min="0" />
          </label>
          <label>
            Max duration (mins)
            <input type="number" name="maxDuration" value={filters.maxDuration} onChange={handleFilterChange} min="0" />
          </label>
        </div>
      </section>

      {/* Session History Table */}
      <section className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Session history</p>
            <h2>Every session</h2>
          </div>
          {sessions.length > 0 ? (
            <div className="card-meta">
              <span>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="sessions-loading">Loading sessions...</div>
        ) : (
          <div className="sessions-table">
            <div className="sessions-table__head">
              <span>Room</span>
              <span>Topic</span>
              <span>Date</span>
              <span>Duration</span>
              <span>You</span>
              <span>Participants</span>
              <span>Status</span>
            </div>
            {sessions.length === 0 ? (
              <div className="sessions-empty-state">
                <p>No sessions found.</p>
                <span>Join a room and participate in a session — it will appear here.</span>
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  type="button"
                  key={session.sessionId}
                  className="sessions-table__row"
                  onClick={() => openDetails(session.sessionId)}
                >
                  <span className="sessions-table__cell--primary">{session.roomName}</span>
                  <span>{session.topic || "General"}</span>
                  <span>{new Date(session.date).toLocaleDateString()}</span>
                  <span>{session.sessionDurationMinutes} mins</span>
                  <span>{session.participationMinutes} mins</span>
                  <span>{session.participantsCount || 0}</span>
                  <span><StatusChip status={session.status} /></span>
                </button>
              ))
            )}
          </div>
        )}
      </section>

      {/* Recent Sessions Timeline */}
      <section className="dashboard-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Recent sessions</p>
            <h2>Timeline</h2>
          </div>
        </div>
        {recentSessions.length === 0 ? (
          <div className="sessions-empty-state">
            <p>No recent sessions yet.</p>
            <span>Your last 6 sessions will appear here as a timeline.</span>
          </div>
        ) : (
          <div className="sessions-timeline">
            {recentSessions.map((session) => (
              <button
                type="button"
                key={session.sessionId}
                className="sessions-timeline__item"
                onClick={() => openDetails(session.sessionId)}
              >
                <div className="sessions-timeline__rail">
                  <div className="sessions-timeline__dot" />
                  <div className="sessions-timeline__line" />
                </div>
                <div className="sessions-timeline__body">
                  <div className="sessions-timeline__top">
                    <strong>{session.roomName}</strong>
                    <StatusChip status={session.status} />
                  </div>
                  <div className="sessions-timeline__meta">
                    <span>{session.topic || "General"}</span>
                    <span>·</span>
                    <span>{session.participationMinutes} mins</span>
                    <span>·</span>
                    <span>{session.participantsCount} participant{session.participantsCount !== 1 ? "s" : ""}</span>
                  </div>
                  <span className="sessions-timeline__date">
                    {new Date(session.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {detailsLoading ? <div className="dashboard-alert">Loading session details...</div> : null}
      {details ? <SessionDetailsModal details={details} onClose={() => setDetails(null)} /> : null}
    </div>
  );
};

export default SessionsPage;
