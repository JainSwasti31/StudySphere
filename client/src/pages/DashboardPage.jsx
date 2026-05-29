import { useEffect, useState } from "react";
import DashboardSummaryCards from "../components/DashboardSummaryCards";
import RoomCard from "../components/RoomCard";
import { Link, useNavigate } from "react-router-dom";
import { getRooms } from "../api/roomApi";
import { getDashboard } from "../api/dashboardApi";
import { useAuthStore } from "../store/authStore";

const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const loadRooms = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getRooms();
      setRooms(data.rooms || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const loadDashboard = async () => {
    setDashboardLoading(true);
    setDashboardError("");

    try {
      const data = await getDashboard();
      setDashboard(data);
    } catch (requestError) {
      setDashboardError(requestError.response?.data?.message || "Unable to load dashboard analytics");
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCopyInvite = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (clipboardError) {
      setError("Unable to copy invite code");
    }
  };

  const recentSessions = dashboard?.sessionHistory?.slice(0, 5) || [];

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Welcome{user?.name ? `, ${user.name}` : ""}</h1>
          <p className="subcopy">Quick visibility into rooms, progress, and activity.</p>
        </div>
      </header>

      <section className="dashboard-actions">
        <button className="primary-button" type="button" onClick={() => navigate("/rooms", { state: { action: "create" } })}>
          Create room
        </button>
        <button className="secondary-button" type="button" onClick={() => navigate("/rooms", { state: { action: "join" } })}>
          Join room
        </button>
        <Link className="secondary-button" to="/analytics">
          View analytics
        </Link>
      </section>

      {error ? <div className="dashboard-alert">{error}</div> : null}
      {dashboardError ? <div className="dashboard-alert">{dashboardError}</div> : null}

      {dashboardLoading ? <div className="dashboard-card">Loading analytics...</div> : null}
      {!dashboardLoading && dashboard ? <DashboardSummaryCards summary={dashboard.summary} /> : null}

      <section className="dashboard-grid two-col">
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h2>Latest sessions</h2>
            </div>
            <Link className="secondary-button" to="/analytics">
              View all
            </Link>
          </div>
          {recentSessions.length === 0 ? (
            <p className="subcopy">No recent sessions yet.</p>
          ) : (
            <ul className="activity-list">
              {recentSessions.map((session) => (
                <li key={session.sessionId} className="activity-item">
                  <div>
                    <strong>{session.roomName}</strong>
                    <span>{session.topic || "General"}</span>
                  </div>
                  <span>{new Date(session.date).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Upcoming</p>
              <h2>Sessions to revisit</h2>
            </div>
          </div>
          <p className="subcopy">Your next planned sessions will surface here.</p>
        </div>
      </section>

      <section className="room-grid-shell">
        <div className="room-grid-header">
          <h2>Active rooms</h2>
          <button type="button" className="secondary-button" onClick={loadRooms} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? <div className="dashboard-card">Loading rooms...</div> : null}

        {!loading && rooms.length === 0 ? (
          <div className="dashboard-card empty-state">
            <h2>No rooms yet</h2>
            <p>Create your first room or join one with an invite code.</p>
          </div>
        ) : null}

        {!loading ? (
          <div className="room-grid">
            {rooms.slice(0, 6).map((room) => (
              <RoomCard key={room.id} room={room} onCopyInvite={handleCopyInvite} />
            ))}
          </div>
        ) : null}
        {!loading && rooms.length > 0 ? (
          <Link className="primary-link" to="/rooms">
            View all rooms
          </Link>
        ) : null}
      </section>
    </div>
  );
};

export default DashboardPage;