import { Navigate, Route, Routes } from "react-router-dom";
import { RequireRole } from "./auth/RequireRole";
import { AdminLayout } from "./components/AdminLayout";
import { ApplicantLayout } from "./components/ApplicantLayout";
import { VcLayout } from "./components/VcLayout";
import { AdminDashboard } from "./pages/AdminDashboard";
import { ApplicantDashboard } from "./pages/ApplicantDashboard";
import { ApplicationDetails } from "./pages/ApplicationDetails";
import { ApplicationWizard } from "./pages/ApplicationWizard";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { LoginPage } from "./pages/LoginPage";
import { PublicApplyPage } from "./pages/PublicApplyPage";
import { UsersPage } from "./pages/UsersPage";
import { VcDashboard } from "./pages/VcDashboard";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/apply" replace />} />
      <Route path="/apply" element={<PublicApplyPage />} />
      <Route path="/login" element={<LoginPage audience="applicant" />} />
      <Route path="/admin/login" element={<LoginPage audience="admin" />} />

      <Route path="/admission" element={<Navigate to="/apply" replace />} />
      <Route path="/admission/apply" element={<Navigate to="/apply" replace />} />
      <Route path="/admission/dashboard" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/dashboard"
        element={
          <RequireRole roles={["APPLICANT", "SUPER_ADMIN"]} loginPath="/login">
            <ApplicantLayout />
          </RequireRole>
        }
      >
        <Route index element={<ApplicantDashboard />} />
      </Route>
      <Route
        path="/application"
        element={
          <RequireRole roles={["APPLICANT", "SUPER_ADMIN"]} loginPath="/login">
            <ApplicantLayout />
          </RequireRole>
        }
      >
        <Route index element={<ApplicationWizard />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireRole roles={["SUPER_ADMIN"]} loginPath="/admin/login">
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationDetails />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
      <Route
        path="/vc"
        element={
          <RequireRole roles={["VICE_CHANCELLOR", "SUPER_ADMIN"]} loginPath="/admin/login">
            <VcLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="/vc/dashboard" replace />} />
        <Route path="dashboard" element={<VcDashboard />} />
      </Route>
      <Route path="*" element={<div className="not-found">Page not found</div>} />
    </Routes>
  );
}
