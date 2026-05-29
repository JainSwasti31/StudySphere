const XpLevelCard = ({ xp }) => {
  if (!xp) return null;

  return (
    <section className="dashboard-card xp-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">XP & Level</p>
          <h2>Level {xp.level}</h2>
        </div>
        <div className="card-meta">
          <span>Total XP</span>
          <strong>{xp.totalXp}</strong>
          <span>Next level</span>
          <strong>{xp.xpToNextLevel} XP</strong>
        </div>
      </div>

      <div className="progress-track xp-track">
        <div className="progress-fill" style={{ width: `${xp.progressPct}%` }} />
      </div>
      <p className="subcopy">{xp.progressPct}% to the next level</p>
    </section>
  );
};

export default XpLevelCard;
