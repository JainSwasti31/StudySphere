import { useEffect, useState } from "react";
import AchievementGrid from "../components/AchievementGrid";
import DashboardSummaryCards from "../components/DashboardSummaryCards";
import GoalTracker from "../components/GoalTracker";
import PersonalInsights from "../components/PersonalInsights";
import PersonalRecords from "../components/PersonalRecords";
import SessionHistory from "../components/SessionHistory";
import StudyHeatmap from "../components/StudyHeatmap";
import TopicAnalytics from "../components/TopicAnalytics";
import WeeklyStudyChart from "../components/WeeklyStudyChart";
import XpLevelCard from "../components/XpLevelCard";
import { getDashboard, updateGoals } from "../api/dashboardApi";

const AnalyticsPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getDashboard();
      setDashboard(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleGoalSave = async (payload) => {
    try {
      await updateGoals(payload);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update goals");
    }
  };

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Productivity hub</h1>
          <p className="subcopy">Track study performance, achievements, and long-term momentum.</p>
        </div>
      </header>

      {error ? <div className="dashboard-alert">{error}</div> : null}
      {loading ? <div className="dashboard-card">Loading analytics...</div> : null}

      {!loading && dashboard ? (
        <>
          <DashboardSummaryCards summary={dashboard.summary} />

          <div className="dashboard-grid two-col">
            <XpLevelCard xp={dashboard.xp} />
            <PersonalRecords records={dashboard.personalRecords} />
          </div>

          <WeeklyStudyChart weekly={dashboard.weekly} />
          <StudyHeatmap heatmap={dashboard.heatmap} />

          <div className="dashboard-grid two-col">
            <GoalTracker goals={dashboard.goals} onSave={handleGoalSave} />
            <TopicAnalytics topicAnalytics={dashboard.topicAnalytics} />
          </div>

          <PersonalInsights insights={dashboard.insights} />
          <AchievementGrid achievements={dashboard.achievements} />
          <SessionHistory sessions={dashboard.sessionHistory} />
        </>
      ) : null}
    </div>
  );
};

export default AnalyticsPage;
