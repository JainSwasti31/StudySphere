import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const formatDay = (dateKey) => {
  const date = new Date(dateKey);
  return date.toLocaleDateString([], { weekday: "short" });
};

const WeeklyStudyChart = ({ weekly }) => {
  if (!weekly) return null;

  const data = (weekly.days || []).map((day) => ({
    date: day.date,
    hours: Math.round((day.minutes / 60) * 10) / 10,
  }));

  return (
    <section className="dashboard-card chart-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Weekly Study</p>
          <h2>Daily study hours</h2>
        </div>
        <div className="card-meta">
          <span>Weekly total</span>
          <strong>{Math.round((weekly.totalMinutes / 60) * 10) / 10} hrs</strong>
          <span>Avg session</span>
          <strong>{weekly.averageSessionMinutes || 0} mins</strong>
        </div>
      </div>

      <div className="chart-shell">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 10, right: 24, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5eead4" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#5eead4" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDay} stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" tickFormatter={(value) => `${value}h`} />
            <Tooltip
              contentStyle={{
                background: "rgba(8, 15, 27, 0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
              }}
              formatter={(value) => [`${value} hrs`, "Hours"]}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Area type="monotone" dataKey="hours" stroke="#5eead4" strokeWidth={2} fill="url(#weeklyFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default WeeklyStudyChart;
