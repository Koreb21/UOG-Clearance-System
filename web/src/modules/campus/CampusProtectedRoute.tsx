import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getCampusByCode, getCampusBySlug } from "./catalog";
import type { UserRole } from "../../types";

type CampusProtectedRouteProps = {
  allowedRoles: UserRole[];
  children: ReactNode;
};

export function CampusProtectedRoute({
  allowedRoles,
  children
}: CampusProtectedRouteProps) {
  const { campusSlug } = useParams();
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="screen-center">Loading campus portal...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "SYSTEM_ADMIN") {
    return <>{children}</>;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const routeCampus = getCampusBySlug(campusSlug);
  const actualCampus = getCampusByCode(user.campusId);

  if (!routeCampus || !actualCampus || actualCampus.code !== routeCampus.code) {
    return <Navigate to={`/campus/${campusSlug}/mismatch`} replace />;
  }

  return <>{children}</>;
}
