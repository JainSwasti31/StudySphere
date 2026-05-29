// Badge icon map — keyed by achievement key
const BADGE_ICONS = {
  "first-session": "🎯",
  "10-hours": "⏱️",
  "50-hours": "🔥",
  "100-hours": "💎",
  "3-day-streak": "⚡",
  "7-day-streak": "🌟",
  "30-day-streak": "🏆",
  "team-player": "🤝",
  "community-learner": "🌍",
  "deep-focus": "🧠",
  "focus-master": "🎖️",
};

const BADGE_COLORS = {
  "first-session": "#f59e0b",
  "10-hours": "#06b6d4",
  "50-hours": "#f97316",
  "100-hours": "#8b5cf6",
  "3-day-streak": "#eab308",
  "7-day-streak": "#ec4899",
  "30-day-streak": "#f59e0b",
  "team-player": "#22c55e",
  "community-learner": "#3b82f6",
  "deep-focus": "#a855f7",
  "focus-master": "#ef4444",
};

const getIcon = (key) => BADGE_ICONS[key] || "🏅";
const getColor = (key) => BADGE_COLORS[key] || "#5eead4";

const AchievementGrid = ({ achievements = [] }) => {
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const pct = achievements.length > 0 ? Math.round((unlocked.length / achievements.length) * 100) : 0;

  return (
    <section className="ach-section">
      {/* Header + progress */}
      <div className="ach-header">
        <div>
          <p className="eyebrow">Achievements</p>
          <h2 className="ach-title">Badges</h2>
        </div>
        <div className="ach-summary">
          <span className="ach-summary__count">
            <span className="ach-summary__unlocked">{unlocked.length}</span>
            <span className="ach-summary__sep"> / </span>
            {achievements.length}
          </span>
          <span className="ach-summary__label">unlocked</span>
          <div className="ach-progress-track">
            <div className="ach-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="ach-summary__pct">{pct}%</span>
        </div>
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div className="ach-group">
          <p className="ach-group__label">
            <span className="ach-group__dot ach-group__dot--unlocked" />
            Unlocked · {unlocked.length}
          </p>
          <div className="ach-grid">
            {unlocked.map((a) => (
              <div key={a.key} className="ach-badge ach-badge--unlocked" style={{ "--badge-color": getColor(a.key) }}>
                <div className="ach-badge__icon-wrap">
                  <span className="ach-badge__icon">{getIcon(a.key)}</span>
                  <span className="ach-badge__check" aria-label="Unlocked">✓</span>
                </div>
                <div className="ach-badge__body">
                  <strong className="ach-badge__name">{a.name}</strong>
                  <p className="ach-badge__desc">{a.description}</p>
                  {a.unlockedAt && (
                    <span className="ach-badge__date">
                      Unlocked {new Date(a.unlockedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div className="ach-group">
          <p className="ach-group__label">
            <span className="ach-group__dot ach-group__dot--locked" />
            Locked · {locked.length}
          </p>
          <div className="ach-grid">
            {locked.map((a) => (
              <div key={a.key} className="ach-badge ach-badge--locked">
                <div className="ach-badge__icon-wrap">
                  <span className="ach-badge__icon ach-badge__icon--locked">{getIcon(a.key)}</span>
                  <span className="ach-badge__lock" aria-label="Locked">🔒</span>
                </div>
                <div className="ach-badge__body">
                  <strong className="ach-badge__name ach-badge__name--locked">{a.name}</strong>
                  <p className="ach-badge__desc">{a.description}</p>
                  <span className="ach-badge__locked-label">Not yet unlocked</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {achievements.length === 0 && (
        <p className="ach-empty">No achievements data available.</p>
      )}
    </section>
  );
};

export default AchievementGrid;
