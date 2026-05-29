import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import RoomCard from "../components/RoomCard";
import { createRoom, getRooms, joinRoom } from "../api/roomApi";

const RoomsPage = () => {
  const location = useLocation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", topic: "" });
  const [inviteCode, setInviteCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  useEffect(() => {
    if (location.state?.action === "create") {
      setShowCreateForm(true);
    }
    if (location.state?.action === "join") {
      setShowJoinForm(true);
    }
  }, [location.state]);

  const handleCopyInvite = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (clipboardError) {
      setError("Unable to copy invite code");
    }
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setActionLoading(true);
    setError("");

    try {
      await createRoom(createForm);
      setCreateForm({ name: "", description: "", topic: "" });
      setShowCreateForm(false);
      await loadRooms();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create room");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinSubmit = async (event) => {
    event.preventDefault();
    setActionLoading(true);
    setError("");

    try {
      await joinRoom({ inviteCode: inviteCode.trim() });
      setInviteCode("");
      setShowJoinForm(false);
      await loadRooms();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to join room");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Study Rooms</p>
          <h1>Join your study spaces</h1>
          <p className="subcopy">Create a new room or jump into an existing group session.</p>
        </div>
        <div className="form-row">
          <button className="primary-button" type="button" onClick={() => setShowCreateForm(true)}>
            Create room
          </button>
          <button className="secondary-button" type="button" onClick={() => setShowJoinForm(true)}>
            Join room
          </button>
        </div>
      </header>

      {error ? <div className="dashboard-alert">{error}</div> : null}

      {showCreateForm ? (
        <section className="dashboard-card modal-card">
          <form className="auth-form" onSubmit={handleCreateSubmit}>
            <h2>Create room</h2>
            <label>
              Room name
              <input
                name="name"
                type="text"
                value={createForm.name}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Description
              <input
                name="description"
                type="text"
                value={createForm.description}
                onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <label>
              Topic
              <input
                name="topic"
                type="text"
                value={createForm.topic}
                onChange={(event) => setCreateForm((current) => ({ ...current, topic: event.target.value }))}
                placeholder="e.g. Data Structures"
              />
            </label>
            <div className="form-row">
              <button type="submit" disabled={actionLoading} className="primary-button">
                {actionLoading ? "Creating..." : "Create room"}
              </button>
              <button type="button" className="secondary-button" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {showJoinForm ? (
        <section className="dashboard-card modal-card">
          <form className="auth-form" onSubmit={handleJoinSubmit}>
            <h2>Join room</h2>
            <label>
              Invite code
              <input
                name="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                required
              />
            </label>
            <div className="form-row">
              <button type="submit" disabled={actionLoading} className="primary-button">
                {actionLoading ? "Joining..." : "Join room"}
              </button>
              <button type="button" className="secondary-button" onClick={() => setShowJoinForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

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
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onCopyInvite={handleCopyInvite} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default RoomsPage;
