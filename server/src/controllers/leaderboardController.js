const Session = require("../models/Session");
const SessionParticipant = require("../models/SessionParticipant");
const User = require("../models/User");
const { computeParticipantTotalMs } = require("../services/sessionService");

const toDayKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildStreak = (dayKeys) => {
  const sorted = Array.from(dayKeys).sort();
  let current = 0;
  let lastKey = null;

  for (const key of sorted) {
    if (!lastKey) {
      current = 1;
    } else {
      const lastDate = new Date(lastKey);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 1);
      if (toDayKey(nextDate) === key) {
        current += 1;
      } else {
        current = 1;
      }
    }
    lastKey = key;
  }

  return current;
};

const getPeriodRange = (period) => {
  const now = new Date();
  if (period === "weekly") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (period === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  }
  return { start: null, end: null };
};

const getLeaderboard = async (req, res) => {
  const period = req.query.period || "all";
  const { start, end } = getPeriodRange(period);

  const sessionFilter = start ? { startedAt: { $gte: start, $lte: end } } : {};
  const sessions = await Session.find(sessionFilter).lean();
  const sessionMap = new Map(sessions.map((session) => [session._id.toString(), session]));
  const sessionIds = sessions.map((session) => session._id);

  if (!sessionIds.length) {
    return res.status(200).json({ period, leaders: [] });
  }

  const participants = await SessionParticipant.find({ sessionId: { $in: sessionIds } }).lean();
  const userStats = new Map();

  participants.forEach((participant) => {
    const session = sessionMap.get(participant.sessionId.toString());
    if (!session) return;

    const totalMs = computeParticipantTotalMs(session, participant, session.endedAt || new Date());
    const totalMinutes = Math.round(totalMs / 60000);
    if (!totalMinutes) return;

    const userId = participant.userId.toString();
    if (!userStats.has(userId)) {
      userStats.set(userId, {
        userId,
        totalMinutes: 0,
        sessions: new Set(),
        dayKeys: new Set(),
      });
    }

    const stats = userStats.get(userId);
    stats.totalMinutes += totalMinutes;
    stats.sessions.add(participant.sessionId.toString());

    const dayKey = toDayKey(new Date(participant.createdAt));
    stats.dayKeys.add(dayKey);
  });

  const users = await User.find({ _id: { $in: Array.from(userStats.keys()) } }).select("name email achievements").lean();
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));

  const leaders = Array.from(userStats.values())
    .map((stats) => {
      const user = userMap.get(stats.userId);
      const streak = buildStreak(stats.dayKeys);
      return {
        userId: stats.userId,
        name: user?.name || "User",
        email: user?.email || "",
        studyHours: Math.round((stats.totalMinutes / 60) * 10) / 10,
        sessions: stats.sessions.size,
        streak,
        achievements: (user?.achievements || []).map((item) => item.key),
      };
    })
    .sort((a, b) => b.studyHours - a.studyHours);

  return res.status(200).json({ period, leaders });
};

module.exports = {
  getLeaderboard,
};
