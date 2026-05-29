import { useEffect, useState } from "react";

const GoalTracker = ({ goals, onSave }) => {
  const [form, setForm] = useState({ weeklyHours: "", monthlyHours: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!goals) return;
    setForm({
      weeklyHours: goals.weekly?.targetHours?.toString?.() || "0",
      monthlyHours: goals.monthly?.targetHours?.toString?.() || "0",
    });
  }, [goals]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    await onSave({
      weeklyHours: Number(form.weeklyHours || 0),
      monthlyHours: Number(form.monthlyHours || 0),
    });
    setSaving(false);
  };

  return (
    <section className="dashboard-card goals-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Goals</p>
          <h2>Personal study targets</h2>
        </div>
      </div>

      <div className="goal-grid">
        <div className="goal-item">
          <div className="goal-meta">
            <span>Weekly goal</span>
            <strong>{goals?.weekly?.completedHours || 0} / {goals?.weekly?.targetHours || 0} hrs</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${goals?.weekly?.progressPct || 0}%` }} />
          </div>
        </div>
        <div className="goal-item">
          <div className="goal-meta">
            <span>Monthly goal</span>
            <strong>{goals?.monthly?.completedHours || 0} / {goals?.monthly?.targetHours || 0} hrs</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${goals?.monthly?.progressPct || 0}%` }} />
          </div>
        </div>
      </div>

      <form className="goal-form" onSubmit={handleSubmit}>
        <label>
          Weekly target (hours)
          <input
            type="number"
            min="0"
            step="1"
            value={form.weeklyHours}
            onChange={(event) => setForm((current) => ({ ...current, weeklyHours: event.target.value }))}
          />
        </label>
        <label>
          Monthly target (hours)
          <input
            type="number"
            min="0"
            step="1"
            value={form.monthlyHours}
            onChange={(event) => setForm((current) => ({ ...current, monthlyHours: event.target.value }))}
          />
        </label>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Saving..." : "Update goals"}
        </button>
      </form>
    </section>
  );
};

export default GoalTracker;
