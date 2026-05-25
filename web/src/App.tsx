import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./modules/auth/AuthContext";
import { CampusProtectedRoute } from "./modules/campus/CampusProtectedRoute";
import { getCampusByCode } from "./modules/campus/catalog";
import { LoginPage } from "./pages/LoginPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { StudentDashboardPage } from "./pages/StudentDashboardPage";
import { StudentClearancePage } from "./pages/StudentClearancePage";
import { StudentFinancePage } from "./pages/StudentFinancePage";
import { StudentHelpPage } from "./pages/StudentHelpPage";
import { StudentSettingsPage } from "./pages/StudentSettingsPage";
import { StaffDashboardPage } from "./pages/StaffDashboardPage";
import { FinanceDashboardPage } from "./pages/FinanceDashboardPage";
import { FinanceQueuePage } from "./pages/FinanceQueuePage";
import { FinanceLiabilityPage } from "./pages/FinanceLiabilityPage";
import { FinanceInquiriesPage } from "./pages/FinanceInquiriesPage";
import { RegistrarDashboardPage } from "./pages/RegistrarDashboardPage";
import { RegistrarQueuePage } from "./pages/RegistrarQueuePage";
import { RegistrarStatisticsPage } from "./pages/RegistrarStatisticsPage";
import { RegistrarAnalyticsPage } from "./pages/RegistrarAnalyticsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { CampusLandingPage } from "./pages/CampusLandingPage";
import { CampusMismatchPage } from "./pages/CampusMismatchPage";
import { ClearanceCertificatePage } from "./pages/ClearanceCertificatePage";
import { MessagingPage } from "./pages/MessagingPage";
import { StaffRecordLiabilityPage } from "./pages/StaffRecordLiabilityPage";

function HomeRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "SYSTEM_ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  const mappedCampus = getCampusByCode(user.campusId);

  if (!mappedCampus) {
    return <Navigate to="/campuses" replace />;
  }

  if (user.role === "STUDENT") {
    return <Navigate to={`/campus/${mappedCampus.slug}/student`} replace />;
  }

  if (user.role === "FINANCE_OFFICER") {
    return <Navigate to={`/campus/${mappedCampus.slug}/finance`} replace />;
  }

  if (user.role === "MAIN_REGISTRAR") {
    return <Navigate to={`/campus/${mappedCampus.slug}/registrar`} replace />;
  }

  return <Navigate to={`/campus/${mappedCampus.slug}/staff`} replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/campuses" element={<CampusLandingPage />} />
      <Route path="/campus/:campusSlug/mismatch" element={<CampusMismatchPage />} />

      {/* ── Student routes ── */}
      <Route
        path="/campus/:campusSlug/student"
        element={
          <CampusProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentDashboardPage />
          </CampusProtectedRoute>
        }
      />
      <Route
        path="/campus/:campusSlug/student/status"
        element={
          <CampusProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentClearancePage />
          </CampusProtectedRoute>
        }
      />
      <Route
        path="/campus/:campusSlug/student/finance"
        element={
          <CampusProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentFinancePage />
          </CampusProtectedRoute>
        }
      />
      <Route
        path="/campus/:campusSlug/student/help"
        element={
          <CampusProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentHelpPage />
          </CampusProtectedRoute>
        }
      />
      <Route
        path="/campus/:campusSlug/student/settings"
        element={
          <CampusProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentSettingsPage />
          </CampusProtectedRoute>
        }
      />
      <Route
        path="/campus/:campusSlug/student/certificate/:requestId"
        element={
          <CampusProtectedRoute allowedRoles={["STUDENT"]}>
            <ClearanceCertificatePage />
          </CampusProtectedRoute>
        }
      />

      {/* ── Staff routes ── */}
      <Route
        path="/campus/:campusSlug/staff"
        element={
          <CampusProtectedRoute
            allowedRoles={["LIBRARIAN", "PROCTOR", "CAFE_STAFF", "DEPARTMENT_HEAD", "STUDENT_DEAN"]}
          >
            <StaffDashboardPage />
          </CampusProtectedRoute>
        }
      />

      {/* ── Finance routes ── */}
      <Route
        path="/campus/:campusSlug/finance"
        element={
          <CampusProtectedRoute allowedRoles={["FINANCE_OFFICER"]}>
            <FinanceDashboardPage />
          </CampusProtectedRoute>
        }
      />
      <Route
        path="/campus/:campusSlug/finance/queue"
        element={
          <CampusProtectedRoute allowedRoles={["FINANCE_OFFICER"]}>
            <FinanceQueuePage />
          </CampusProtectedRoute>
        }
      />
      <Route
        path="/campus/:campusSlug/finance/liabilities"
        element={
          <CampusProtectedRoute allowedRoles={["FINANCE_OFFICER"]}>
            <FinanceLiabilityPage />
          </CampusProtectedRoute>
        }
      />
      <Route
        path="/campus/:campusSlug/finance/inquiries"
        element={
          <CampusProtectedRoute allowedRoles={["FINANCE_OFFICER"]}>
            <FinanceInquiriesPage />
          </CampusProtectedRoute>
        }
      />

      {/* ── Registrar routes ── */}
      <Route
        path="/campus/:campusSlug/registrar"
        element={
          <CampusProtectedRoute allowedRoles={["MAIN_REGISTRAR"]}>
            <RegistrarDashboardPage />
          </CampusProtectedRoute>
        }
      />
      <Route
        path="/campus/:campusSlug/registrar/queue"
        element={
          <CampusProtectedRoute allowedRoles={["MAIN_REGISTRAR"]}>
            <RegistrarQueuePage />
          </CampusProtectedRoute>
        }
      />
      <Route
        path="/campus/:campusSlug/registrar/statistics"
        element={
          <CampusProtectedRoute allowedRoles={["MAIN_REGISTRAR"]}>
            <RegistrarStatisticsPage />
          </CampusProtectedRoute>
        }
      />
      <Route
        path="/campus/:campusSlug/registrar/analytics"
        element={
          <CampusProtectedRoute allowedRoles={["MAIN_REGISTRAR"]}>
            <RegistrarAnalyticsPage />
          </CampusProtectedRoute>
        }
      />

      {/* ── Staff: Record Liability page ── */}
      <Route
        path="/campus/:campusSlug/staff/record-liability"
        element={
          <CampusProtectedRoute allowedRoles={["LIBRARIAN", "PROCTOR", "CAFE_STAFF", "DEPARTMENT_HEAD", "STUDENT_DEAN"]}>
            <StaffRecordLiabilityPage />
          </CampusProtectedRoute>
        }
      />

      {/* ── Shared Messages route ── */}
      <Route
        path="/campus/:campusSlug/messages"
        element={
          <CampusProtectedRoute allowedRoles={["LIBRARIAN", "PROCTOR", "CAFE_STAFF", "DEPARTMENT_HEAD", "STUDENT_DEAN", "FINANCE_OFFICER", "MAIN_REGISTRAR", "SYSTEM_ADMIN"]}>
            <MessagingPage />
          </CampusProtectedRoute>
        }
      />

      {/* ── Admin ── */}
      <Route
        path="/admin"
        element={
          loading ? (
            <div className="screen-center">Loading session…</div>
          ) : user?.role === "SYSTEM_ADMIN" ? (
            <AdminDashboardPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
