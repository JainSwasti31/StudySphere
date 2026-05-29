const DashboardSummaryCards = ({ summary }) => {
  if (!summary) return null;

  const cards = [
    { label: "Total Study Hours", value: `${summary.totalStudyHours || 0} hrs` },
    { label: "Sessions Completed", value: summary.sessionsCompleted || 0 },
    { label: "Current Study Streak", value: `${summary.currentStreakDays || 0} days` },
    { label: "Productivity Score", value: `${summary.productivityScore || 0}%` },
  ];

  return (
    <section className="dashboard-grid summary-grid">
      {cards.map((card) => (
        <article key={card.label} className="dashboard-card summary-card">
          <p className="eyebrow">{card.label}</p>
          <h2>{card.value}</h2>
        </article>
      ))}
    </section>
  );
};

export default DashboardSummaryCards;
