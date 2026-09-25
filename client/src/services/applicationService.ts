import { api, ApiError } from "../lib/api";
import { applicantDashboard, programs, vcDashboard } from "../data/mockApplications";
import type {
  ApplicantDashboardData,
  ApplicationDocument,
  ApplicationFile,
  ApplicationReviewNote,
  ApplicationStatus,
  ApplicationSummary,
  ChangeRequestItem,
  DocumentStatus,
  EducationRecord,
  PaymentStatus,
  ProgramOption,
  ReviewAction,
  VcDashboardData,
} from "../types/application";

const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

const DOC_ORDER = ["SSC", "HSC", "CNIC", "DOMICILE", "PHOTO", "CHALLAN"] as const;

const DOC_TITLES: Record<string, string> = {
  SSC: "SSC / Matric certificate",
  HSC: "HSC / Intermediate mark sheet",
  CNIC: "CNIC / B-Form",
  DOMICILE: "Domicile certificate",
  PHOTO: "Passport photograph",
  CHALLAN: "Fee challan",
};

export type ApiEducationRow = {
  level: "SSC" | "HSC" | string;
  group: string | null;
  board: string | null;
  year: string | null;
  obtainedMarks: string | null;
  totalMarks: string | null;
  rollNumber: string | null;
  institutionType: string | null;
};

export type ApiMyApplication = {
  id: string;
  applicationNo: string | null;
  status: ApplicationStatus;
  paymentStatus?: string;
  submittedAt?: string | null;
  admissionCycle: { id: string; name: string };
  profile: {
    applicantName: string;
    fatherName: string;
    cnicBform: string | null;
    email: string | null;
    mobile: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    domicileDistrict: string | null;
    province: string | null;
    nationality: string | null;
    postalAddress: string | null;
    residentialAddress: string | null;
    fatherOccupation: string | null;
    householdIncome: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    hasSibling: boolean;
    siblingName: string | null;
    siblingRegNo: string | null;
  } | null;
  programChoices: Array<{
    preferenceOrder: number;
    programOfferingId: string;
    programOffering: { id: string; program: { code: string; name: string } };
  }>;
  education: ApiEducationRow[];
  documents: Array<{
    id: string;
    docType: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
    uploadedAt: string;
  }>;
  reviews: Array<{ id?: string; action: string; message: string | null; createdAt?: string; reviewerId?: string | null }>;
};

type ApiAdminSummary = {
  id: string;
  applicationNo: string;
  applicantName: string;
  cnic: string;
  mobile: string;
  district: string;
  program: string;
  hscPercentage: number;
  status: ApplicationStatus;
  paymentStatus: PaymentStatus;
  submittedAt: string;
};

type ApiAdminApplication = ApiMyApplication & {
  createdAt?: string;
};

export type DraftPayload = {
  mobile?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  domicileDistrict?: string | null;
  province?: string | null;
  nationality?: string | null;
  postalAddress?: string | null;
  residentialAddress?: string | null;
  fatherOccupation?: string | null;
  householdIncome?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  hasSibling?: boolean;
  siblingName?: string | null;
  siblingRegNo?: string | null;
  programOfferingIds?: string[];
  education?: Array<{
    level: "SSC" | "HSC";
    group?: string | null;
    board?: string | null;
    year?: string | null;
    obtainedMarks?: string | null;
    totalMarks?: string | null;
    rollNumber?: string | null;
    institutionType?: string | null;
  }>;
};

function apiBase() {
  return import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000/api" : "/api");
}

export function adminDocumentFileUrl(applicationId: string, docType: string) {
  return `${apiBase()}/v1/applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(docType)}/file`;
}

function sizeLabel(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function hscPercentage(obtained: string | null | undefined, total: string | null | undefined) {
  const got = Number(obtained);
  const max = Number(total);
  if (!Number.isFinite(got) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return Math.round((got / max) * 1000) / 10;
}

function mapDocStatus(status: string): DocumentStatus {
  if (status === "VERIFIED") return "VERIFIED";
  if (status === "UPLOADED" || status === "REJECTED") return "UPLOADED";
  return "MISSING";
}

function mapDocuments(app: ApiAdminApplication): ApplicationDocument[] {
  const byType = new Map((app.documents ?? []).map((doc) => [doc.docType.toUpperCase(), doc]));
  return DOC_ORDER.map((docType) => {
    const uploaded = byType.get(docType);
    if (!uploaded) {
      return {
        id: `${app.id}-${docType}-missing`,
        title: DOC_TITLES[docType] ?? docType,
        fileName: "",
        sizeLabel: "",
        status: "MISSING" as const,
      };
    }
    const mime = uploaded.mimeType.toLowerCase();
    const kind: ApplicationDocument["kind"] =
      mime.includes("pdf") ? "pdf" : mime.includes("svg") ? "svg" : "image";
    return {
      id: uploaded.id,
      title: DOC_TITLES[docType] ?? docType,
      fileName: uploaded.originalName,
      sizeLabel: sizeLabel(uploaded.sizeBytes),
      status: mapDocStatus(uploaded.status),
      url: adminDocumentFileUrl(app.id, docType),
      kind,
    };
  });
}

function mapEducation(rows: ApiEducationRow[]): EducationRecord[] {
  return rows
    .filter((row) => row.level === "SSC" || row.level === "HSC")
    .map((row) => ({
      level: row.level as "SSC" | "HSC",
      group: row.group ?? "",
      board: row.board ?? "",
      year: row.year ?? "",
      obtainedMarks: row.obtainedMarks ?? "",
      totalMarks: row.totalMarks ?? "",
      rollNumber: row.rollNumber ?? undefined,
    }));
}

function mapReviewAction(action: string): ReviewAction {
  if (action === "REQUEST_CHANGES") return "CHANGE_REQUESTED";
  if (action === "APPROVE") return "APPROVED";
  if (action === "REJECT") return "REJECTED";
  return "COMMENT";
}

function mapReviews(app: ApiAdminApplication): ApplicationReviewNote[] {
  return app.reviews.map((review, index) => ({
    id: review.id ?? `review-${index}`,
    action: mapReviewAction(review.action),
    message: review.message?.trim() || "No message",
    createdAt: (review.createdAt ?? new Date().toISOString()).slice(0, 10),
    reviewerLabel: "Admissions Officer",
  }));
}

function mapAdminApplication(app: ApiAdminApplication): ApplicationFile {
  const profile = app.profile;
  const choices = app.programChoices ?? [];
  const program =
    [...choices].sort((a, b) => a.preferenceOrder - b.preferenceOrder)[0]?.programOffering.program.name ?? "";
  const education = app.education ?? [];
  const documents = app.documents ?? [];
  const reviews = app.reviews ?? [];
  const hsc = education.find((row) => row.level === "HSC");
  const challanDoc = documents.find((doc) => doc.docType.toUpperCase() === "CHALLAN");
  return {
    id: app.id,
    applicationNo: app.applicationNo ?? "",
    applicantName: profile?.applicantName ?? "",
    cnic: profile?.cnicBform ?? "",
    mobile: profile?.mobile ?? "",
    program,
    district: profile?.domicileDistrict ?? "",
    hscPercentage: hscPercentage(hsc?.obtainedMarks, hsc?.totalMarks),
    status: app.status,
    paymentStatus: (app.paymentStatus as PaymentStatus) ?? "PENDING",
    submittedAt: (app.submittedAt ?? app.createdAt ?? new Date().toISOString()).slice(0, 10),
    fatherName: profile?.fatherName ?? "",
    email: profile?.email ?? "",
    dateOfBirth: toDateInput(profile?.dateOfBirth),
    gender: profile?.gender ?? "",
    nationality: profile?.nationality ?? "",
    postalAddress: profile?.postalAddress ?? profile?.residentialAddress ?? "",
    fatherOccupation: profile?.fatherOccupation ?? "",
    householdIncome: profile?.householdIncome ?? "",
    emergencyContact: profile?.emergencyContact ?? "",
    emergencyPhone: profile?.emergencyPhone ?? "",
    education: mapEducation(education),
    documents: mapDocuments({ ...app, documents }),
    reviews: mapReviews({ ...app, reviews }),
    challan: {
      bank: challanDoc ? "Uploaded challan" : "Not uploaded",
      slipNo: challanDoc ? "See challan document" : "",
      amountLabel: "",
      paidOn: challanDoc ? (challanDoc.uploadedAt ?? "").slice(0, 10) : "",
    },
  };
}

async function fetchAdminApplication(id: string): Promise<ApplicationFile | null> {
  if (!id) return null;
  try {
    const app = await api<ApiAdminApplication>(`/v1/applications/${encodeURIComponent(id)}`);
    return mapAdminApplication(app);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function postReview(id: string, action: "REQUEST_CHANGES" | "APPROVE" | "REJECT", message?: string) {
  await api(`/v1/applications/${encodeURIComponent(id)}/review`, {
    method: "POST",
    body: JSON.stringify({ action, message }),
  });
  return fetchAdminApplication(id);
}

function fromApiApplication(app: ApiMyApplication): ApplicantDashboardData {
  const changeReview = app.reviews.find((review) => review.action === "REQUEST_CHANGES");
  const changeRequest =
    app.status === "CHANGE_REQUESTED" && changeReview
      ? {
          section: "Application",
          message: changeReview.message ?? "Please correct the application and resubmit.",
          items: [
            {
              id: "api-change-1",
              targetKind: "other" as const,
              targetKey: "general",
              targetLabel: "Application",
              message: changeReview.message ?? "Please correct the application and resubmit.",
            },
          ],
        }
      : undefined;

  return {
    applicantName: app.profile?.applicantName ?? "Applicant",
    fatherName: app.profile?.fatherName,
    cnicBform: app.profile?.cnicBform ?? undefined,
    email: app.profile?.email ?? undefined,
    applicationNo: app.applicationNo ?? "",
    admissionCycle: app.admissionCycle.name,
    status: app.status,
    completionPercentage: app.status === "DRAFT" ? 40 : 100,
    completedSections: ["Personal Info", "Program Choices"],
    pendingSections: changeRequest ? ["Corrections required"] : [],
    changeRequest,
  };
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function mapApplicationToWizardForm(app: ApiMyApplication) {
  const profile = app.profile;
  const byOrder = [...app.programChoices].sort((a, b) => a.preferenceOrder - b.preferenceOrder);
  const ssc = app.education.find((row) => row.level === "SSC");
  const hsc = app.education.find((row) => row.level === "HSC");
  return {
    applicantName: profile?.applicantName ?? "",
    fatherName: profile?.fatherName ?? "",
    cnicBform: profile?.cnicBform ?? "",
    dateOfBirth: toDateInput(profile?.dateOfBirth),
    gender: profile?.gender ?? "",
    mobile: profile?.mobile ?? "",
    email: profile?.email ?? "",
    domicileDistrict: profile?.domicileDistrict ?? "",
    province: profile?.province ?? "",
    nationality: profile?.nationality ?? "Pakistani",
    postalAddress: profile?.postalAddress ?? "",
    firstChoice: byOrder[0]?.programOfferingId ?? "",
    secondChoice: byOrder[1]?.programOfferingId ?? "",
    thirdChoice: byOrder[2]?.programOfferingId ?? "",
    sscGroup: ssc?.group ?? "",
    sscBoard: ssc?.board ?? "",
    sscYear: ssc?.year ?? "",
    sscObtained: ssc?.obtainedMarks ?? "",
    sscTotal: ssc?.totalMarks ?? "",
    sscRoll: ssc?.rollNumber ?? "",
    hscGroup: hsc?.group ?? "",
    hscBoard: hsc?.board ?? "",
    hscYear: hsc?.year ?? "",
    obtainedMarks: hsc?.obtainedMarks ?? "",
    totalMarks: hsc?.totalMarks ?? "",
    hscRoll: hsc?.rollNumber ?? "",
    institutionType: hsc?.institutionType ?? "",
    fatherOccupation: profile?.fatherOccupation ?? "",
    householdIncome: profile?.householdIncome ?? "",
    emergencyContact: profile?.emergencyContact ?? "",
    emergencyPhone: profile?.emergencyPhone ?? "",
    hasSibling: Boolean(profile?.hasSibling),
    siblingName: profile?.siblingName ?? "",
    siblingRegNo: profile?.siblingRegNo ?? "",
  };
}

function sectionForItem(item: ChangeRequestItem) {
  if (item.targetKind === "education") return "Education History";
  if (item.targetKind === "document") return "Documents";
  if (item.targetKind === "challan") return "Bank Challan";
  if (item.targetKind === "profile") return "Personal Info";
  return "Review";
}

function syncApplicantNotice(file: ApplicationFile) {
  if (file.applicantName !== applicantDashboard.applicantName && file.applicationNo !== applicantDashboard.applicationNo) {
    return;
  }
  applicantDashboard.status = file.status;
  if (file.status === "CHANGE_REQUESTED") {
    const latest = file.reviews.find((note) => note.action === "CHANGE_REQUESTED");
    const items = latest?.items?.length
      ? latest.items.map((item) => ({ ...item }))
      : [
          {
            id: crypto.randomUUID(),
            targetKind: "other" as const,
            targetKey: "general",
            targetLabel: "Application",
            message: latest?.message ?? "Please correct the application and resubmit.",
          },
        ];
    applicantDashboard.changeRequest = {
      section: sectionForItem(items[0]),
      message: items.length === 1 ? items[0].message : `${items.length} items need correction before the file can continue.`,
      items,
    };
  } else {
    delete applicantDashboard.changeRequest;
  }
}

function changeRequestMessage(items: ChangeRequestItem[]) {
  return items
    .map((item) => `${item.targetLabel}: ${item.message}`)
    .join("\n")
    .trim();
}

export type ApplicantDocumentType = "SSC" | "HSC" | "CNIC" | "DOMICILE" | "PHOTO" | "CHALLAN";

export type ApplicantDocument = {
  id: string;
  docType: ApplicantDocumentType | string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sizeLabel: string;
  status: string;
  uploadedAt: string;
};

export const applicationService = {
  async getMyApplication(): Promise<ApiMyApplication> {
    return api<ApiMyApplication>("/v1/applications/me");
  },
  async saveDraft(payload: DraftPayload): Promise<ApiMyApplication> {
    return api<ApiMyApplication>("/v1/applications/me/draft", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  async listMyDocuments(): Promise<ApplicantDocument[]> {
    return api<ApplicantDocument[]>("/v1/applications/me/documents");
  },
  async uploadMyDocument(docType: ApplicantDocumentType, file: File): Promise<ApplicantDocument> {
    const body = new FormData();
    body.append("file", file);
    return api<ApplicantDocument>(`/v1/applications/me/documents/${docType}`, {
      method: "POST",
      body,
    });
  },
  async getApplicantDashboard(): Promise<ApplicantDashboardData> {
    try {
      const app = await api<ApiMyApplication>("/v1/applications/me");
      return fromApiApplication(app);
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 404)) {
        throw error;
      }
    }
    await delay();
    return {
      ...applicantDashboard,
      changeRequest: applicantDashboard.changeRequest
        ? {
            ...applicantDashboard.changeRequest,
            items: applicantDashboard.changeRequest.items.map((item) => ({ ...item })),
          }
        : undefined,
    };
  },
  async listApplications(): Promise<ApplicationSummary[]> {
    const rows = await api<ApiAdminSummary[]>("/v1/applications");
    return rows.map((row) => ({
      id: row.id,
      applicationNo: row.applicationNo,
      applicantName: row.applicantName,
      cnic: row.cnic,
      mobile: row.mobile,
      program: row.program,
      district: row.district,
      hscPercentage: row.hscPercentage ?? 0,
      status: row.status,
      paymentStatus: row.paymentStatus,
      submittedAt: (row.submittedAt ?? "").slice(0, 10),
    }));
  },
  async getApplication(id: string): Promise<ApplicationFile | null> {
    return fetchAdminApplication(id);
  },
  async requestChange(id: string, items: ChangeRequestItem[]): Promise<ApplicationFile | null> {
    const clean = items
      .map((item) => ({
        ...item,
        id: item.id || crypto.randomUUID(),
        targetLabel: item.targetLabel.trim(),
        message: item.message.trim(),
      }))
      .filter((item) => item.targetLabel.length > 0 && item.message.length >= 8);
    if (clean.length === 0) {
      return null;
    }
    try {
      const file = await postReview(id, "REQUEST_CHANGES", changeRequestMessage(clean));
      if (file) {
        const latest = file.reviews[0];
        if (latest?.action === "CHANGE_REQUESTED") {
          latest.items = clean.map((item) => ({ ...item }));
        }
        syncApplicantNotice(file);
      }
      return file;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 404 || error.status === 409)) {
        return null;
      }
      throw error;
    }
  },
  async approveApplication(id: string, message?: string): Promise<ApplicationFile | null> {
    try {
      const file = await postReview(
        id,
        "APPROVE",
        message?.trim() || "Documents and challan match the submitted file. Application approved.",
      );
      if (file) syncApplicantNotice(file);
      return file;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 404 || error.status === 409)) {
        return null;
      }
      throw error;
    }
  },
  async rejectApplication(id: string, message: string): Promise<ApplicationFile | null> {
    const note = message.trim();
    if (note.length < 8) {
      return null;
    }
    try {
      const file = await postReview(id, "REJECT", note);
      if (file) syncApplicantNotice(file);
      return file;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 404 || error.status === 409)) {
        return null;
      }
      throw error;
    }
  },
  async submitApplicantApplication(): Promise<ApplicantDashboardData> {
    const app = await api<ApiMyApplication>("/v1/applications/me/submit", { method: "POST", body: "{}" });
    return fromApiApplication(app);
  },
  async listPrograms(): Promise<ProgramOption[]> {
    type Cycle = { id: string; status: string };
    type Offering = {
      id: string;
      isOpen: boolean;
      program: { code: string; name: string };
    };
    try {
      const cycles = await api<Cycle[]>("/v1/admission-config/cycles");
      const open = cycles.find((cycle) => cycle.status === "OPEN") ?? cycles[0];
      if (!open) {
        return [];
      }
      const offerings = await api<Offering[]>(`/v1/admission-config/cycles/${open.id}/offerings`);
      return offerings
        .filter((row) => row.isOpen)
        .map((row) => ({
          id: row.id,
          code: row.program.code,
          name: row.program.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
    }
    await delay();
    return programs;
  },
  async getVcDashboard(): Promise<VcDashboardData> {
    await delay();
    return vcDashboard;
  },
};
