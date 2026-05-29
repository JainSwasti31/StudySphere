const Session = require("../models/Session");
const SessionParticipant = require("../models/SessionParticipant");
const Room = require("../models/Room");
const { computeSessionElapsedMs } = require("./sessionService");

const toDate = (value) => (value ? new Date(value) : null);

const toDayKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toHourKey = (date) => date.getHours();

const getSessionActiveWindows = (session, now = new Date()) => {
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

const addDurationByDay = (dayTotals, start, end) => {
  let cursor = new Date(start.getTime());

  while (cursor < end) {
    const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    const segmentEnd = end < dayEnd ? end : dayEnd;
    const minutes = Math.max(0, (segmentEnd - cursor) / 60000);
    if (minutes > 0) {
      const key = toDayKey(cursor);
      dayTotals.set(key, (dayTotals.get(key) || 0) + minutes);
    }
    cursor = segmentEnd;
  }
};

const addSessionsByDay = (daySessions, start, end, sessionId) => {
  let cursor = new Date(start.getTime());

  while (cursor < end) {
    const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    const segmentEnd = end < dayEnd ? end : dayEnd;
    if (segmentEnd > cursor) {
      const key = toDayKey(cursor);
      if (!daySessions.has(key)) {
        daySessions.set(key, new Set());
      }
      daySessions.get(key).add(sessionId);
    }
    cursor = segmentEnd;
  }
};

const addDurationByHour = (hourTotals, start, end) => {
  let cursor = new Date(start.getTime());

  while (cursor < end) {
    const hourEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), cursor.getHours() + 1);
    const segmentEnd = end < hourEnd ? end : hourEnd;
    const minutes = Math.max(0, (segmentEnd - cursor) / 60000);
    if (minutes > 0) {
      const key = toHourKey(cursor);
      hourTotals.set(key, (hourTotals.get(key) || 0) + minutes);
    }
    cursor = segmentEnd;
  }
};

const addDurationByWeekday = (weekdayTotals, start, end) => {
  let cursor = new Date(start.getTime());

  while (cursor < end) {
    const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    const segmentEnd = end < dayEnd ? end : dayEnd;
    const minutes = Math.max(0, (segmentEnd - cursor) / 60000);
    if (minutes > 0) {
      const key = cursor.getDay();
      weekdayTotals.set(key, (weekdayTotals.get(key) || 0) + minutes);
    }
    cursor = segmentEnd;
  }
};

const getSegmentsForParticipant = (session, participant, now = new Date()) => {
  const segments = [];
  const windows = getSessionActiveWindows(session, now);

  for (const interval of participant.intervals || []) {
    const joinedAt = toDate(interval.joinedAt);
    const leftAt = toDate(interval.leftAt) || now;

    for (const window of windows) {
      const start = joinedAt > window.start ? joinedAt : window.start;
      const end = leftAt < window.end ? leftAt : window.end;
      if (end > start) {
        segments.push({ start, end });
      }
    }
  }

  return segments;
};

const buildStreaks = (dayKeys) => {
  const sorted = Array.from(dayKeys).sort();
  let best = 0;
  let current = 0;
  let streak = 0;
  let lastKey = null;

  for (const key of sorted) {
    if (!lastKey) {
      streak = 1;
    } else {
      const lastDate = new Date(lastKey);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 1);
      if (toDayKey(nextDate) === key) {
        streak += 1;
      } else {
        streak = 1;
      }
    }

    if (streak > best) best = streak;
    lastKey = key;
  }

  const todayKey = toDayKey(new Date());
  if (dayKeys.has(todayKey)) {
    current = 1;
    let cursor = new Date();
    cursor.setDate(cursor.getDate() - 1);
    while (dayKeys.has(toDayKey(cursor))) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return { current, best };
};

const getWeekRange = (anchor, offsetDays = 0) => {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1));
  start.setDate(start.getDate() + offsetDays);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
};

const getMonthlyRange = (anchor) => {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  return { start, end };
};

const calculateProductivityScore = ({ weeklyMinutes, weeklyStudyDays, avgSessionMinutes }) => {
  const hoursScore = Math.min(1, weeklyMinutes / 600);
  const consistencyScore = Math.min(1, weeklyStudyDays / 7);
  const focusScore = Math.min(1, avgSessionMinutes / 90);
  return Math.round((hoursScore * 0.5 + consistencyScore * 0.3 + focusScore * 0.2) * 100);
};

const calculateLevel = (totalXp) => {
  const level = Math.floor(totalXp / 100) + 1;
  const currentLevelXp = (level - 1) * 100;
  const nextLevelXp = level * 100;
  const progressPct = Math.min(100, Math.round(((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100));
  return { level, currentLevelXp, nextLevelXp, progressPct };
};

const isPomodoroSession = (session, durationMinutes) => {
  if (session.sessionType && session.sessionType === "pomodoro") return true;
  return durationMinutes >= 25 && durationMinutes <= 35;
};

const achievementDefinitions = [
  {
    key: "first-session",
    name: "First Session Completed",
    description: "Complete your first study session.",
    isUnlocked: (metrics) => metrics.sessionsCompleted >= 1,
  },
  {
    key: "ten-hours",
    name: "10 Hours Club",
    description: "Log 10 hours of study time.",
    isUnlocked: (metrics) => metrics.totalStudyHours >= 10,
  },
  {
    key: "fifty-hours",
    name: "50 Hours Club",
    description: "Reach 50 total study hours.",
    isUnlocked: (metrics) => metrics.totalStudyHours >= 50,
  },
  {
    key: "hundred-hours",
    name: "100 Hours Master",
    description: "Complete 100 hours of study.",
    isUnlocked: (metrics) => metrics.totalStudyHours >= 100,
  },
  {
    key: "streak-3",
    name: "3 Day Streak",
    description: "Study 3 days in a row.",
    isUnlocked: (metrics) => metrics.bestStreakDays >= 3,
  },
  {
    key: "streak-7",
    name: "7 Day Streak",
    description: "Maintain a 7 day study streak.",
    isUnlocked: (metrics) => metrics.bestStreakDays >= 7,
  },
  {
    key: "streak-30",
    name: "30 Day Streak",
    description: "Keep a 30 day study streak.",
    isUnlocked: (metrics) => metrics.bestStreakDays >= 30,
  },
  {
    key: "team-player",
    name: "Team Player",
    description: "Join 10 study rooms.",
    isUnlocked: (metrics) => metrics.roomsJoinedCount >= 10,
  },
  {
    key: "community-learner",
    name: "Community Learner",
    description: "Study with 20 unique users.",
    isUnlocked: (metrics) => metrics.uniqueUsersStudiedWithCount >= 20,
  },
  {
    key: "deep-focus",
    name: "Deep Focus",
    description: "Complete a 2 hour session.",
    isUnlocked: (metrics) => metrics.longestSessionMinutes >= 120,
  },
  {
    key: "focus-master",
    name: "Focus Master",
    description: "Complete 10 pomodoro sessions.",
    isUnlocked: (metrics) => metrics.pomodoroCount >= 10,
  },
];

const mergeAchievements = (existingAchievements, metrics) => {
  const existingMap = new Map((existingAchievements || []).map((item) => [item.key, item.unlockedAt]));
  const now = new Date();
  const results = achievementDefinitions.map((def) => {
    const unlocked = def.isUnlocked(metrics);
    const unlockedAt = existingMap.get(def.key) || (unlocked ? now : null);
    return {
      key: def.key,
      name: def.name,
      description: def.description,
      unlocked,
      unlockedAt,
    };
  });

  const newlyUnlocked = results.filter((item) => item.unlocked && !existingMap.has(item.key));
  return { achievements: results, newlyUnlocked };
};

const buildDashboard = async ({ userId, goals = { weeklyHours: 0, monthlyHours: 0 } }) => {
  const rooms = await Room.find({ members: userId }).select("name topic members").lean();
  const participants = await SessionParticipant.find({ userId }).lean();
  const sessionIds = Array.from(new Set(participants.map((p) => p.sessionId.toString())));
  const sessions = await Session.find({ _id: { $in: sessionIds } }).populate("room", "name topic").lean();
  const sessionMap = new Map(sessions.map((session) => [session._id.toString(), session]));

  const dayTotals = new Map();
  const daySessions = new Map();
  const hourTotals = new Map();
  const weekdayTotals = new Map();
  const topicTotals = new Map();
  const sessionHistory = [];
  const participatedSessionIds = new Set();
  const sessionDurations = [];

  let totalMinutes = 0;
  let sessionsCompleted = 0;
  let longestSessionMinutes = 0;
  let pomodoroCount = 0;

  const now = new Date();

  for (const participant of participants) {
    const session = sessionMap.get(participant.sessionId.toString());
    if (!session) continue;

    const segments = getSegmentsForParticipant(session, participant, now);
    let sessionMinutes = 0;

    segments.forEach(({ start, end }) => {
      const minutes = Math.max(0, (end - start) / 60000);
      sessionMinutes += minutes;
      addDurationByDay(dayTotals, start, end);
      addSessionsByDay(daySessions, start, end, session._id.toString());
      addDurationByHour(hourTotals, start, end);
      addDurationByWeekday(weekdayTotals, start, end);
    });

    if (sessionMinutes <= 0) continue;

    participatedSessionIds.add(session._id.toString());
    totalMinutes += sessionMinutes;
    sessionDurations.push(sessionMinutes);

    if (session.status === "ended") {
      sessionsCompleted += 1;
    }

    if (sessionMinutes > longestSessionMinutes) {
      longestSessionMinutes = sessionMinutes;
    }

    if (isPomodoroSession(session, sessionMinutes)) {
      pomodoroCount += 1;
    }

    const topic = session.room?.topic || "General";
    topicTotals.set(topic, (topicTotals.get(topic) || 0) + sessionMinutes);

    const sessionDurationMinutes = Math.round(computeSessionElapsedMs(session, now) / 60000);
    sessionHistory.push({
      sessionId: session._id.toString(),
      roomId: session.room?._id?.toString() || session.room?.toString(),
      roomName: session.room?.name || "Unknown Room",
      topic,
      date: session.startedAt,
      sessionDurationMinutes,
      participationMinutes: Math.round(sessionMinutes),
    });
  }

  const sessionParticipantSummary = participatedSessionIds.size
    ? await SessionParticipant.find({ sessionId: { $in: Array.from(participatedSessionIds) } })
        .select("sessionId userId")
        .lean()
    : [];

  const participantsBySession = new Map();
  const uniqueUsersStudiedWith = new Set();

  sessionParticipantSummary.forEach((entry) => {
    const sessionId = entry.sessionId.toString();
    if (!participantsBySession.has(sessionId)) {
      participantsBySession.set(sessionId, new Set());
    }
    const set = participantsBySession.get(sessionId);
    set.add(entry.userId.toString());

    if (entry.userId.toString() !== userId.toString()) {
      uniqueUsersStudiedWith.add(entry.userId.toString());
    }
  });

  sessionHistory.forEach((item) => {
    const sessionParticipants = participantsBySession.get(item.sessionId);
    item.participantsCount = sessionParticipants ? sessionParticipants.size : 1;
  });

  sessionHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

  const dayKeys = new Set(Array.from(dayTotals.entries()).filter(([, minutes]) => minutes > 0).map(([key]) => key));
  const { current: currentStreakDays, best: bestStreakDays } = buildStreaks(dayKeys);

  const dailyTotalsArray = Array.from(dayTotals.entries()).map(([date, minutes]) => ({
    date,
    minutes: Math.round(minutes),
  }));

  dailyTotalsArray.sort((a, b) => new Date(a.date) - new Date(b.date));

  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, idx) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - idx));
    const key = toDayKey(date);
    return {
      date: key,
      minutes: Math.round(dayTotals.get(key) || 0),
    };
  });

  const weeklyMinutes = last7Days.reduce((sum, item) => sum + item.minutes, 0);
  const weeklyStudyDays = last7Days.filter((item) => item.minutes > 0).length;
  const avgSessionMinutes = sessionDurations.length ? totalMinutes / sessionDurations.length : 0;

  const summary = {
    totalStudyHours: Math.round((totalMinutes / 60) * 10) / 10,
    sessionsCompleted,
    currentStreakDays,
    productivityScore: calculateProductivityScore({
      weeklyMinutes,
      weeklyStudyDays,
      avgSessionMinutes,
    }),
  };

  const { start: thisWeekStart, end: thisWeekEnd } = getWeekRange(today, 0);
  const { start: lastWeekStart, end: lastWeekEnd } = getWeekRange(today, -7);

  const rangeSumMinutes = (start, end) => {
    let total = 0;
    for (const [dateKey, minutes] of dayTotals.entries()) {
      const date = new Date(dateKey);
      if (date >= start && date < end) {
        total += minutes;
      }
    }
    return total;
  };

  const thisWeekMinutes = rangeSumMinutes(thisWeekStart, thisWeekEnd);
  const lastWeekMinutes = rangeSumMinutes(lastWeekStart, lastWeekEnd);
  const weeklyImprovementPct = Math.round(((thisWeekMinutes - lastWeekMinutes) / Math.max(1, lastWeekMinutes)) * 100);

  const { start: monthStart, end: monthEnd } = getMonthlyRange(today);
  const monthlyMinutes = rangeSumMinutes(monthStart, monthEnd);

  const dailyHeatmap = Array.from({ length: 365 }, (_, idx) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (364 - idx));
    const key = toDayKey(date);
    return {
      date: key,
      minutes: Math.round(dayTotals.get(key) || 0),
      sessions: daySessions.get(key) ? daySessions.get(key).size : 0,
    };
  });

  const mostActiveDay = dailyTotalsArray.reduce(
    (max, item) => (item.minutes > (max?.minutes || 0) ? item : max),
    null
  );

  const mostProductiveHourEntry = Array.from(hourTotals.entries()).reduce(
    (max, item) => (item[1] > (max?.[1] || 0) ? item : max),
    null
  );

  const mostProductiveDayEntry = Array.from(weekdayTotals.entries()).reduce(
    (max, item) => (item[1] > (max?.[1] || 0) ? item : max),
    null
  );

  const weekdayLabel = (index) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][index] || "";

  const topicDistribution = Array.from(topicTotals.entries())
    .map(([topic, minutes]) => ({ topic, minutes: Math.round(minutes) }))
    .sort((a, b) => b.minutes - a.minutes);

  const mostStudiedTopic = topicDistribution[0]?.topic || "General";

  const personalRecords = {
    longestSessionMinutes: Math.round(longestSessionMinutes),
    bestStreakDays,
    mostActiveDay: mostActiveDay ? mostActiveDay.date : null,
    mostStudiedTopic,
    totalRoomsJoined: rooms.length,
  };

  const insights = {
    mostProductiveHour: mostProductiveHourEntry ? `${String(mostProductiveHourEntry[0]).padStart(2, "0")}:00` : null,
    mostProductiveDay: mostProductiveDayEntry ? weekdayLabel(mostProductiveDayEntry[0]) : null,
    averageSessionMinutes: Math.round(avgSessionMinutes),
    weeklyImprovementPct,
    consistencyScore: Math.round((weeklyStudyDays / 7) * 100),
  };

  const goalsProgress = {
    weekly: {
      targetHours: goals.weeklyHours || 0,
      completedHours: Math.round((thisWeekMinutes / 60) * 10) / 10,
      progressPct: goals.weeklyHours ? Math.min(100, Math.round((thisWeekMinutes / 60 / goals.weeklyHours) * 100)) : 0,
    },
    monthly: {
      targetHours: goals.monthlyHours || 0,
      completedHours: Math.round((monthlyMinutes / 60) * 10) / 10,
      progressPct: goals.monthlyHours ? Math.min(100, Math.round((monthlyMinutes / 60 / goals.monthlyHours) * 100)) : 0,
    },
  };

  return {
    summary,
    weekly: {
      days: last7Days,
      totalMinutes: Math.round(weeklyMinutes),
      averageSessionMinutes: Math.round(avgSessionMinutes),
    },
    heatmap: {
      days: dailyHeatmap,
      stats: {
        totalStudyHours: summary.totalStudyHours,
        currentStreakDays,
        longestStreakDays: bestStreakDays,
        activeDays: dayKeys.size,
      },
    },
    goals: goalsProgress,
    topicAnalytics: {
      distribution: topicDistribution,
      mostStudiedTopic,
      timeByTopic: topicDistribution,
    },
    personalRecords,
    sessionHistory,
    insights,
    metrics: {
      totalStudyMinutes: Math.round(totalMinutes),
      totalStudyHours: Math.round((totalMinutes / 60) * 10) / 10,
      sessionsCompleted,
      currentStreakDays,
      bestStreakDays,
      roomsJoinedCount: rooms.length,
      uniqueUsersStudiedWithCount: uniqueUsersStudiedWith.size,
      longestSessionMinutes: Math.round(longestSessionMinutes),
      pomodoroCount,
    },
  };
};

module.exports = {
  buildDashboard,
  mergeAchievements,
  calculateLevel,
};
