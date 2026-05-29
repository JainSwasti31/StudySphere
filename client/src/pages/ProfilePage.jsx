import { useEffect, useMemo, useState } from "react";
import ActivityOverviewChart from "../components/ActivityOverviewChart";
import AchievementGrid from "../components/AchievementGrid";
import PersonalRecords from "../components/PersonalRecords";
import { getDashboard } from "../api/dashboardApi";
import { useAuthStore } from "../store/authStore";
import "../profile.css";

const initials = (name) =>
  (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const StatCard = ({ label, value }) => (
  <div className="profile-stat-card">
    <span className="profile-stat-card__label">{label}</span>
    <strong className="profile-stat-card__value">{value}</strong>
  </div>
);

const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getDashboard();
        setDashboard(data);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const summary = dashboard?.summary || {};
  const xp = dashboard?.xp || {};
  const level = xp.level || 1;
  const totalXp = xp.totalXp || 0;
  const xpToNext = xp.xpToNextLevel || 100;
  const xpPct = Math.min(100, Math.round((totalXp / (totalXp + xpToNext)) * 100));

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="dashboard-shell">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>{user?.name || "Your profile"}</h1>
          <p className="subcopy">Personal stats, achievements, and study momentum.</p>
        </div>
      </header>

      {error ? <div className="dashboard-alert">{error}</div> : null}

      {/* Profile hero card */}
      <section className="profile-hero">
        <div className="profile-hero__left">
          <div className="profile-hero__avatar">
            {initials(user?.name || user?.email)}
          </div>
          <div className="profile-hero__info">
            <h2 className="profile-hero__name">{user?.name || "User"}</h2>
            <p className="profile-hero__email">{user?.email}</p>
            {joinDate && (
              <p className="profile-hero__joined">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                Joined {joinDate}
              </p>
            )}
          </div>
        </div>

        {/* XP / Level */}
        <div className="profile-hero__xp">
          <div className="profile-xp-badge">
            <span className="profile-xp-badge__level">Lv {level}</span>
          </div>
          <div className="profile-xp-info">
            <div className="profile-xp-info__row">
              <span className="profile-xp-info__label">Experience</span>
              <span className="profile-xp-info__val">{totalXp} XP</span>
            </div>
            <div className="profile-xp-track">
              <div className="profile-xp-fill" style={{ width: `${xpPct}%` }} />
            </div>
            <p className="profile-xp-info__hint">{xpToNext} XP to level {level + 1}</p>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <div className="profile-stats-row">
        <StatCard label="Total study hours" value={`${summary.totalStudyHours ?? 0} hrs`} />
        <StatCard label="Sessions completed" value={summary.sessionsCompleted ?? summary.totalSessions ?? 0} />
        <StatCard label="Current streak" value={`${summary.currentStreakDays ?? summary.currentStreak ?? 0} days`} />
        <StatCard label="Productivity score" value={`${summary.productivityScore ?? 0}%`} />
      </div>

      {loading ? (
        <div className="dashboard-card" style={{ color: "var(--muted)" }}>Loading analytics...</div>
      ) : null}

      {!loading && dashboard ? (
        <>
          <PersonalRecords records={dashboard.personalRecords} />
          <ActivityOverviewChart weekly={dashboard.weekly} />
          <AchievementGrid achievements={dashboard.achievements || []} />
        </>
      ) : null}
    </div>
  );
};

export default ProfilePage;
