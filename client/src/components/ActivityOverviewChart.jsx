import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ActivityOverviewChart = ({ weekly }) => {
  if (!weekly) return null;

  const data = weekly.days.map((day) => ({
    date: day.date,
    hours: Math.round((day.minutes / 60) * 10) / 10,
  }));

  return (
    <section className="dashboard-card chart-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Activity overview</p>
          <h2>Weekly study rhythm</h2>
        </div>
      </div>
      <div className="chart-shell">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 10, right: 24, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" tickFormatter={(value) => `${value}h`} />
            <Tooltip
              contentStyle={{
                background: "rgba(8, 15, 27, 0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
              }}
              formatter={(value) => [`${value} hrs`, "Hours"]}
            />
            <Line type="monotone" dataKey="hours" stroke="#5eead4" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default ActivityOverviewChart;
