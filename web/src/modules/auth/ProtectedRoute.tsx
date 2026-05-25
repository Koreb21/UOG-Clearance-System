import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { UserRole } from "../../types";
import type { ReactNode } from "react";

type ProtectedRouteProps = {
  allowedRoles: UserRole[];
  children: ReactNode;
};

export function ProtectedRoute({
  allowedRoles,
  children
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="screen-center">Loading portal...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
