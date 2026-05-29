const mongoose = require("mongoose");
const Room = require("../models/Room");
const Session = require("../models/Session");
const SessionParticipant = require("../models/SessionParticipant");
const User = require("../models/User");
const {
  createRoomSession,
  computeParticipantTotalMs,
  computeSessionElapsedMs,
  endSession,
  ensureParticipantJoined,
  getCurrentSessionForRoom,
  getSessionStateForRoom,
  leaveParticipant,
  pauseSession,
  resumeSession,
  sessionRoomName,
  serializeParticipant,
  serializeSession,
  syncRoomSocketsToSession,
  syncSocketLeaveFromSession,
} = require("../services/sessionService");

const isRoomOwner = (room, userId) => room.owner.toString() === userId.toString();
const getSessionRoomId = (session) => session.room?._id || session.room;

const emitSessionState = async (io, session, roomId, eventName, payload = {}) => {
  if (!io || !session) return;

  io.to(sessionRoomName(session._id.toString())).emit(eventName, {
    session: serializeSession(session),
    ...payload,
  });
};

const startSession = async (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ message: "roomId is required" });

  const room = await Room.findById(roomId);
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!isRoomOwner(room, req.user._id)) {
    return res.status(403).json({ message: "Only the room owner can start a session" });
  }

  const existing = await Session.findOne({ room: roomId, status: { $in: ["active", "paused"] } });
  if (existing) {
    return res.status(400).json({ message: "A session is already active for this room" });
  }

  const session = await createRoomSession({ roomId, startedBy: req.user._id });
  const io = req.app.get("io");
  await syncRoomSocketsToSession(io, roomId, session);

  const sockets = io ? await io.in(roomId).fetchSockets() : [];
  for (const socket of sockets) {
    const userId = socket.user?.id;
    if (!userId) continue;
    const joinResult = await ensureParticipantJoined({ session, roomId, userId, joinedAt: session.startedAt });
    socket.join(sessionRoomName(session._id.toString()));
    const eventName = joinResult.isRejoin ? "user-rejoined-session" : "user-joined-session";
    io.to(sessionRoomName(session._id.toString())).emit(eventName, {
      participant: serializeParticipant(session, joinResult.participant),
      session: serializeSession(session),
    });
  }

  await emitSessionState(io, session, roomId, "session-started");
  return res.status(201).json({ ...await getSessionStateForRoom({ roomId, userId: req.user._id }) });
};

const pauseCurrentSession = async (req, res) => {
  const { id } = req.params;
  const session = await Session.findById(id);
  if (!session) return res.status(404).json({ message: "Session not found" });

  const room = await Room.findById(getSessionRoomId(session));
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!isRoomOwner(room, req.user._id)) {
    return res.status(403).json({ message: "Only the room owner can pause a session" });
  }
  if (session.status !== "active") {
    return res.status(400).json({ message: "Session must be active to pause" });
  }

  const updated = await pauseSession(session);
  await emitSessionState(req.app.get("io"), updated, room._id.toString(), "session-paused");
  return res.status(200).json({ session: serializeSession(updated) });
};

const resumeCurrentSession = async (req, res) => {
  const { id } = req.params;
  const session = await Session.findById(id);
  if (!session) return res.status(404).json({ message: "Session not found" });

  const room = await Room.findById(getSessionRoomId(session));
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!isRoomOwner(room, req.user._id)) {
    return res.status(403).json({ message: "Only the room owner can resume a session" });
  }
  if (session.status !== "paused") {
    return res.status(400).json({ message: "Session must be paused to resume" });
  }

  const updated = await resumeSession(session);
  await emitSessionState(req.app.get("io"), updated, room._id.toString(), "session-resumed");
  return res.status(200).json({ session: serializeSession(updated) });
};

const endCurrentSession = async (req, res) => {
  const { id } = req.params;
  const session = await Session.findById(id);
  if (!session) return res.status(404).json({ message: "Session not found" });

  const room = await Room.findById(getSessionRoomId(session));
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!isRoomOwner(room, req.user._id)) {
    return res.status(403).json({ message: "Only the room owner can end a session" });
  }
  if (session.status === "ended") {
    return res.status(400).json({ message: "Session already ended" });
  }

  const updated = await endSession(session);
  const io = req.app.get("io");

  const activeParticipants = await SessionParticipant.find({ sessionId: updated._id, isActive: true });
  for (const activeParticipant of activeParticipants) {
    const leaveResult = await leaveParticipant({ session: updated, userId: activeParticipant.userId, leftAt: updated.endedAt });
    io?.to(sessionRoomName(updated._id.toString())).emit("user-left-session", {
      participant: serializeParticipant(updated, leaveResult.participant),
      session: serializeSession(updated),
    });
  }

  await emitSessionState(io, updated, room._id.toString(), "session-ended");
  io?.to(room._id.toString()).emit("session-stopped", { session: serializeSession(updated) });
  return res.status(200).json({ session: serializeSession(updated) });
};

const getRoomSessionState = async (req, res) => {
  const { roomId } = req.params;
  const state = await getSessionStateForRoom({ roomId, userId: req.user._id });
  return res.status(200).json(state);
};

const joinCurrentSession = async (req, res) => {
  const { id } = req.params;
  const session = await Session.findById(id);
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (session.status === "ended") {
    return res.status(400).json({ message: "Session has already ended" });
  }

  const room = await Room.findById(getSessionRoomId(session));
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!room.members.some((memberId) => memberId.toString() === req.user._id.toString())) {
    return res.status(403).json({ message: "Access denied to this room" });
  }
  const roomId = room._id.toString();

  const io = req.app.get("io");
  const joinResult = await ensureParticipantJoined({ session, roomId, userId: req.user._id, joinedAt: new Date() });
  const sockets = io ? await io.in(roomId).fetchSockets() : [];
  for (const socket of sockets) {
    if (socket.user?.id === req.user._id.toString()) {
      socket.join(sessionRoomName(session._id.toString()));
    }
  }

  io?.to(sessionRoomName(session._id.toString())).emit(joinResult.isRejoin ? "user-rejoined-session" : "user-joined-session", {
    participant: serializeParticipant(session, joinResult.participant),
    session: serializeSession(session),
  });

  return res.status(200).json({ participant: serializeParticipant(session, joinResult.participant), session: serializeSession(session) });
};

const leaveCurrentSession = async (req, res) => {
  const { id } = req.params;
  const session = await Session.findById(id);
  if (!session) return res.status(404).json({ message: "Session not found" });

  const room = await Room.findById(getSessionRoomId(session));
  if (!room) return res.status(404).json({ message: "Room not found" });
  if (!room.members.some((memberId) => memberId.toString() === req.user._id.toString())) {
    return res.status(403).json({ message: "Access denied to this room" });
  }
  const roomId = room._id.toString();

  const leaveResult = await leaveParticipant({ session, userId: req.user._id, leftAt: new Date() });
  if (!leaveResult.participant) {
    return res.status(400).json({ message: "You are not active in this session" });
  }

  const io = req.app.get("io");
  await syncSocketLeaveFromSession(io, roomId, session, req.user._id.toString());
  io?.to(sessionRoomName(session._id.toString())).emit("user-left-session", {
    participant: serializeParticipant(session, leaveResult.participant),
    session: serializeSession(session),
  });

  return res.status(200).json({ participant: serializeParticipant(session, leaveResult.participant), session: serializeSession(session) });
};

const toDayKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildCurrentStreak = (dayKeys) => {
  const todayKey = toDayKey(new Date());
  if (!dayKeys.has(todayKey)) return 0;
  let streak = 1;
  let cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  while (dayKeys.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const getUserSessionHistory = async (req, res) => {
  const { startDate, endDate, topic, roomId, minDuration, maxDuration } = req.query;

  const participants = await SessionParticipant.find({ userId: req.user._id }).lean();
  if (!participants.length) {
    return res.status(200).json({
      stats: { totalSessions: 0, totalStudyHours: 0, averageSessionMinutes: 0, currentStreakDays: 0 },
      sessions: [],
    });
  }

  const sessionIds = Array.from(new Set(participants.map((p) => p.sessionId.toString())));
  const sessions = await Session.find({ _id: { $in: sessionIds } })
    .populate("room", "name topic")
    .lean();
  const sessionMap = new Map(sessions.map((session) => [session._id.toString(), session]));

  const participantsBySession = await SessionParticipant.aggregate([
    { $match: { sessionId: { $in: sessionIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
    { $group: { _id: "$sessionId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(participantsBySession.map((item) => [item._id.toString(), item.count]));

  const now = new Date();
  const history = [];
  const dayKeys = new Set();

  for (const participant of participants) {
    const session = sessionMap.get(participant.sessionId.toString());
    if (!session) continue;

    const participationMs = computeParticipantTotalMs(session, participant, session.endedAt || now);
    const participationMinutes = Math.round(participationMs / 60000);

    const sessionDurationMinutes = Math.round(computeSessionElapsedMs(session, session.endedAt || now) / 60000);
    const sessionDate = session.startedAt;
    const sessionTopic = session.room?.topic || "General";

    history.push({
      sessionId: session._id.toString(),
      roomId: session.room?._id?.toString() || session.room?.toString(),
      roomName: session.room?.name || "Unknown Room",
      topic: sessionTopic,
      date: sessionDate,
      status: session.status,
      sessionDurationMinutes,
      participationMinutes,
      participantsCount: countMap.get(session._id.toString()) || 1,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    });

    dayKeys.add(toDayKey(new Date(sessionDate)));
  }

  let filtered = history;

  if (startDate) {
    const start = new Date(startDate);
    filtered = filtered.filter((item) => new Date(item.date) >= start);
  }
  if (endDate) {
    const end = new Date(endDate);
    filtered = filtered.filter((item) => new Date(item.date) <= end);
  }
  if (topic) {
    filtered = filtered.filter((item) => item.topic === topic);
  }
  if (roomId) {
    filtered = filtered.filter((item) => item.roomId === roomId);
  }
  if (minDuration) {
    filtered = filtered.filter((item) => item.sessionDurationMinutes >= Number(minDuration));
  }
  if (maxDuration) {
    filtered = filtered.filter((item) => item.sessionDurationMinutes <= Number(maxDuration));
  }

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalMinutesFiltered = filtered.reduce((sum, item) => sum + item.participationMinutes, 0);
  const filteredDayKeys = new Set(filtered.map((item) => toDayKey(new Date(item.date))));
  const stats = {
    totalSessions: filtered.length,
    totalStudyHours: Math.round((totalMinutesFiltered / 60) * 10) / 10,
    averageSessionMinutes: filtered.length ? Math.round(totalMinutesFiltered / filtered.length) : 0,
    currentStreakDays: buildCurrentStreak(filteredDayKeys),
  };

  return res.status(200).json({ stats, sessions: filtered });
};

const getSessionDetails = async (req, res) => {
  const { id } = req.params;
  const session = await Session.findById(id).populate("room", "name topic");
  if (!session) return res.status(404).json({ message: "Session not found" });

  const participant = await SessionParticipant.findOne({ sessionId: id, userId: req.user._id });
  if (!participant) return res.status(403).json({ message: "Access denied" });

  const participants = await SessionParticipant.find({ sessionId: id }).lean();
  const userIds = participants.map((item) => item.userId);
  const users = await User.find({ _id: { $in: userIds } }).select("name email").lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const now = new Date();
  const details = participants.map((item) => {
    const totalMinutes = Math.round(computeParticipantTotalMs(session, item, session.endedAt || now) / 60000);
    const user = userMap.get(item.userId.toString());
    return {
      userId: item.userId.toString(),
      name: user?.name || "User",
      email: user?.email || "",
      participationMinutes: totalMinutes,
    };
  });

  const sessionDurationMinutes = Math.round(computeSessionElapsedMs(session, session.endedAt || now) / 60000);
  const personalMinutes = Math.round(computeParticipantTotalMs(session, participant, session.endedAt || now) / 60000);

  return res.status(200).json({
    session: {
      id: session._id.toString(),
      roomName: session.room?.name || "Unknown Room",
      topic: session.room?.topic || "General",
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationMinutes: sessionDurationMinutes,
    },
    personal: {
      participationMinutes: personalMinutes,
    },
    participants: details,
  });
};

module.exports = {
  startSession,
  pauseCurrentSession,
  resumeCurrentSession,
  endCurrentSession,
  getRoomSessionState,
  joinCurrentSession,
  leaveCurrentSession,
  getUserSessionHistory,
  getSessionDetails,
};