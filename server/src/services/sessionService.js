const Session = require("../models/Session");
const SessionParticipant = require("../models/SessionParticipant");
const Room = require("../models/Room");
const User = require("../models/User");

const sessionRoomName = (sessionId) => `session:${sessionId}`;

const toDate = (value) => (value ? new Date(value) : null);

const diffMs = (start, end) => Math.max(0, toDate(end) - toDate(start));

const computeSessionElapsedMs = (session, now = new Date()) => {
  if (!session) return 0;

  const pauseIntervals = session.pauseIntervals || [];
  const pausedMs = pauseIntervals.reduce((sum, interval) => sum + diffMs(interval.pausedAt, interval.resumedAt), 0);

  if (session.status === "ended") {
    return Math.max(0, diffMs(session.startedAt, session.endedAt) - pausedMs);
  }

  if (session.status === "paused") {
    return Math.max(0, diffMs(session.startedAt, session.pausedAt) - pausedMs);
  }

  return Math.max(0, diffMs(session.startedAt, now) - pausedMs);
};

const getActiveWindows = (session, now = new Date()) => {
  const windows = [];
  let cursor = toDate(session.startedAt);

  for (const interval of session.pauseIntervals || []) {
    const pausedAt = toDate(interval.pausedAt);
    if (pausedAt && pausedAt > cursor) {
      windows.push({ start: cursor, end: pausedAt });
    }

    cursor = toDate(interval.resumedAt) || cursor;
  }

  if (session.status === "ended") {
    const endedAt = toDate(session.endedAt);
    if (endedAt && endedAt > cursor) {
      windows.push({ start: cursor, end: endedAt });
    }
    return windows;
  }

  if (session.status === "paused") {
    const pausedAt = toDate(session.pausedAt);
    if (pausedAt && pausedAt > cursor) {
      windows.push({ start: cursor, end: pausedAt });
    }
    return windows;
  }

  if (now > cursor) {
    windows.push({ start: cursor, end: now });
  }

  return windows;
};

const overlapMs = (intervalStart, intervalEnd, windowStart, windowEnd) => {
  const start = Math.max(toDate(intervalStart).getTime(), toDate(windowStart).getTime());
  const end = Math.min(toDate(intervalEnd).getTime(), toDate(windowEnd).getTime());
  return Math.max(0, end - start);
};

const computeParticipantTotalMs = (session, participant, now = new Date()) => {
  if (!session || !participant) return 0;

  const windows = getActiveWindows(session, now);
  let total = 0;

  for (const interval of participant.intervals || []) {
    const joinedAt = interval.joinedAt;
    const leftAt = interval.leftAt || now;

    for (const window of windows) {
      total += overlapMs(joinedAt, leftAt, window.start, window.end);
    }
  }

  return total;
};

const serializeSession = (session, now = new Date()) => ({
  id: session._id.toString(),
  room: session.room?._id ? session.room._id.toString() : session.room.toString(),
  startedBy: session.startedBy?._id
    ? {
        id: session.startedBy._id.toString(),
        name: session.startedBy.name,
        email: session.startedBy.email,
      }
    : session.startedBy,
  startedAt: session.startedAt,
  pausedAt: session.pausedAt,
  endedAt: session.endedAt,
  status: session.status,
  pauseIntervals: session.pauseIntervals || [],
  elapsedMs: computeSessionElapsedMs(session, now),
});

const serializeParticipant = (session, participant, now = new Date()) => {
  if (!participant) return null;

  const totalDurationMs = computeParticipantTotalMs(session, participant, now);
  const firstJoinedAt = participant.intervals?.[0]?.joinedAt || participant.currentJoinedAt || null;
  const joinedLateMs = firstJoinedAt ? Math.max(0, toDate(firstJoinedAt).getTime() - toDate(session.startedAt).getTime()) : 0;

  return {
    id: participant._id.toString(),
    userId: participant.userId.toString(),
    roomId: participant.roomId.toString(),
    sessionId: participant.sessionId.toString(),
    intervals: participant.intervals || [],
    totalDurationMs,
    isActive: participant.isActive,
    currentJoinedAt: participant.currentJoinedAt,
    lastJoinedAt: participant.lastJoinedAt,
    lastLeftAt: participant.lastLeftAt,
    joinedLateMs,
    rejoinCount: Math.max(0, (participant.intervals || []).length - 1),
  };
};

const getCurrentSessionForRoom = async (roomId) =>
  Session.findOne({ room: roomId, status: { $in: ["active", "paused"] } }).sort({ createdAt: -1 });

const ensureParticipantJoined = async ({ session, roomId, userId, joinedAt = new Date() }) => {
  const participant = await SessionParticipant.findOne({ sessionId: session._id, userId });

  if (!participant) {
    const created = await SessionParticipant.create({
      sessionId: session._id,
      roomId,
      userId,
      intervals: [{ joinedAt }],
      currentJoinedAt: joinedAt,
      isActive: true,
      lastJoinedAt: joinedAt,
    });

    return { participant: created, isNew: true, isRejoin: false };
  }

  if (participant.isActive) {
    return { participant, isNew: false, isRejoin: false };
  }

  participant.intervals.push({ joinedAt });
  participant.currentJoinedAt = joinedAt;
  participant.isActive = true;
  participant.lastJoinedAt = joinedAt;
  participant.lastLeftAt = null;
  await participant.save();

  return { participant, isNew: false, isRejoin: true };
};

const leaveParticipant = async ({ session, userId, leftAt = new Date() }) => {
  const participant = await SessionParticipant.findOne({ sessionId: session._id, userId });

  if (!participant || !participant.isActive) {
    return { participant: null };
  }

  const lastInterval = participant.intervals[participant.intervals.length - 1];
  if (lastInterval && !lastInterval.leftAt) {
    lastInterval.leftAt = leftAt;
  }

  participant.currentJoinedAt = null;
  participant.isActive = false;
  participant.lastLeftAt = leftAt;
  participant.totalDurationMs = computeParticipantTotalMs(session, participant, leftAt);
  await participant.save();

  return { participant };
};

const syncRoomSocketsToSession = async (io, roomId, session) => {
  if (!io || !session) return;

  const sockets = await io.in(roomId).fetchSockets();
  for (const socket of sockets) {
    socket.join(sessionRoomName(session._id.toString()));
  }
};

const syncSocketLeaveFromSession = async (io, roomId, session, userId) => {
  if (!io || !session) return;

  const sockets = await io.in(roomId).fetchSockets();
  for (const socket of sockets) {
    if (socket.user?.id === userId) {
      socket.leave(sessionRoomName(session._id.toString()));
    }
  }
};

const getSessionStateForRoom = async ({ roomId, userId }) => {
  const session = await getCurrentSessionForRoom(roomId);
  if (!session) {
    return { session: null, participant: null, participants: [] };
  }

  const participants = await SessionParticipant.find({ sessionId: session._id }).sort({ createdAt: 1 });
  const now = new Date();
  const currentUserParticipant = userId
    ? participants.find((participant) => participant.userId.toString() === userId.toString())
    : null;

  return {
    session: serializeSession(session, now),
    participant: serializeParticipant(session, currentUserParticipant, now),
    participants: participants.map((participant) => serializeParticipant(session, participant, now)),
  };
};

const populateSessionStartedBy = async (session) => session.populate("startedBy", "name email");

const createRoomSession = async ({ roomId, startedBy, startedAt = new Date() }) => {
  const session = await Session.create({
    room: roomId,
    startedBy,
    startedAt,
    status: "active",
    pausedAt: null,
    endedAt: null,
    pauseIntervals: [],
  });

  return populateSessionStartedBy(session);
};

const pauseSession = async (session, pausedAt = new Date()) => {
  session.status = "paused";
  session.pausedAt = pausedAt;
  await session.save();
  return populateSessionStartedBy(session);
};

const resumeSession = async (session, resumedAt = new Date()) => {
  if (session.pausedAt) {
    session.pauseIntervals.push({ pausedAt: session.pausedAt, resumedAt });
  }

  session.status = "active";
  session.pausedAt = null;
  await session.save();
  return populateSessionStartedBy(session);
};

const endSession = async (session, endedAt = new Date()) => {
  if (session.pausedAt) {
    session.pauseIntervals.push({ pausedAt: session.pausedAt, resumedAt: endedAt });
    session.pausedAt = null;
  }

  session.status = "ended";
  session.endedAt = endedAt;
  await session.save();
  return populateSessionStartedBy(session);
};

module.exports = {
  sessionRoomName,
  computeSessionElapsedMs,
  computeParticipantTotalMs,
  serializeSession,
  serializeParticipant,
  getCurrentSessionForRoom,
  getSessionStateForRoom,
  ensureParticipantJoined,
  leaveParticipant,
  syncRoomSocketsToSession,
  syncSocketLeaveFromSession,
  createRoomSession,
  pauseSession,
  resumeSession,
  endSession,
};