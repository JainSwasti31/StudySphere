const User = require("../models/User");
const { buildDashboard, mergeAchievements, calculateLevel } = require("../services/dashboardService");

const calculateXp = ({ sessionsCompleted, loginDatesCount, unlockedAchievementsCount }) =>
  sessionsCompleted * 10 + loginDatesCount * 5 + unlockedAchievementsCount * 20;

const getDashboard = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const dashboard = await buildDashboard({ userId: user._id, goals: user.goals || {} });
  const { achievements, newlyUnlocked } = mergeAchievements(user.achievements || [], dashboard.metrics);

  if (newlyUnlocked.length) {
    user.achievements = achievements
      .filter((item) => item.unlocked)
      .map((item) => ({ key: item.key, unlockedAt: item.unlockedAt }));
    await user.save();
  }

  const unlockedCount = achievements.filter((item) => item.unlocked).length;
  const totalXp = calculateXp({
    sessionsCompleted: dashboard.metrics.sessionsCompleted,
    loginDatesCount: (user.loginDates || []).length,
    unlockedAchievementsCount: unlockedCount,
  });
  const levelInfo = calculateLevel(totalXp);

  return res.status(200).json({
    ...dashboard,
    achievements,
    xp: {
      totalXp,
      level: levelInfo.level,
      progressPct: levelInfo.progressPct,
      nextLevelXp: levelInfo.nextLevelXp,
      currentLevelXp: levelInfo.currentLevelXp,
      xpToNextLevel: Math.max(0, levelInfo.nextLevelXp - totalXp),
    },
  });
};

const updateGoals = async (req, res) => {
  const { weeklyHours, monthlyHours } = req.body;

  if (weeklyHours !== undefined && weeklyHours < 0) {
    return res.status(400).json({ message: "Weekly goal must be positive" });
  }
  if (monthlyHours !== undefined && monthlyHours < 0) {
    return res.status(400).json({ message: "Monthly goal must be positive" });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.goals = {
    weeklyHours: weeklyHours !== undefined ? weeklyHours : user.goals?.weeklyHours || 0,
    monthlyHours: monthlyHours !== undefined ? monthlyHours : user.goals?.monthlyHours || 0,
  };

  await user.save();

  return res.status(200).json({ goals: user.goals });
};

module.exports = {
  getDashboard,
  updateGoals,
};
