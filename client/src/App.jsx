import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getCurrentUser } from "./api/authApi";
import AppShell from "./components/AppShell";
import AnalyticsPage from "./pages/AnalyticsPage";
import HomePage from "./pages/HomePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RoomPage from "./pages/RoomPage";
import RoomsPage from "./pages/RoomsPage";
import RegisterPage from "./pages/RegisterPage";
import SessionsPage from "./pages/SessionsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { useAuthStore } from "./store/authStore";

const App = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [bootstrapping, setBootstrapping] = useState(false);

  useEffect(() => {
    const syncCurrentUser = async () => {
      if (!token || user || !hydrated) {
        return;
      }

      setBootstrapping(true);

      try {
        const data = await getCurrentUser();
        setAuth({ user: data.user, token });
      } catch (error) {
        clearAuth();
      } finally {
        setBootstrapping(false);
      }
    };

    syncCurrentUser();
  }, [token, user, hydrated, setAuth, clearAuth]);

  if (bootstrapping) {
    return (
      <div className="screen-center">
        <div className="status-card">Restoring your session...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>          <Route element={<AppShell />}>
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/rooms/:roomId" element={<RoomPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route
          path="/"
          element={token ? <Navigate to="/rooms" replace /> : <HomePage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;