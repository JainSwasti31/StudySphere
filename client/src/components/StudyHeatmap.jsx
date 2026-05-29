import { useMemo, useRef, useState } from "react";
import "../heatmap.css";

const DAY_LABELS = ["", "Mo", "", "We", "", "Fr", ""];

const levelFromMinutes = (minutes) => {
  if (!minutes) return 0;
  if (minutes <= 30) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 120) return 3;
  return 4;
};

const formatDuration = (minutes) => {
  const m = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h && mins) return `${h}h ${mins}m`;
  if (h) return `${h}h`;
  return `${mins}m`;
};

const getDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const TODAY = getDateKey(new Date());

// Build months array. Each month = { label, weeks[] }
// Each week = array of 7 day slots (null if outside month)
const buildMonths = (dayMap, rangeStart, rangeEnd) => {
  const months = [];

  // iterate month by month
  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);

  while (cursor <= rangeEnd) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const label = cursor.toLocaleDateString([], { month: "short" });

    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);

    // weeks: each week starts on Sunday
    const weeks = [];
    // start from the Sunday on or before the 1st
    const weekStart = new Date(firstOfMonth);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    while (weekStart <= lastOfMonth) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + d);

        // only include days that are within this month AND within the overall range
        if (day.getMonth() === month && day >= rangeStart && day <= rangeEnd) {
          const key = getDateKey(day);
          week.push(dayMap.get(key) || { date: key, minutes: 0, sessions: 0 });
        } else {
          week.push(null); // empty slot
        }
      }
      weeks.push(week);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    months.push({ label, key: `${year}-${month}`, weeks });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // filter out months where the first week has no in-range days (partial start month edge case)
  return months.filter((m) => m.weeks.flat().some((d) => d !== null));
};

const StudyHeatmap = ({ heatmap }) => {
  const [view, setView] = useState("year");
  const wrapRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const dayMap = useMemo(() => {
    const map = new Map();
    (heatmap?.days || []).forEach((d) => map.set(d.date, d));
    return map;
  }, [heatmap]);

  const { months, rangeStart, rangeEnd } = useMemo(() => {
    const today = new Date();
    let start;
    if (view === "month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      // Start from the 1st of the month, 12 months ago — gives exactly 12 full months
      start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    }
    return { months: buildMonths(dayMap, start, today), rangeStart: start, rangeEnd: today };
  }, [dayMap, view]);

  const totalSessions = useMemo(
    () => (heatmap?.days || []).reduce((s, d) => s + (d.sessions || 0), 0),
    [heatmap]
  );

  const handleHover = (e, day) => {
    if (!day || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setTooltip({ day, x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width });
  };

  const tipStyle = useMemo(() => {
    if (!tooltip) return { display: "none" };
    const TW = 180;
    let left = tooltip.x + 12;
    if (left + TW > tooltip.w) left = tooltip.x - TW - 12;
    let top = tooltip.y - 70;
    if (top < 0) top = tooltip.y + 20;
    return { left, top };
  }, [tooltip]);

  return (
    <section className="dashboard-card heatmap-card">
      <div className="hm-header">
        <div>
          <p className="eyebrow">Study Heatmap</p>
          <h2 className="hm-title">
            {totalSessions} session{totalSessions !== 1 ? "s" : ""} in the past {view === "year" ? "year" : "month"}
          </h2>
        </div>
        <div className="hm-header-right">
          <span className="hm-stat">Active days: <strong>{heatmap?.stats?.activeDays || 0}</strong></span>
          <span className="hm-stat">Max streak: <strong>{heatmap?.stats?.longestStreakDays || 0}</strong></span>
          <div className="hm-tabs">
            <button type="button" className={`hm-tab${view === "month" ? " hm-tab--active" : ""}`} onClick={() => setView("month")}>Month</button>
            <button type="button" className={`hm-tab${view === "year" ? " hm-tab--active" : ""}`} onClick={() => setView("year")}>Year</button>
          </div>
        </div>
      </div>

      <div className="hm-grid-wrap" ref={wrapRef}>
        {/* Month blocks */}
        <div className="hm-months-row">
          {months.map((month) => (
            <div key={month.key} className="hm-month-block">
              <div className="hm-month-label">{month.label}</div>
              <div className="hm-month-grid" style={{ gridTemplateColumns: `repeat(${month.weeks.length}, 10px)` }}>
                {month.weeks.map((week, wi) =>
                  week.map((day, di) => {
                    if (!day) {
                      return <span key={`${wi}-${di}`} className="hm-cell hm-cell--empty" style={{ gridColumn: wi + 1, gridRow: di + 1 }} />;
                    }
                    const level = levelFromMinutes(day.minutes);
                    const isToday = day.date === TODAY;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        className={`hm-cell hm-lv-${level}${isToday ? " hm-cell--today" : ""}`}
                        style={{ gridColumn: wi + 1, gridRow: di + 1 }}
                        onMouseEnter={(e) => handleHover(e, day)}
                        onMouseMove={(e) => handleHover(e, day)}
                        onMouseLeave={() => setTooltip(null)}
                        aria-label={`${day.date}: ${formatDuration(day.minutes)}`}
                      />
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        {tooltip && (
          <div className="hm-tip" style={tipStyle}>
            <strong>
              {new Date(tooltip.day.date + "T12:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              {tooltip.day.date === TODAY && <span className="hm-tip-today"> · Today</span>}
            </strong>
            <span>{tooltip.day.minutes ? formatDuration(tooltip.day.minutes) + " studied" : "No activity"}</span>
            <span>{tooltip.day.sessions || 0} session{tooltip.day.sessions !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      <div className="hm-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`hm-cell hm-lv-${l}`} />)}
        <span>More</span>
      </div>
    </section>
  );
};

export default StudyHeatmap;
