import { useEffect, useMemo, useState } from "react";
import { getLeaderboard } from "../api/leaderboardApi";
import { useAuthStore } from "../store/authStore";

const initials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
};

const MEDAL = ["🥇", "🥈", "🥉"];
const PERIOD_LABELS = { weekly: "Weekly", monthly: "Monthly", all: "All time" };

const LeaderboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const [period, setPeriod] = useState("all");
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getLeaderboard(period);
        setLeaders(data.leaders || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load leaderboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  const podium = useMemo(() => leaders.slice(0, 3), [leaders]);
  // reorder podium: 2nd, 1st, 3rd for visual height effect
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <div className="dashboard-shell">
      <header className="lb-header">
        <div>
          <p className="eyebrow">Community</p>
          <h1 className="lb-title">Leaderboard</h1>
          <p className="lb-subtitle">Celebrate top performers across the community.</p>
        </div>
        <div className="lb-period-tabs">
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`lb-period-tab${period === key ? " lb-period-tab--active" : ""}`}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {error ? <div className="dashboard-alert">{error}</div> : null}

      {/* Podium */}
      {!loading && podium.length > 0 && (
        <div className="lb-podium">
          {podiumOrder.map((entry) => {
            const rank = leaders.indexOf(entry);
            const isFirst = rank === 0;
            const isMe = entry.userId === (user?._id || user?.id);
            return (
              <div key={entry.userId} className={`lb-podium-slot lb-podium-slot--${rank + 1}${isMe ? " lb-podium-slot--me" : ""}`}>
                <div className="lb-podium-avatar">
                  {initials(entry.name)}
                  {isFirst && <span className="lb-podium-crown">👑</span>}
                </div>
                <span className="lb-podium-medal">{MEDAL[rank]}</span>
                <strong className="lb-podium-name">{isMe ? "You" : entry.name}</strong>
                <span className="lb-podium-hours">{entry.studyHours} hrs</span>
                <div className={`lb-podium-bar lb-podium-bar--${rank + 1}`} />
              </div>
            );
          })}
        </div>
      )}

      {/* Rankings table */}
      <section className="dashboard-card lb-table-card">
        <div className="lb-table-header">
          <p className="eyebrow">Rankings</p>
          <h2 className="lb-table-title">All contributors</h2>
        </div>

        {loading ? (
          <div className="lb-loading">
            <div className="lb-loading__spinner" />
            Loading...
          </div>
        ) : leaders.length === 0 ? (
          <div className="lb-empty">No data for this period yet.</div>
        ) : (
          <div className="lb-table">
            <div className="lb-table__head">
              <span>Rank</span>
              <span>User</span>
              <span>Study Hours</span>
              <span>Sessions</span>
              <span>Streak</span>
            </div>
            {leaders.map((entry, index) => {
              const isMe = entry.userId === (user?._id || user?.id);
              return (
                <div key={entry.userId} className={`lb-table__row${isMe ? " lb-table__row--me" : ""}${index < 3 ? ` lb-table__row--top${index + 1}` : ""}`}>
                  <span className="lb-table__rank">
                    {index < 3 ? MEDAL[index] : <span className="lb-rank-num">{index + 1}</span>}
                  </span>
                  <span className="lb-table__user">
                    <div className="lb-table__avatar">{initials(entry.name)}</div>
                    <span className="lb-table__name">{isMe ? `${entry.name} (You)` : entry.name}</span>
                  </span>
                  <span className="lb-table__stat">{entry.studyHours} hrs</span>
                  <span className="lb-table__stat">{entry.sessions ?? "—"}</span>
                  <span className="lb-table__stat">
                    {entry.streak ? `🔥 ${entry.streak}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default LeaderboardPage;
