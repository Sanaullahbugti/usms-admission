import { applicantDashboard, applications, programs, vcDashboard } from "../data/mockApplications";
import type { ApplicantDashboardData, ApplicationSummary, ProgramOption, VcDashboardData } from "../types/application";

const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

export const applicationService = {
  async getApplicantDashboard(): Promise<ApplicantDashboardData> {
    await delay();
    return applicantDashboard;
  },
  async listApplications(): Promise<ApplicationSummary[]> {
    await delay();
    return applications;
  },
  async getApplication(id: string): Promise<ApplicationSummary | null> {
    await delay();
    return applications.find((row) => row.id === id) ?? null;
  },
  async listPrograms(): Promise<ProgramOption[]> {
    await delay();
    return programs;
  },
  async getVcDashboard(): Promise<VcDashboardData> {
    await delay();
    return vcDashboard;
  },
};
