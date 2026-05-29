import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getRoomById, leaveRoom, getMessages, updateRoom, deleteRoom, getRoomOnlineMembers } from "../api/roomApi";
import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import ParticipantList from "../components/ParticipantList";
import SessionTimer from "../components/SessionTimer";

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", topic: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const inviteRef = useRef(null);
  const socketRef = useRef(null);

  // close invite popup on outside click
  useEffect(() => {
    const handler = (e) => {
      if (inviteRef.current && !inviteRef.current.contains(e.target)) {
        setInviteOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [onlineSet, setOnlineSet] = useState(new Set());
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const loadRoom = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getRoomById(roomId);
        setRoom(data.room);
        setEditForm({ name: data.room?.name || "", description: data.room?.description || "", topic: data.room?.topic || "" });
        const onlineResp = await getRoomOnlineMembers(roomId);
        const onlineIds = (onlineResp.online || []).map((id) => id.toString());
        setOnlineSet(new Set(onlineIds));
        const msgResp = await getMessages(roomId);
        setMessages(msgResp.messages || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load room");
      } finally {
        setLoading(false);
      }
    };
    loadRoom();
  }, [roomId]);

  useEffect(() => {
    if (!token) return;
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", { auth: { token } });
    socketRef.current.emit("join-room", { roomId });
    socketRef.current.on("message-received", ({ message }) => {
      setMessages((m) => [...m, message]);
    });
    socketRef.current.on("user-joined", ({ user }) => {
      const userId = (user._id || user.id)?.toString?.() || "";
      setOnlineSet((s) => new Set([...Array.from(s), userId]));
    });
    socketRef.current.on("user-left", ({ userId }) => {
      const leftId = userId?.toString?.() || userId || "";
      setOnlineSet((s) => { const copy = new Set(Array.from(s)); copy.delete(leftId); return copy; });
    });
    socketRef.current.on("room-participants", ({ participants }) => {
      const ids = participants.map((p) => (p.id || p._id)?.toString?.() || "");
      setOnlineSet(new Set(ids));
    });
    return () => {
      socketRef.current?.emit("leave-room", { roomId });
      socketRef.current?.disconnect();
    };
  }, [token, roomId]);

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom(roomId);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to leave room");
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!messageText.trim()) return;
    socketRef.current?.emit("send-message", { roomId, text: messageText.trim() });
    setMessageText("");
  };

  const handleRoomUpdate = async (event) => {
    event.preventDefault();
    setEditLoading(true);
    setError("");
    try {
      const updated = await updateRoom(roomId, editForm);
      setRoom(updated.room);
      setEditOpen(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update room");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    setEditLoading(true);
    setError("");
    try {
      await deleteRoom(roomId);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete room");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCopyInvite = () => {
    if (room?.inviteCode) {
      navigator.clipboard.writeText(room.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isOwner = room?.owner && user?._id && (room.owner._id || room.owner).toString() === user._id.toString();
  const memberCount = room?.members?.length || 0;

  if (loading) {
    return (
      <div className="room-loading">
        <div className="room-loading__spinner" />
        <p>Loading room...</p>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-card empty-state">
          <h2>Room unavailable</h2>
          <p>{error}</p>
          <Link className="primary-link" to="/rooms">Back to rooms</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`room-page${sessionActive ? " room-page--fullscreen" : ""}`}>
      {/* Header */}
      <header className="room-header">
        <div className="room-header__left">
          <Link to="/rooms" className="room-back-btn" aria-label="Back to rooms">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <p className="room-eyebrow">ROOM</p>
            <h1 className="room-title">{room?.name}</h1>
            <p className="room-subtitle">Live room chat, synced session timing, and attendance tracking.</p>
          </div>
        </div>
        <div className="room-header__actions">
          <button className="room-btn room-btn--secondary" type="button" onClick={handleLeaveRoom}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Leave room
          </button>

          {/* Invite button — visible to all */}
          <div className="room-invite-popup-wrap" ref={inviteRef}>
            <button className="room-btn room-btn--primary" type="button" onClick={() => setInviteOpen((v) => !v)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Invite
            </button>
            {inviteOpen && (
              <div className="room-invite-popup" role="dialog" aria-label="Invite code">
                <p className="room-invite-popup__label">Share this code to invite others</p>
                <div className="room-invite-popup__code-row">
                  <span className="room-invite-popup__code">{room?.inviteCode}</span>
                  <button
                    className="room-invite-popup__copy"
                    type="button"
                    onClick={handleCopyInvite}
                    aria-label="Copy invite code"
                  >
                    {copied ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {isOwner && (
            <button className="room-btn room-btn--ghost" type="button" onClick={() => setEditOpen((v) => !v)} title="Edit room">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Room details bar */}
      <div className="room-details-bar">
        <p className="room-details-bar__title">Room details</p>
        <div className="room-details-bar__items">
          <div className="room-detail-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
            </svg>
            <div>
              <span className="room-detail-item__label">Topic</span>
              <span className="room-detail-item__value">{room?.topic || "General"}</span>
            </div>
          </div>
          <div className="room-detail-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="2" width="6" height="4" rx="1" /><path d="M3 10h18M3 10a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z" />
            </svg>
            <div>
              <span className="room-detail-item__label">Invite code</span>
              <button className="room-invite-copy" type="button" onClick={handleCopyInvite} title="Copy invite code">
                {room?.inviteCode}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {copied
                    ? <><polyline points="20 6 9 17 4 12" /></>
                    : <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>
                  }
                </svg>
              </button>
            </div>
          </div>
          <div className="room-detail-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div>
              <span className="room-detail-item__label">Members</span>
              <span className="room-detail-item__value">{memberCount}</span>
            </div>
          </div>
          <div className="room-detail-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <div>
              <span className="room-detail-item__label">Created</span>
              <span className="room-detail-item__value">
                {room?.createdAt ? new Date(room.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + new Date(room.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="dashboard-alert" style={{ margin: "0 0 4px" }}>{error}</div> : null}

      {/* Edit modal */}
      {editOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditOpen(false)}>
          <div className="modal-card session-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <form className="auth-form" onSubmit={handleRoomUpdate}>
              <h2>Edit room</h2>
              <label>Room name
                <input name="name" type="text" value={editForm.name} onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))} required />
              </label>
              <label>Description
                <input name="description" type="text" value={editForm.description} onChange={(e) => setEditForm((c) => ({ ...c, description: e.target.value }))} />
              </label>
              <label>Topic
                <input name="topic" type="text" value={editForm.topic} onChange={(e) => setEditForm((c) => ({ ...c, topic: e.target.value }))} placeholder="e.g. Interview Prep" />
              </label>
              <div className="form-row">
                <button type="submit" disabled={editLoading} className="primary-button">{editLoading ? "Saving..." : "Save changes"}</button>
                <button type="button" className="secondary-button" onClick={() => setEditOpen(false)}>Cancel</button>
                <button type="button" className="secondary-button" onClick={handleDeleteRoom} disabled={editLoading}>Delete room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="room-body">
        {/* Chat */}
        <section className="room-chat-panel">
          <div className="room-chat-panel__header">
            <div className="room-chat-panel__title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Chat
            </div>
            <button
              className="room-chat-clear"
              type="button"
              onClick={() => setMessages([])}
              title="Clear chat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Clear chat
            </button>
          </div>

          <div className="room-chat-messages">
            {messages.length === 0 && (
              <p className="room-chat-empty">No messages yet. Say hi 👋</p>
            )}
            {messages.map((m) => {
              const currentUser = useAuthStore.getState().user;
              const senderId = (m.sender?._id || m.sender?.id)?.toString();
              const myId = (currentUser?._id || currentUser?.id)?.toString();
              const isMe = !!(senderId && myId && senderId === myId);
              const senderName = m.sender?.name || m.sender?.email || "?";
              const initials = senderName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
              const displayName = isMe ? "Me" : senderName;
              return (
                <div key={m.id || m._id} className={`room-msg${isMe ? " room-msg--mine" : ""}`}>
                  {!isMe && (
                    <div className="room-msg__avatar">{initials}</div>
                  )}
                  <div className="room-msg__content">
                    <div className="room-msg__meta">
                      <span className={`room-msg__author${isMe ? " room-msg__author--me" : ""}`}>{displayName}</span>
                      <span className="room-msg__time">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="room-msg__bubble">{m.text}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form className="room-chat-form" onSubmit={handleSendMessage}>
            <button type="button" className="room-chat-emoji" aria-label="Emoji">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
              </svg>
            </button>
            <input
              className="room-chat-input"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              autoComplete="off"
            />
            <button type="submit" className="room-chat-send" disabled={!messageText.trim()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send
            </button>
          </form>
        </section>

        {/* Right panel */}
        <aside className="room-right-panel">
          <SessionTimer
            room={room}
            roomId={roomId}
            socketRef={socketRef}
            onStateChange={(state) => {
              const active = state?.session?.status === "active" || state?.session?.status === "paused";
              setSessionActive(active);
            }}
          />
          <ParticipantList members={room?.members || []} online={onlineSet} ownerId={room?.owner?._id || room?.owner} />
        </aside>
      </div>
    </div>
  );
};

export default RoomPage;
