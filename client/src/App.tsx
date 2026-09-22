import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { ApplicantLayout } from "./components/ApplicantLayout";
import { AdminDashboard } from "./pages/AdminDashboard";
import { ApplicantDashboard } from "./pages/ApplicantDashboard";
import { ApplicationDetails } from "./pages/ApplicationDetails";
import { ApplicationsPage } from "./pages/ApplicationsPage";
export function App(){return <Routes><Route path="/" element={<Navigate to="/admission/dashboard" replace/>}/><Route path="/admission" element={<ApplicantLayout/>}><Route path="dashboard" element={<ApplicantDashboard/>}/></Route><Route path="/admin" element={<AdminLayout/>}><Route path="dashboard" element={<AdminDashboard/>}/><Route path="applications" element={<ApplicationsPage/>}/><Route path="applications/:id" element={<ApplicationDetails/>}/></Route><Route path="*" element={<div className="not-found">Page not found</div>}/></Routes>;}
