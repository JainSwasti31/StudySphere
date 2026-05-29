const PersonalRecords = ({ records }) => {
  if (!records) return null;

  const items = [
    { label: "Longest session", value: `${records.longestSessionMinutes || 0} mins` },
    { label: "Best study streak", value: `${records.bestStreakDays || 0} days` },
    { label: "Most active day", value: records.mostActiveDay || "-" },
    { label: "Most studied topic", value: records.mostStudiedTopic || "General" },
    { label: "Total rooms joined", value: records.totalRoomsJoined || 0 },
  ];

  return (
    <section className="dashboard-card records-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Personal Records</p>
          <h2>Highlights from your history</h2>
        </div>
      </div>

      <div className="records-grid">
        {items.map((item) => (
          <div key={item.label} className="record-item">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PersonalRecords;
