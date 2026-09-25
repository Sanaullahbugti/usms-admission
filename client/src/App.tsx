import { Navigate, Route, Routes } from "react-router-dom";
import { RequirePermission } from "./auth/RequirePermission";
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

const staffPermissions = ["application:view", "user:manage", "role:manage", "payment:verify", "document:verify", "report:view", "audit:view"];

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

      <Route path="/dashboard" element={<RequireRole roles={["APPLICANT"]} loginPath="/login"><ApplicantLayout /></RequireRole>}>
        <Route index element={<ApplicantDashboard />} />
      </Route>
      <Route path="/application" element={<RequireRole roles={["APPLICANT"]} loginPath="/login"><ApplicantLayout /></RequireRole>}>
        <Route index element={<ApplicationWizard />} />
      </Route>

      <Route path="/admin" element={<RequirePermission permissions={staffPermissions}><AdminLayout /></RequirePermission>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<RequirePermission permissions={["application:view"]}><AdminDashboard /></RequirePermission>} />
        <Route path="applications" element={<RequirePermission permissions={["application:view"]}><ApplicationsPage /></RequirePermission>} />
        <Route path="applications/:id" element={<RequirePermission permissions={["application:view"]}><ApplicationDetails /></RequirePermission>} />
        <Route path="users" element={<RequirePermission permissions={["user:manage", "role:manage"]}><UsersPage /></RequirePermission>} />
      </Route>

      <Route path="/vc" element={<RequirePermission permissions={["vc:view"]}><VcLayout /></RequirePermission>}>
        <Route index element={<Navigate to="/vc/dashboard" replace />} />
        <Route path="dashboard" element={<VcDashboard />} />
      </Route>
      <Route path="*" element={<div className="not-found">Page not found</div>} />
    </Routes>
  );
}
