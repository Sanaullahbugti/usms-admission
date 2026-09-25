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

export type DocumentStatus = "MISSING" | "UPLOADED" | "VERIFIED";

export type ReviewAction = "CHANGE_REQUESTED" | "APPROVED" | "REJECTED" | "COMMENT";

/** What the officer pinned a change request to (GitHub-style review comment). */
export type ChangeTargetKind = "document" | "education" | "profile" | "challan" | "other";

export interface ChangeRequestItem {
  id: string;
  targetKind: ChangeTargetKind;
  /** Document id or stable field key such as `hsc_marks` / `fatherName`. */
  targetKey: string;
  targetLabel: string;
  message: string;
}

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

export interface EducationRecord {
  level: "SSC" | "HSC";
  group: string;
  board: string;
  year: string;
  obtainedMarks: string;
  totalMarks: string;
  rollNumber?: string;
}

export interface ApplicationDocument {
  id: string;
  title: string;
  fileName: string;
  sizeLabel: string;
  status: DocumentStatus;
  summary?: string;
  /** Public URL under /mock-docs for local review previews */
  url?: string;
  kind?: "pdf" | "image" | "svg";
}

export interface ApplicationReviewNote {
  id: string;
  action: ReviewAction;
  message: string;
  createdAt: string;
  reviewerLabel: string;
  /** Pinned comments when action is CHANGE_REQUESTED. */
  items?: ChangeRequestItem[];
}

export interface ApplicationFile extends ApplicationSummary {
  fatherName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  postalAddress: string;
  fatherOccupation: string;
  householdIncome: string;
  emergencyContact: string;
  emergencyPhone: string;
  education: EducationRecord[];
  documents: ApplicationDocument[];
  reviews: ApplicationReviewNote[];
  challan: { bank: string; slipNo: string; amountLabel: string; paidOn: string };
}

export interface ChangeRequestNotice {
  /** Wizard step hint derived from the first pinned item. */
  section: string;
  /** Short summary for banners. */
  message: string;
  /** Individual officer comments, one per document or field. */
  items: ChangeRequestItem[];
}

export interface ApplicantDashboardData {
  applicantName: string;
  fatherName?: string;
  cnicBform?: string;
  email?: string;
  applicationNo: string;
  admissionCycle: string;
  status: ApplicationStatus;
  completionPercentage: number;
  completedSections: string[];
  pendingSections: string[];
  changeRequest?: ChangeRequestNotice;
}

export interface ProgramOption {
  id: string;
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

export interface VcBriefingCheck {
  title: string;
  detail: string;
}

export interface VcQuotaShare {
  label: string;
  percent: number;
  seats: string;
  note: string;
  tone: "navy" | "crimson";
}

export interface VcDashboardData {
  cycleName: string;
  phase: string;
  ordinance: string;
  sessionLabel: string;
  demandYield: { applications: number; seats: number; capacityPercent: number };
  eligiblePool: { qualified: number; ratePercent: number };
  feeRealization: { amountLabel: string; clearedPercent: number; note: string };
  topMeritCutoff: { percent: string; program: string };
  diversity: { femaleShare: string; urban: string; rural: string };
  checks: VcBriefingCheck[];
  quotas: VcQuotaShare[];
  programs: VcProgramDemand[];
}
