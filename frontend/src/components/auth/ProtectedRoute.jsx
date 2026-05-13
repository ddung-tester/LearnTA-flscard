import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

function ProtectedRoute() {
  const location = useLocation();
  const { isAuthReady, isAuthenticated } = useAuth();

  if (!isAuthReady) {
    return (
      <div className="ui-empty-panel border-dashed">
        <p className="text-[var(--mau-chu-phu)]">Đang kiểm tra đăng nhập...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
