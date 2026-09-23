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
import { UsersPage } from "./pages/UsersPage";
import { VcDashboard } from "./pages/VcDashboard";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admission/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admission" element={<ApplicantLayout />}>
        <Route path="dashboard" element={<ApplicantDashboard />} />
        <Route path="apply" element={<ApplicationWizard />} />
      </Route>
      <Route
        path="/admin"
        element={
          <RequireRole roles={["SUPER_ADMIN"]}>
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationDetails />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
      <Route
        path="/vc"
        element={
          <RequireRole roles={["VICE_CHANCELLOR", "SUPER_ADMIN"]}>
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
