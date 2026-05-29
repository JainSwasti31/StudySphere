import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const PublicRoute = () => {
  const hydrated = useAuthStore((state) => state.hydrated);
  const token = useAuthStore((state) => state.token);

  if (!hydrated) {
    return (
      <div className="screen-center">
        <div className="status-card">Loading session...</div>
      </div>
    );
  }

  if (token) {
    return <Navigate to="/rooms" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;