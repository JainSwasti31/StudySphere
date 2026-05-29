import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../store/authStore";
import {
  endSession,
  getRoomSessionState,
  joinSession,
  leaveSession,
  pauseSession,
  resumeSession,
  startSession,
} from "../api/sessionApi";

const formatDuration = (ms) => {
  const safeMs = Math.max(0, ms || 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
};

const diffMs = (start, end) => Math.max(0, new Date(end).getTime() - new Date(start).getTime());

const getId = (value) => value?._id || value?.id || value;

const isSameId = (left, right) => {
  const leftId = getId(left);
  const rightId = getId(right);

  if (!leftId || !rightId) return false;

  return leftId.toString() === rightId.toString();
};

const computeSessionElapsedMs = (session, now = Date.now()) => {
  if (!session) return 0;

  const pausedMs = (session.pauseIntervals || []).reduce((sum, interval) => sum + diffMs(interval.pausedAt, interval.resumedAt), 0);
  if (session.status === "ended") return Math.max(0, diffMs(session.startedAt, session.endedAt) - pausedMs);
  if (session.status === "paused") return Math.max(0, diffMs(session.startedAt, session.pausedAt) - pausedMs);
  return Math.max(0, diffMs(session.startedAt, now) - pausedMs);
};

const computeParticipantDurationMs = (session, participant, now = Date.now()) => {
  if (!session || !participant) return 0;

  const windows = [];
  let cursor = new Date(session.startedAt).getTime();
  (session.pauseIntervals || []).forEach((interval) => {
    const pausedAt = new Date(interval.pausedAt).getTime();
    const resumedAt = interval.resumedAt ? new Date(interval.resumedAt).getTime() : pausedAt;
    if (pausedAt > cursor) {
      windows.push([cursor, pausedAt]);
    }
    cursor = resumedAt;
  });

  if (session.status === "ended") {
    const endAt = new Date(session.endedAt).getTime();
    if (endAt > cursor) windows.push([cursor, endAt]);
  } else if (session.status === "paused") {
    const pauseAt = new Date(session.pausedAt).getTime();
    if (pauseAt > cursor) windows.push([cursor, pauseAt]);
  } else if (now > cursor) {
    windows.push([cursor, now]);
  }

  let total = 0;
  (participant.intervals || []).forEach((interval) => {
    const intervalStart = new Date(interval.joinedAt).getTime();
    const intervalEnd = new Date(interval.leftAt || now).getTime();
    windows.forEach(([windowStart, windowEnd]) => {
      const start = Math.max(intervalStart, windowStart);
      const end = Math.min(intervalEnd, windowEnd);
      if (end > start) total += end - start;
    });
  });

  return total;
};

const getRoleLabel = (session, userId, roomOwnerId) => {
  if (!userId) return "participant";
  if (isSameId(roomOwnerId, userId)) return "owner";
  if (session && isSameId(session.startedBy, userId)) return "owner";
  return "participant";
};

const SessionTimer = ({ room, roomId, socketRef, onStateChange }) => {
  const [state, setState] = useState(null);
  const [tick, setTick] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [flash, setFlash] = useState("");
  const user = useAuthStore((s) => s.user);

  const effectiveRoomId = roomId || room?.id || room?._id;
  const session = state?.session;
  const participant = state?.participant;
  const isOwner = isSameId(room?.owner, user?._id || user?.id);
  const roleLabel = getRoleLabel(session, user?._id || user?.id, room?.owner);
  const sessionActive = session?.status === "active";
  const sessionPaused = session?.status === "paused";
  const sessionEnded = session?.status === "ended";
  const elapsedMs = useMemo(() => computeSessionElapsedMs(session, tick), [session, tick]);
  const participationMs = useMemo(() => computeParticipantDurationMs(session, participant, tick), [session, participant, tick]);
  const participationPct = elapsedMs > 0 ? Math.min(100, Math.round((participationMs / elapsedMs) * 100)) : 0;
  const joinedLateMs = participant?.joinedLateMs || 0;
  const joinedLateMinutes = joinedLateMs > 0 ? Math.max(1, Math.round(joinedLateMs / 60000)) : 0;
  const hasLeftBefore = (participant?.rejoinCount || 0) > 0 || (!!participant?.lastLeftAt && !participant?.isActive);
  const rejoinAvailable = !!session && !participant?.isActive && !sessionEnded;
  const currentParticipantLabel = participant?.isActive ? "You are actively counted in this session." : participant ? "You left this session. Your progress is saved." : "Join the session to start tracking your participation.";

  const loadState = async () => {
    if (!effectiveRoomId) return;
    try {
      const next = await getRoomSessionState(effectiveRoomId);
      setState(next);
      onStateChange?.(next);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRoomId]);

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const refresh = () => loadState();
    const sessionEvents = [
      "session-started",
      "session-paused",
      "session-resumed",
      "session-ended",
      "session-stopped",
      "session-state",
      "user-joined-session",
      "user-left-session",
      "user-rejoined-session",
    ];

    sessionEvents.forEach((event) => socket.on(event, refresh));
    return () => {
      sessionEvents.forEach((event) => socket.off(event, refresh));
    };
  }, [socketRef, effectiveRoomId]);

  const withLoading = async (action) => {
    setLoading(true);
    try {
      await action();
      await loadState();
    } catch (error) {
      setFlash(error.response?.data?.message || error.message || "Unable to update session");
      setTimeout(() => setFlash(""), 3500);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => withLoading(async () => startSession(effectiveRoomId));
  const handlePause = () => withLoading(async () => pauseSession(session.id));
  const handleResume = () => withLoading(async () => resumeSession(session.id));
  const handleEnd = () => withLoading(async () => endSession(session.id));
  const handleJoin = () => withLoading(async () => joinSession(session.id));
  const handleLeave = () => withLoading(async () => leaveSession(session.id));

  const statusLabel = sessionEnded ? "Session ended" : sessionPaused ? "Paused" : sessionActive ? "In progress" : "Not started";
  const statusTone = sessionEnded ? "danger" : sessionPaused ? "warning" : sessionActive ? "success" : "muted";
  const emptyTitle = isOwner ? "Ready to start" : "Waiting for host";

  return (
    <section className="session-card">
      <div className="session-card__header">
        <div>
          <p className="eyebrow">Study session</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>

      <span className={`session-badge session-badge--${statusTone}`} style={{ width: "fit-content" }}>
        {statusTone === "success" && <span className="session-badge__dot" />}
        {statusLabel}
      </span>

      {flash ? <div className="dashboard-alert session-alert">{flash}</div> : null}

      {session ? (
        <>
          <div className="session-clock">
            <span className="session-clock__label">Global timer</span>
            <strong>{formatDuration(elapsedMs)}</strong>
          </div>

          <div className="session-progress">
            <div className="session-progress__track">
              <div className="session-progress__fill" style={{ width: `${Math.min(100, participationPct)}%` }} />
            </div>
            <div className="session-progress__meta">
              <span>Your participation</span>
              <strong>{formatDuration(participationMs)}</strong>
            </div>
          </div>

          <div className="session-metrics">
            <div>
              <span>Started</span>
              <strong>{new Date(session.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {roleLabel === "owner" ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    Owner
                  </>
                ) : "Participant"}
              </strong>
            </div>
          </div>

          {joinedLateMs > 0 ? <p className="session-note session-note--accent">You joined {joinedLateMinutes} mins late.</p> : null}
          {hasLeftBefore ? <p className="session-note session-note--accent">Welcome back 👋 Previous participation restored.</p> : null}

          {isOwner ? (
            <div className="session-controls-v2">
              {sessionEnded ? (
                <button className="session-btn session-btn--primary" type="button" onClick={handleStart} disabled={loading}>
                  Start New Session
                </button>
              ) : null}
              {(sessionActive || sessionPaused) ? (
                <button className="session-btn session-btn--secondary" type="button" onClick={sessionActive ? handlePause : handleResume} disabled={loading}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {sessionActive
                      ? <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
                      : <polygon points="5 3 19 12 5 21 5 3" />
                    }
                  </svg>
                  {sessionActive ? "Pause" : "Resume"}
                </button>
              ) : null}
              {(sessionActive || sessionPaused) ? (
                <button className="session-btn session-btn--danger" type="button" onClick={handleEnd} disabled={loading}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                  End session
                </button>
              ) : null}
              {!session || sessionEnded ? (
                <button className="session-btn session-btn--primary" type="button" onClick={handleStart} disabled={loading}>
                  Start Session
                </button>
              ) : null}
            </div>
          ) : (
            <div className="session-controls-v2">
              {rejoinAvailable ? (
                <button className="session-btn session-btn--primary" type="button" onClick={handleJoin} disabled={loading}>
                  Rejoin session
                </button>
              ) : null}
              {participant?.isActive ? (
                <button className="session-btn session-btn--secondary" type="button" onClick={() => setLeaveConfirmOpen(true)} disabled={loading}>
                  Leave session
                </button>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="session-empty">
            {isOwner ? (
              <>
                <p>You are the room owner. Start the session when you are ready.</p>
                <p className="session-empty__hint">Everyone in the room will see the same synced timer once you start it.</p>
              </>
            ) : (
              <>
                <p>Only the room owner can start a session.</p>
                <p className="session-empty__hint">Participants can view the timer once the host starts the room study block.</p>
              </>
            )}
          </div>

          {isOwner ? (
            <div className="session-controls-v2">
              <button className="session-btn session-btn--primary" type="button" onClick={handleStart} disabled={loading}>
                Start Session
              </button>
            </div>
          ) : null}
        </>
      )}

      {leaveConfirmOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setLeaveConfirmOpen(false)}>
          <div className="modal-card session-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">Leave session</p>
            <h3>Leave current study session?</h3>
            <p>Your progress till now will be saved.</p>
            <div className="form-row">
              <button className="secondary-button" type="button" onClick={() => setLeaveConfirmOpen(false)}>Cancel</button>
              <button className="primary-button" type="button" onClick={() => { setLeaveConfirmOpen(false); handleLeave(); }}>Leave session</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default SessionTimer;