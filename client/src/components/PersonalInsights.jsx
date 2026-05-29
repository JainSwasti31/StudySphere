const PersonalInsights = ({ insights }) => {
  if (!insights) return null;

  const items = [
    { label: "Most productive hour", value: insights.mostProductiveHour || "-" },
    { label: "Most productive day", value: insights.mostProductiveDay || "-" },
    { label: "Average session length", value: `${insights.averageSessionMinutes || 0} mins` },
    { label: "Weekly improvement", value: `${insights.weeklyImprovementPct || 0}%` },
    { label: "Consistency score", value: `${insights.consistencyScore || 0}%` },
  ];

  return (
    <section className="dashboard-card insights-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Insights</p>
          <h2>Personal study signals</h2>
        </div>
      </div>

      <div className="insights-grid">
        {items.map((item) => (
          <div key={item.label} className="insight-item">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PersonalInsights;
