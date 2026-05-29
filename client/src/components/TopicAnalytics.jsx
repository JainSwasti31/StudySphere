import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const TopicAnalytics = ({ topicAnalytics }) => {
  if (!topicAnalytics) return null;

  const data = (topicAnalytics.distribution || []).map((item) => ({
    topic: item.topic,
    hours: Math.round((item.minutes / 60) * 10) / 10,
  }));

  return (
    <section className="dashboard-card topic-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Topics</p>
          <h2>Study focus distribution</h2>
        </div>
        <div className="card-meta">
          <span>Top topic</span>
          <strong>{topicAnalytics.mostStudiedTopic || "General"}</strong>
        </div>
      </div>

      <div className="chart-shell">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 10, right: 24, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="topic" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" tickFormatter={(value) => `${value}h`} />
            <Tooltip
              contentStyle={{
                background: "rgba(8, 15, 27, 0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
              }}
              formatter={(value) => [`${value} hrs`, "Hours"]}
            />
            <Bar dataKey="hours" fill="#5eead4" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default TopicAnalytics;
