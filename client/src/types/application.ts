export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGE_REQUESTED"
  | "RESUBMITTED"
  | "DOCUMENTS_VERIFIED"
  | "APPROVED"
  | "REJECTED";

export type PaymentStatus = "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED";

export interface ApplicationSummary {
  id: string;
  applicationNo: string;
  applicantName: string;
  cnic: string;
  mobile: string;
  program: string;
  district: string;
  hscPercentage: number;
  status: ApplicationStatus;
  paymentStatus: PaymentStatus;
  submittedAt: string;
}

export interface ApplicantDashboardData {
  applicantName: string;
  applicationNo: string;
  admissionCycle: string;
  status: ApplicationStatus;
  completionPercentage: number;
  completedSections: string[];
  pendingSections: string[];
}

export interface ProgramOption {
  code: string;
  name: string;
}

export interface VcProgramDemand {
  code: string;
  name: string;
  faculty: string;
  sanctionedSeats: number;
  candidates: number;
  demandRatio: string;
  projectedCutoff: string;
  fillPercent: number;
}

export interface VcDashboardData {
  cycleName: string;
  phase: string;
  demandYield: { applications: number; seats: number; capacityPercent: number };
  eligiblePool: { qualified: number; ratePercent: number };
  feeRealization: { amountLabel: string; clearedPercent: number };
  topMeritCutoff: { percent: string; program: string };
  diversity: { femaleShare: string; urban: string; rural: string };
  programs: VcProgramDemand[];
}
