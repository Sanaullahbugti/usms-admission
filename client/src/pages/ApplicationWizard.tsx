import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { downloadMcbChallan, MCB_CHALLAN, nextChallanNo } from "../lib/mcbChallan";
import { ApiError, documentFileUrl } from "../lib/api";
import {
  applicationService,
  mapApplicationToWizardForm,
  type ApplicantDocument,
  type DraftPayload,
} from "../services/applicationService";
import { APPLICATION_STATUS, isPostSubmitViewStatus } from "../constants/applicationStatus";
import type { ProgramOption } from "../types/application";

const steps = [
  { title: "Personal Info", next: "Program Choices", prev: "" },
  { title: "Program Choices", next: "Education History", prev: "Personal Info" },
  { title: "Education History", next: "Parents & Family", prev: "Program Choices" },
  { title: "Parents & Family", next: "Documents", prev: "Education History" },
  { title: "Documents", next: "Bank Challan", prev: "Parents & Family" },
  { title: "Bank Challan", next: "Review", prev: "Documents" },
  { title: "Review", next: "Declaration", prev: "Bank Challan" },
  { title: "Declaration", next: "Submit application", prev: "Review" },
];

const documents = [
  { docType: "SSC" as const, title: "Matriculation / O-Level certificate", hint: "SSC or O-Level sanad · PDF, JPG, or PNG · max 5 MB" },
  { docType: "HSC" as const, title: "HSC / Intermediate marksheet", hint: "Part-II marksheet · PDF, JPG, or PNG · max 5 MB" },
  { docType: "CNIC" as const, title: "Applicant CNIC / B-Form", hint: "Front and back · PDF, JPG, or PNG · max 5 MB" },
  { docType: "DOMICILE" as const, title: "Domicile certificate", hint: "Domicile or PRC · PDF, JPG, or PNG · max 5 MB" },
  { docType: "PHOTO" as const, title: "Passport photograph", hint: "Recent photograph · JPG or PNG · max 5 MB" },
];

const MAX_PROGRAM_CHOICES = 10;

type ExtraQualification = {
  id: number;
  kind: "Diploma" | "Degree" | "Other";
  title: string;
  institute: string;
  year: string;
  grading: "marks" | "cgpa";
  marks: string;
  cgpa: string;
};

type Toast = { message: string; tone: "ok" | "info" | "error" };

type ValidationIssue = { step: number; field: string; message: string };

function ordinalLabel(index: number) {
  const n = index + 1;
  const mod100 = n % 100;
  const mod10 = n % 10;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : mod10 === 1 ? "st" : mod10 === 2 ? "nd" : mod10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

function emptyProgramChoices() {
  return Array.from({ length: MAX_PROGRAM_CHOICES }, () => "");
}

function ratio(obtained: string, total: string) {
  const got = Number(obtained);
  const max = Number(total);
  if (!Number.isFinite(got) || !Number.isFinite(max) || max <= 0) {
    return "0.00";
  }
  return ((got / max) * 100).toFixed(2);
}

function marksPairIssue(obtained: string, total: string, label: string): string | null {
  const obtainedRaw = obtained.trim();
  const totalRaw = total.trim();
  if (!obtainedRaw || !totalRaw) return null;
  const got = Number(obtainedRaw);
  const max = Number(totalRaw);
  if (!Number.isFinite(got)) return `${label} obtained marks must be a number.`;
  if (!Number.isFinite(max)) return `${label} total marks must be a number.`;
  if (got < 0) return `${label} obtained marks cannot be negative.`;
  if (max <= 0) return `${label} total marks must be greater than 0.`;
  if (got > max) return `${label} obtained marks (${got}) cannot exceed total marks (${max}).`;
  return null;
}

const ALLOWED_UPLOAD_EXT = /\.(pdf|jpe?g|png)$/i;
const ALLOWED_UPLOAD_MIME = new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png", ""]);

function validateUploadFile(file: File): string | null {
  if (!file.size) return "The selected file is empty.";
  if (file.size > 5 * 1024 * 1024) return "Each file must be 5 MB or smaller.";
  if (!ALLOWED_UPLOAD_EXT.test(file.name)) return "Only PDF, JPG, and PNG files are allowed.";
  const lower = file.name.toLowerCase();
  if ((lower.match(/\./g) ?? []).length > 1) {
    const withoutFinal = lower.slice(0, lower.lastIndexOf("."));
    if (/\.(php|phtml|asp|aspx|js|mjs|cjs|html|htm|shtml|svg|exe|sh|bat|cmd|dll|jar|py|rb|pl|cgi|jsp)$/i.test(withoutFinal)) {
      return "Only PDF, JPG, and PNG files are allowed.";
    }
  }
  if (file.type && !ALLOWED_UPLOAD_MIME.has(file.type.toLowerCase())) {
    return "Only PDF, JPG, and PNG files are allowed.";
  }
  return null;
}

function programLabel(programs: ProgramOption[] | undefined, idOrCode: string) {
  if (!idOrCode) return "Not selected";
  return programs?.find((program) => program.id === idOrCode || program.code === idOrCode)?.name ?? idOrCode;
}

export function ApplicationWizard() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({
    queryKey: ["applicant-dashboard"],
    queryFn: () => applicationService.getApplicantDashboard(),
  });
  const programs = useQuery({
    queryKey: ["programs"],
    queryFn: () => applicationService.listPrograms(),
  });
  const myDocuments = useQuery({
    queryKey: ["my-documents"],
    queryFn: () => applicationService.listMyDocuments(),
  });
  const myApplication = useQuery({
    queryKey: ["my-application"],
    queryFn: () => applicationService.getMyApplication(),
  });
  const changeRequest = dashboard.data?.changeRequest;
  const changeItems = changeRequest?.items ?? [];
  const educationItems = changeItems.filter((item) => item.targetKind === "education");
  const documentItems = changeItems.filter((item) => item.targetKind === "document");

  function stepForChangeKind(kind: (typeof changeItems)[number]["targetKind"] | undefined) {
    if (kind === "document") return 5;
    if (kind === "challan") return 6;
    if (kind === "profile") return 1;
    return 3;
  }
  const [step, setStep] = useState(1);
  const [openedCorrection, setOpenedCorrection] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAsResubmit, setSubmittedAsResubmit] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [inspect, setInspect] = useState<{ title: string; detail: string } | null>(null);
  const [extraQuals, setExtraQuals] = useState<ExtraQualification[]>([]);
  const [nextQualId, setNextQualId] = useState(1);
  const [challanDownloaded, setChallanDownloaded] = useState(false);
  const [challanSlipFile, setChallanSlipFile] = useState<{ name: string; sizeLabel: string; url: string } | null>(null);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [submitIssues, setSubmitIssues] = useState<ValidationIssue[]>([]);
  const challanUploadRef = useRef<HTMLInputElement>(null);
  const documentUploadRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const marksRef = useRef<HTMLInputElement>(null);
  const stepperRef = useRef<HTMLElement>(null);
  const stepsTrackRef = useRef<HTMLDivElement>(null);
  const stepButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [form, setForm] = useState({
    applicantName: "",
    fatherName: "",
    surname: "",
    cnicBform: "",
    dateOfBirth: "",
    gender: "",
    mobile: "",
    email: "",
    domicileDistrict: "",
    province: "",
    nationality: "Pakistani",
    postalAddress: "",
    programChoices: emptyProgramChoices(),
    sscGroup: "",
    sscBoard: "",
    sscYear: "",
    sscObtained: "",
    sscTotal: "",
    sscRoll: "",
    hscGroup: "",
    hscBoard: "",
    hscYear: "",
    obtainedMarks: "",
    totalMarks: "",
    hscRoll: "",
    institutionType: "",
    fatherOccupation: "",
    householdIncome: "",
    emergencyContact: "",
    emergencyPhone: "",
    hasSibling: false,
    siblingName: "",
    siblingRegNo: "",
    challanBank: MCB_CHALLAN.bankName,
    challanSlip: "",
    challanDate: "",
    declareTrue: false,
    declareRules: false,
    declareCertificate: false,
    declarationName: "",
  });

  const identityReady = useRef(false);

  useEffect(() => {
    const app = myApplication.data;
    if (!app || identityReady.current) {
      return;
    }
    identityReady.current = true;
    const mapped = mapApplicationToWizardForm(app);
    const { extraQuals: hydratedExtras, ...profileFields } = mapped;
    setForm((current) => ({
      ...current,
      ...profileFields,
      // Keep challan/declaration UI-only fields
      challanBank: current.challanBank,
      challanSlip: current.challanSlip || app.applicationNo || "",
      challanDate: current.challanDate,
      declareTrue: current.declareTrue,
      declareRules: current.declareRules,
      declareCertificate: current.declareCertificate,
      declarationName: current.declarationName,
    }));
    if (hydratedExtras.length > 0) {
      setExtraQuals(hydratedExtras);
      setNextQualId(hydratedExtras.reduce((max, row) => Math.max(max, row.id), 0) + 1);
    }
    if (isPostSubmitViewStatus(app.status)) {
      setSubmitted(true);
      setSubmittedAsResubmit(app.status === APPLICATION_STATUS.UNDER_REVIEW && Boolean(app.submittedAt));
    }
  }, [myApplication.data]);

  useEffect(() => {
    return () => {
      if (challanSlipFile?.url) {
        URL.revokeObjectURL(challanSlipFile.url);
      }
    };
  }, [challanSlipFile?.url]);

  useEffect(() => {
    if (changeRequest && !openedCorrection) {
      setStep(stepForChangeKind(changeRequest.items[0]?.targetKind));
      setOpenedCorrection(true);
    }
  }, [changeRequest, openedCorrection]);

  useEffect(() => {
    const challan = myDocuments.data?.find((doc) => doc.docType === "CHALLAN");
    if (!challan) {
      return;
    }
    setChallanSlipFile({
      name: challan.originalName,
      sizeLabel: challan.sizeLabel,
      url: documentFileUrl("CHALLAN"),
    });
  }, [myDocuments.data]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const button = stepButtonRefs.current[step - 1];
    const track = stepsTrackRef.current;
    if (!button || !track) {
      return;
    }
    const buttonLeft = button.offsetLeft;
    const buttonWidth = button.offsetWidth;
    const trackWidth = track.clientWidth;
    const target = buttonLeft - (trackWidth - buttonWidth) / 2;
    track.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [step]);

  function update<K extends keyof typeof form>(name: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [name]: value }));
    setSaved(false);
    setSubmitIssues((current) => current.filter((issue) => issue.field !== String(name)));
  }

  function updateProgramChoice(index: number, value: string) {
    setForm((current) => {
      const programChoices = [...current.programChoices];
      programChoices[index] = value;
      return { ...current, programChoices };
    });
    setSaved(false);
    setSubmitIssues((current) => current.filter((issue) => issue.field !== "programChoices"));
  }

  function collectSubmitIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!form.dateOfBirth.trim()) issues.push({ step: 1, field: "dateOfBirth", message: "Date of birth is required." });
    if (!form.gender.trim()) issues.push({ step: 1, field: "gender", message: "Select gender." });
    if (!form.mobile.trim()) issues.push({ step: 1, field: "mobile", message: "Mobile phone is required." });
    if (!form.domicileDistrict.trim()) issues.push({ step: 1, field: "domicileDistrict", message: "Domicile district is required." });
    if (!form.postalAddress.trim()) issues.push({ step: 1, field: "postalAddress", message: "Postal address is required." });
    if (!form.programChoices.some((choice) => choice.trim())) {
      issues.push({ step: 2, field: "programChoices", message: "Select at least a first program preference." });
    }

    if (!form.sscBoard.trim() || !form.sscObtained.trim() || !form.sscTotal.trim()) {
      issues.push({ step: 3, field: "ssc", message: "Complete SSC board and marks." });
    } else {
      const sscMarks = marksPairIssue(form.sscObtained, form.sscTotal, "SSC");
      if (sscMarks) issues.push({ step: 3, field: "sscObtained", message: sscMarks });
    }
    if (!form.hscGroup.trim()) issues.push({ step: 3, field: "hscGroup", message: "Select HSC academic group." });
    if (!form.hscBoard.trim() || !form.obtainedMarks.trim() || !form.totalMarks.trim()) {
      issues.push({ step: 3, field: "hsc", message: "Complete HSC board and marks." });
    } else {
      const hscMarks = marksPairIssue(form.obtainedMarks, form.totalMarks, "HSC");
      if (hscMarks) issues.push({ step: 3, field: "obtainedMarks", message: hscMarks });
    }
    if (!form.hscYear.trim()) issues.push({ step: 3, field: "hscYear", message: "Enter HSC passing year." });
    if (!form.hscRoll.trim()) issues.push({ step: 3, field: "hscRoll", message: "Enter HSC roll / registration number." });
    if (!form.institutionType.trim()) issues.push({ step: 3, field: "institutionType", message: "Select institution type." });

    if (!form.fatherOccupation.trim()) issues.push({ step: 4, field: "fatherOccupation", message: "Father / guardian occupation is required." });
    if (!form.householdIncome.trim()) issues.push({ step: 4, field: "householdIncome", message: "Select household income." });
    if (!form.emergencyContact.trim()) issues.push({ step: 4, field: "emergencyContact", message: "Emergency contact is required." });
    if (!form.emergencyPhone.trim()) issues.push({ step: 4, field: "emergencyPhone", message: "Emergency phone is required." });

    for (const item of documents) {
      if (!uploadedDoc(item.docType)) {
        issues.push({ step: 5, field: item.docType, message: `${item.title} is required.` });
      }
    }

    if (!form.declareTrue || !form.declareRules || !form.declareCertificate) {
      issues.push({ step: 8, field: "declare", message: "Confirm all three declaration statements." });
    }
    if (form.declarationName.trim().length < 3) {
      issues.push({ step: 8, field: "declarationName", message: "Type your full legal name to sign the declaration." });
    }
    return issues;
  }

  function attemptSubmit() {
    const issues = collectSubmitIssues();
    setSubmitIssues(issues);
    if (issues.length > 0) {
      const first = issues[0];
      goToStep(first.step);
      setToast({
        message: issues.length === 1 ? first.message : `${issues.length} required items are missing. Fix them to submit.`,
        tone: "error",
      });
      return;
    }
    submitApplication.mutate();
  }

  function goToStep(next: number) {
    if (next < 1 || next > steps.length) {
      return;
    }
    setStep(next);
    stepperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openCorrection() {
    const first = changeItems[0];
    const next = stepForChangeKind(first?.targetKind);
    goToStep(next);
    if (next === 3) {
      window.setTimeout(() => {
        marksRef.current?.focus();
        marksRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    }
  }

  function buildDraftPayload(): DraftPayload {
    const programOfferingIds = form.programChoices.filter(Boolean).slice(0, MAX_PROGRAM_CHOICES);
    const extraEducation = extraQuals.slice(0, 3).map((item, index) => {
      const level = (`EXTRA${index + 1}` as "EXTRA1" | "EXTRA2" | "EXTRA3");
      const useCgpa = (item.kind === "Diploma" || item.kind === "Degree") && item.grading === "cgpa";
      let obtainedMarks: string | null = null;
      let totalMarks: string | null = null;
      if (!useCgpa && item.marks.trim()) {
        const parts = item.marks.split("/").map((part) => part.trim());
        if (parts.length === 2 && parts[0] && parts[1]) {
          obtainedMarks = parts[0];
          totalMarks = parts[1];
        } else {
          obtainedMarks = item.marks.trim();
        }
      }
      return {
        level,
        group: item.kind,
        board: item.institute || null,
        year: item.year || null,
        obtainedMarks,
        totalMarks,
        cgpa: useCgpa ? item.cgpa.trim() || null : null,
        institutionType: item.title || null,
      };
    });
    return {
      surname: form.surname || null,
      mobile: form.mobile || null,
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender || null,
      domicileDistrict: form.domicileDistrict || null,
      province: form.province || null,
      nationality: form.nationality || null,
      postalAddress: form.postalAddress || null,
      fatherOccupation: form.fatherOccupation || null,
      householdIncome: form.householdIncome || null,
      emergencyContact: form.emergencyContact || null,
      emergencyPhone: form.emergencyPhone || null,
      hasSibling: form.hasSibling,
      siblingName: form.siblingName || null,
      siblingRegNo: form.siblingRegNo || null,
      programOfferingIds,
      education: [
        {
          level: "SSC",
          group: form.sscGroup || null,
          board: form.sscBoard || null,
          year: form.sscYear || null,
          obtainedMarks: form.sscObtained || null,
          totalMarks: form.sscTotal || null,
          rollNumber: form.sscRoll || null,
        },
        {
          level: "HSC",
          group: form.hscGroup || null,
          board: form.hscBoard || null,
          year: form.hscYear || null,
          obtainedMarks: form.obtainedMarks || null,
          totalMarks: form.totalMarks || null,
          rollNumber: form.hscRoll || null,
          institutionType: form.institutionType || null,
        },
        ...extraEducation,
      ],
    };
  }

  const saveDraftMutation = useMutation({
    mutationFn: () => applicationService.saveDraft(buildDraftPayload()),
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ["my-application"] });
      void queryClient.invalidateQueries({ queryKey: ["applicant-dashboard"] });
      setToast({ message: "Draft saved to your application file.", tone: "ok" });
    },
    onError: (error) => {
      setToast({
        message: error instanceof ApiError ? error.message : "Could not save the draft.",
        tone: "error",
      });
    },
  });

  function saveDraft() {
    const sscMarks = marksPairIssue(form.sscObtained, form.sscTotal, "SSC");
    const hscMarks = marksPairIssue(form.obtainedMarks, form.totalMarks, "HSC");
    if (sscMarks || hscMarks) {
      setSubmitIssues([
        ...(sscMarks ? [{ step: 3, field: "sscObtained", message: sscMarks }] : []),
        ...(hscMarks ? [{ step: 3, field: "obtainedMarks", message: hscMarks }] : []),
      ]);
      goToStep(3);
      setToast({ message: sscMarks ?? hscMarks ?? "Fix marks before saving.", tone: "error" });
      return;
    }
    saveDraftMutation.mutate();
  }

  async function downloadChallan(isRedownload: boolean) {
    const applicationNo = dashboard.data?.applicationNo ?? "APP-DRAFT";
    const challanNo = nextChallanNo(applicationNo);
    const dateLabel = form.challanDate
      ? new Date(form.challanDate).toLocaleDateString("en-GB")
      : new Date().toLocaleDateString("en-GB");
    try {
      const result = await downloadMcbChallan({
        applicationNo,
        challanNo,
        dateLabel,
        name: form.applicantName,
        fatherName: form.fatherName,
        surname: form.surname,
        cnic: form.cnicBform,
        program: "",
        mobile: form.mobile,
      });
      setForm((current) => ({
        ...current,
        challanBank: MCB_CHALLAN.bankName,
        challanSlip: result.challanNo,
        challanDate: current.challanDate || new Date().toISOString().slice(0, 10),
      }));
      setChallanDownloaded(true);
      setSaved(false);
      setToast({
        message: isRedownload
          ? "MCB challan PDF redownloaded."
          : "Prefilled MCB challan PDF downloaded. Pay at the bank, then upload the stamped slip.",
        tone: "ok",
      });
    } catch {
      setToast({ message: "Could not build the MCB challan PDF. Try again.", tone: "error" });
    }
  }

  function onChallanSlipSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }
    const problem = validateUploadFile(file);
    if (problem) {
      setToast({ message: problem, tone: "error" });
      if (challanUploadRef.current) {
        challanUploadRef.current.value = "";
      }
      return;
    }
    void uploadDocument.mutateAsync({ docType: "CHALLAN", file }).then((doc) => {
      if (challanSlipFile?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(challanSlipFile.url);
      }
      setChallanSlipFile({
        name: doc.originalName,
        sizeLabel: doc.sizeLabel,
        url: documentFileUrl("CHALLAN"),
      });
    });
  }

  function clearChallanSlip() {
    if (challanSlipFile?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(challanSlipFile.url);
    }
    setChallanSlipFile(null);
    if (challanUploadRef.current) {
      challanUploadRef.current.value = "";
    }
    setToast({ message: "Challan slip cleared from this screen. Re-upload if needed.", tone: "info" });
  }

  const uploadDocument = useMutation({
    mutationFn: ({ docType, file }: { docType: (typeof documents)[number]["docType"] | "CHALLAN"; file: File }) =>
      applicationService.uploadMyDocument(docType, file),
    onMutate: ({ docType }) => {
      setUploadingDocType(docType);
    },
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({ queryKey: ["my-documents"] });
      setSubmitIssues((current) => current.filter((issue) => issue.field !== doc.docType));
      setToast({ message: `${doc.originalName} uploaded (${doc.sizeLabel}).`, tone: "ok" });
    },
    onError: (error) => {
      setToast({
        message: error instanceof ApiError || error instanceof Error ? error.message : "Could not upload the file.",
        tone: "error",
      });
    },
    onSettled: () => {
      setUploadingDocType(null);
    },
  });

  function queueQueueUpload(docType: (typeof documents)[number]["docType"] | "CHALLAN", file: File | undefined) {
    if (!file) return;
    const problem = validateUploadFile(file);
    if (problem) {
      setToast({ message: problem, tone: "error" });
      return;
    }
    void uploadDocument.mutateAsync({ docType, file });
  }

  function uploadedDoc(docType: string): ApplicantDocument | undefined {
    return myDocuments.data?.find((doc) => doc.docType === docType);
  }

  function openDocument(docType: string, title: string) {
    const doc = uploadedDoc(docType);
    if (!doc) {
      setInspect({ title, detail: "No file uploaded yet for this slot." });
      return;
    }
    window.open(documentFileUrl(docType), "_blank", "noopener,noreferrer");
  }

  const submitApplication = useMutation({
    mutationFn: async () => {
      await applicationService.saveDraft(buildDraftPayload());
      return applicationService.submitApplicantApplication();
    },
    onSuccess: (result) => {
      setSubmitted(true);
      setSubmittedAsResubmit(result.status === APPLICATION_STATUS.UNDER_REVIEW);
      setSaved(true);
      setSubmitIssues([]);
      void queryClient.invalidateQueries({ queryKey: ["applicant-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["my-application"] });
      setToast({
        message:
          result.status === APPLICATION_STATUS.UNDER_REVIEW
            ? "Correction submitted. The application is back under review."
            : "Application submitted. Admissions will review your file.",
        tone: "ok",
      });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not submit the application. Try again.";
      setToast({ message, tone: "error" });
      if (error instanceof ApiError && error.code === "INCOMPLETE_APPLICATION") {
        const issues = collectSubmitIssues();
        setSubmitIssues(issues.length ? issues : [{ step: 8, field: "submit", message }]);
        if (issues[0]) {
          goToStep(issues[0].step);
        }
      }
    },
  });

  function applyMarks() {
    setToast({
      message: `HSC marks on this draft are ${form.obtainedMarks} / ${form.totalMarks} (${hscPercent}%). Official verification is still pending.`,
      tone: "info",
    });
  }

  function addQualification() {
    if (extraQuals.length >= 3) {
      setToast({ message: "You can add up to three additional qualifications.", tone: "info" });
      return;
    }
    setExtraQuals((current) => [
      ...current,
      {
        id: nextQualId,
        kind: "Diploma",
        title: "",
        institute: "",
        year: "",
        grading: "marks",
        marks: "",
        cgpa: "",
      },
    ]);
    setNextQualId((current) => current + 1);
    setToast({ message: "Additional qualification added to this draft.", tone: "info" });
  }

  const percent = Math.round((step / steps.length) * 100);
  const hscPercent = ratio(form.obtainedMarks, form.totalMarks);
  const sscPercent = ratio(form.sscObtained, form.sscTotal);
  const nameOf = (code: string) => programLabel(programs.data, code);
  const draftDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const current = steps[step - 1];
  const isResubmit = Boolean(changeRequest) || dashboard.data?.status === APPLICATION_STATUS.CHANGE_REQUESTED;
  const submitLabel = submitApplication.isPending
    ? "Submitting..."
    : isResubmit
      ? "Resubmit application"
      : "Submit application";
  const issuesOnStep = submitIssues.filter((issue) => issue.step === step);
  const fieldIssue = (field: string) => submitIssues.find((issue) => issue.field === field)?.message;

  return (
    <div className="admit">
      {toast ? (
        <div className={`admit-toast admit-toast--${toast.tone}`} role="status">
          <span className="ms">{toast.tone === "error" ? "error" : toast.tone === "info" ? "info" : "check_circle"}</span>
          <span>{toast.message}</span>
        </div>
      ) : null}

      {changeRequest ? (
        <div className="admit-banner">
          <div className="admit-banner-copy">
            <span className="ms">error</span>
            <div>
              <div className="admit-banner-kicker">
                <strong>Action required</strong>
                <span>
                  {changeItems.length} item{changeItems.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="admit-change-list">
                {changeItems.map((item) => (
                  <li key={item.id}>
                    <em>{item.targetLabel}</em>
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button className="admit-btn admit-btn--danger" type="button" onClick={openCorrection}>
            Start corrections
            <span className="ms">arrow_downward</span>
          </button>
        </div>
      ) : null}

      <section className="admit-stepper" ref={stepperRef} aria-label="Application steps">
        <div className="admit-stepper-top">
          <div>
            <p className="eyebrow">Undergraduate workflow</p>
            <span className="muted">
              Step {step} of {steps.length} ({percent}% of the form)
            </span>
          </div>
          <div className="admit-progress" aria-hidden="true">
            <i style={{ width: `${percent}%` }} />
          </div>
        </div>
        <div className="admit-steps" ref={stepsTrackRef}>
          {steps.map((item, index) => {
            const number = index + 1;
            const state = number === step ? "is-current" : number < step ? "is-done" : "is-upcoming";
            return (
              <button
                key={item.title}
                ref={(node) => {
                  stepButtonRefs.current[index] = node;
                }}
                className={`admit-step ${state}`}
                type="button"
                onClick={() => goToStep(number)}
              >
                <span className="admit-step-icon">
                  {number < step ? <span className="ms">check</span> : number}
                </span>
                <span className="admit-step-copy">
                  <small>{number === step && number === 3 && changeRequest ? "In edit" : `Step ${number}`}</small>
                  <strong>{item.title}</strong>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="admit-layout">
        <div className="admit-main">
          {issuesOnStep.length > 0 ? (
            <div className="admit-missing" role="alert">
              <strong>Required on this step</strong>
              <ul>
                {issuesOnStep.map((issue) => (
                  <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {step === 1 ? (
            <StepCard
              title="Step 1: Personal profile"
              lede="Enter identity details as they appear on your matriculation documents and CNIC or B-Form."
              badge="Identity"
              icon="badge"
            >
              <p className="admit-note">Name should be as per matriculation documents.</p>
              <div className="admit-grid admit-grid-2">
                <Field label="Full applicant name *">
                  <input value={form.applicantName} onChange={(event) => update("applicantName", event.target.value)} />
                </Field>
                <Field label="Father / guardian name *">
                  <input value={form.fatherName} onChange={(event) => update("fatherName", event.target.value)} />
                </Field>
              </div>
              <div className="admit-grid admit-grid-2">
                <Field label="Surname">
                  <input value={form.surname} onChange={(event) => update("surname", event.target.value)} autoComplete="family-name" />
                </Field>
                <Field label="CNIC / B-Form number *">
                  <input value={form.cnicBform} onChange={(event) => update("cnicBform", event.target.value)} />
                </Field>
              </div>
              <div className="admit-grid admit-grid-3">
                <Field label="Date of birth *" error={fieldIssue("dateOfBirth")}>
                  <input type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} />
                </Field>
                <Field label="Gender *" error={fieldIssue("gender")}>
                  <select value={form.gender} onChange={(event) => update("gender", event.target.value)}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
                <Field label="Nationality *">
                  <input value={form.nationality} readOnly />
                </Field>
              </div>
              <div className="admit-grid admit-grid-2">
                <Field label="Mobile phone *" error={fieldIssue("mobile")}>
                  <input type="tel" value={form.mobile} onChange={(event) => update("mobile", event.target.value)} />
                </Field>
                <Field label="Email address *">
                  <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
                </Field>
              </div>
              <div className="admit-grid admit-grid-2">
                <Field label="Domicile district *" error={fieldIssue("domicileDistrict")}>
                  <input value={form.domicileDistrict} onChange={(event) => update("domicileDistrict", event.target.value)} />
                </Field>
                <Field label="Province">
                  <input value={form.province} onChange={(event) => update("province", event.target.value)} />
                </Field>
              </div>
              <Field label="Postal / mailing address *" error={fieldIssue("postalAddress")}>
                <textarea rows={2} value={form.postalAddress} onChange={(event) => update("postalAddress", event.target.value)} />
              </Field>
            </StepCard>
          ) : null}

          {step === 2 ? (
            <StepCard
              title="Step 2: Program choices"
              lede="Select up to 10 BS program preferences. The same program may be chosen in more than one position."
              badge="Max 10 choices"
              icon="tune"
            >
              {fieldIssue("programChoices") ? <p className="admit-field-error">{fieldIssue("programChoices")}</p> : null}
              {form.programChoices.map((choice, index) => (
                <div className={index === 0 ? "admit-choice admit-choice--primary" : "admit-choice"} key={`choice-${index}`}>
                  <div className="admit-choice-head">
                    <strong>
                      <span className="admit-dot" />
                      {ordinalLabel(index)} priority
                    </strong>
                    {index === 0 ? <span className="admit-pill">HSC {hscPercent}%</span> : null}
                  </div>
                  <ProgramSelect
                    programs={programs.data}
                    value={choice}
                    onChange={(value) => updateProgramChoice(index, value)}
                  />
                </div>
              ))}
            </StepCard>
          ) : null}

          {step === 3 ? (
            <StepCard
              title="Step 3: Academic qualifications"
              lede="Matriculation and intermediate records are both required for undergraduate screening."
              badge="Education"
              icon="school"
            >
              <article className="admit-record">
                <header>
                  <strong>
                    <span className="ms">school</span>
                    Secondary School Certificate (SSC / Matric)
                  </strong>
                  <span className="admit-pill">Entered on draft</span>
                </header>
                <div className="admit-grid admit-grid-4">
                  <Field label="Group / stream">
                    <input value={form.sscGroup} onChange={(event) => update("sscGroup", event.target.value)} />
                  </Field>
                  <Field label="Board">
                    <input value={form.sscBoard} onChange={(event) => update("sscBoard", event.target.value)} />
                  </Field>
                  <Field label="Passing year">
                    <input value={form.sscYear} onChange={(event) => update("sscYear", event.target.value)} />
                  </Field>
                  <Field label="Roll number">
                    <input value={form.sscRoll} onChange={(event) => update("sscRoll", event.target.value)} />
                  </Field>
                  <Field label="Marks obtained" error={fieldIssue("sscObtained") || fieldIssue("ssc")}>
                    <input
                      inputMode="decimal"
                      value={form.sscObtained}
                      onChange={(event) => update("sscObtained", event.target.value)}
                    />
                  </Field>
                  <Field label="Total marks">
                    <input
                      inputMode="decimal"
                      value={form.sscTotal}
                      onChange={(event) => update("sscTotal", event.target.value)}
                    />
                  </Field>
                </div>
                <footer>
                  <span>
                    {form.sscObtained} / {form.sscTotal} ({sscPercent}%)
                  </span>
                </footer>
              </article>

              <article className="admit-record admit-record--edit" id="hsc-marks-section">
                <header>
                  <strong>
                    <span className="ms">auto_stories</span>
                    Higher Secondary Certificate (HSC / Intermediate)
                  </strong>
                  <span className={educationItems.length ? "admit-pill admit-pill--warn" : "admit-pill"}>
                    {educationItems.length ? "Awaiting revision" : "Entered on draft"}
                  </span>
                </header>
                {educationItems.length ? (
                  <div className="admit-alert">
                    <span className="ms">warning</span>
                    <div>
                      <strong>Correction notice</strong>
                      <ul className="admit-change-list">
                        {educationItems.map((item) => (
                          <li key={item.id}>
                            <em>{item.targetLabel}</em>
                            <span>{item.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
                <div className="admit-grid admit-grid-2">
                  <Field label="Academic group *">
                    <select value={form.hscGroup} onChange={(event) => update("hscGroup", event.target.value)}>
                      <option value="">Select</option>
                      <option value="Pre-Engineering">Pre-Engineering</option>
                      <option value="Pre-Medical">Pre-Medical</option>
                      <option value="Computer Science (ICS)">Computer Science (ICS)</option>
                      <option value="General Science">General Science</option>
                      <option value="Commerce">Commerce</option>
                    </select>
                  </Field>
                  <Field label="Board *">
                    <input value={form.hscBoard} onChange={(event) => update("hscBoard", event.target.value)} />
                  </Field>
                </div>
                <div className="admit-grid admit-grid-3">
                  <Field label="Passing year *">
                    <input value={form.hscYear} onChange={(event) => update("hscYear", event.target.value)} />
                  </Field>
                  <Field label="Total marks *">
                    <input
                      inputMode="decimal"
                      value={form.totalMarks}
                      onChange={(event) => update("totalMarks", event.target.value)}
                    />
                  </Field>
                  <Field label="Marks obtained *" error={fieldIssue("obtainedMarks") || fieldIssue("hsc")}>
                    <input
                      ref={marksRef}
                      className={educationItems.length ? "is-revise" : undefined}
                      inputMode="decimal"
                      value={form.obtainedMarks}
                      onChange={(event) => update("obtainedMarks", event.target.value)}
                    />
                    <small>
                      Calculated: {form.obtainedMarks} / {form.totalMarks} ({hscPercent}%)
                      {Number(hscPercent) > 100 ? " — obtained cannot exceed total" : ""}
                    </small>
                  </Field>
                </div>
                <div className="admit-grid admit-grid-2">
                  <Field label="Roll / registration number *">
                    <input value={form.hscRoll} onChange={(event) => update("hscRoll", event.target.value)} />
                  </Field>
                  <Field label="Institution type *">
                    <select value={form.institutionType} onChange={(event) => update("institutionType", event.target.value)}>
                      <option value="">Select</option>
                      <option value="Government college">Government college</option>
                      <option value="Private registered college">Private registered college</option>
                      <option value="Private candidate">Private candidate</option>
                    </select>
                  </Field>
                </div>
                <div className="admit-aggregate">
                  <span>
                    <span className="ms">sync</span>
                    Draft aggregate: <strong>{hscPercent}%</strong>
                  </span>
                  <button className="admit-btn admit-btn--cobalt" type="button" onClick={applyMarks}>
                    Apply on draft
                  </button>
                </div>
              </article>

              {extraQuals.map((item, index) => (
                <article className="admit-record" key={item.id}>
                  <header>
                    <strong>Additional qualification #{index + 1}</strong>
                    <button
                      className="admit-text"
                      type="button"
                      onClick={() => setExtraQuals((current) => current.filter((row) => row.id !== item.id))}
                    >
                      Remove
                    </button>
                  </header>
                  <div className="admit-grid admit-grid-3">
                    <Field label="Type">
                      <select
                        value={item.kind}
                        onChange={(event) =>
                          setExtraQuals((current) =>
                            current.map((row) =>
                              row.id === item.id
                                ? {
                                    ...row,
                                    kind: event.target.value as ExtraQualification["kind"],
                                    grading:
                                      event.target.value === "Diploma" || event.target.value === "Degree"
                                        ? row.grading
                                        : "marks",
                                  }
                                : row,
                            ),
                          )
                        }
                      >
                        <option value="Diploma">Diploma</option>
                        <option value="Degree">Degree</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                    <Field label="Title">
                      <input
                        value={item.title}
                        onChange={(event) =>
                          setExtraQuals((current) =>
                            current.map((row) => (row.id === item.id ? { ...row, title: event.target.value } : row)),
                          )
                        }
                      />
                    </Field>
                    <Field label="Institute / board">
                      <input
                        value={item.institute}
                        onChange={(event) =>
                          setExtraQuals((current) =>
                            current.map((row) => (row.id === item.id ? { ...row, institute: event.target.value } : row)),
                          )
                        }
                      />
                    </Field>
                    <Field label="Passing year">
                      <input
                        value={item.year}
                        onChange={(event) =>
                          setExtraQuals((current) =>
                            current.map((row) => (row.id === item.id ? { ...row, year: event.target.value } : row)),
                          )
                        }
                      />
                    </Field>
                    {item.kind === "Diploma" || item.kind === "Degree" ? (
                      <Field label="Grading">
                        <select
                          value={item.grading}
                          onChange={(event) =>
                            setExtraQuals((current) =>
                              current.map((row) =>
                                row.id === item.id
                                  ? { ...row, grading: event.target.value as ExtraQualification["grading"] }
                                  : row,
                              ),
                            )
                          }
                        >
                          <option value="marks">Marks</option>
                          <option value="cgpa">CGPA</option>
                        </select>
                      </Field>
                    ) : null}
                    {item.kind === "Diploma" || item.kind === "Degree" ? (
                      item.grading === "cgpa" ? (
                        <Field label="CGPA">
                          <input
                            inputMode="decimal"
                            placeholder="e.g. 3.45"
                            value={item.cgpa}
                            onChange={(event) =>
                              setExtraQuals((current) =>
                                current.map((row) => (row.id === item.id ? { ...row, cgpa: event.target.value } : row)),
                              )
                            }
                          />
                        </Field>
                      ) : (
                        <Field label="Marks (obtained/total)">
                          <input
                            placeholder="e.g. 780/1100"
                            value={item.marks}
                            onChange={(event) =>
                              setExtraQuals((current) =>
                                current.map((row) => (row.id === item.id ? { ...row, marks: event.target.value } : row)),
                              )
                            }
                          />
                        </Field>
                      )
                    ) : (
                      <Field label="Marks / result">
                        <input
                          value={item.marks}
                          onChange={(event) =>
                            setExtraQuals((current) =>
                              current.map((row) => (row.id === item.id ? { ...row, marks: event.target.value } : row)),
                            )
                          }
                        />
                      </Field>
                    )}
                  </div>
                </article>
              ))}

              <button className="admit-add" type="button" onClick={addQualification}>
                <span className="ms">add_circle</span>
                Add another qualification
              </button>
            </StepCard>
          ) : null}

          {step === 4 ? (
            <StepCard
              title="Step 4: Parents and guardian"
              lede="Household contact details for emergencies and sibling records."
              badge="Household"
              icon="family_restroom"
            >
              <div className="admit-grid admit-grid-2">
                <Field label="Father / guardian occupation *" error={fieldIssue("fatherOccupation")}>
                  <input value={form.fatherOccupation} onChange={(event) => update("fatherOccupation", event.target.value)} />
                </Field>
                <Field label="Annual household income *" error={fieldIssue("householdIncome")}>
                  <select value={form.householdIncome} onChange={(event) => update("householdIncome", event.target.value)}>
                    <option value="">Select</option>
                    <option value="Below PKR 500,000">Below PKR 500,000</option>
                    <option value="PKR 500,000 to PKR 1,000,000">PKR 500,000 to PKR 1,000,000</option>
                    <option value="PKR 1,000,000 to PKR 2,500,000">PKR 1,000,000 to PKR 2,500,000</option>
                    <option value="PKR 2,500,000 to PKR 5,000,000">PKR 2,500,000 to PKR 5,000,000</option>
                    <option value="Above PKR 5,000,000">Above PKR 5,000,000</option>
                  </select>
                </Field>
                <Field label="Emergency contact *" error={fieldIssue("emergencyContact")}>
                  <input value={form.emergencyContact} onChange={(event) => update("emergencyContact", event.target.value)} />
                </Field>
                <Field label="Emergency phone *" error={fieldIssue("emergencyPhone")}>
                  <input value={form.emergencyPhone} onChange={(event) => update("emergencyPhone", event.target.value)} />
                </Field>
              </div>
              <label className="admit-check">
                <input
                  checked={form.hasSibling}
                  type="checkbox"
                  onChange={(event) => update("hasSibling", event.target.checked)}
                />
                <span>A sibling or parent is currently enrolled or employed at the university.</span>
              </label>
              {form.hasSibling ? (
                <div className="admit-grid admit-grid-2 admit-sibling">
                  <Field label="Sibling / relative name">
                    <input value={form.siblingName} onChange={(event) => update("siblingName", event.target.value)} />
                  </Field>
                  <Field label="Registration / roll number">
                    <input value={form.siblingRegNo} onChange={(event) => update("siblingRegNo", event.target.value)} />
                  </Field>
                </div>
              ) : null}
            </StepCard>
          ) : null}

          {step === 5 ? (
            <StepCard
              title="Step 5: Document checklist"
              lede="Upload clear scans of the required documents. Files are stored privately on the admissions server, not in the database."
              badge={`${documents.filter((item) => uploadedDoc(item.docType)).length} of ${documents.length} uploaded`}
              icon="upload_file"
            >
              {documentItems.length ? (
                <div className="admit-alert">
                  <span className="ms">warning</span>
                  <div>
                    <strong>Documents to revise</strong>
                    <ul className="admit-change-list">
                      {documentItems.map((item) => (
                        <li key={item.id}>
                          <em>{item.targetLabel}</em>
                          <span>{item.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
              {documents.map((item) => {
                const doc = uploadedDoc(item.docType);
                const busy = uploadingDocType === item.docType;
                const missing = Boolean(fieldIssue(item.docType));
                return (
                  <div className={`admit-doc${missing ? " is-invalid" : ""}`} key={item.docType}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {doc
                          ? `${doc.originalName} · ${doc.sizeLabel} · ${new Date(doc.uploadedAt).toLocaleDateString("en-GB")}`
                          : missing
                            ? fieldIssue(item.docType)
                            : item.hint}
                      </span>
                    </div>
                    <div className="admit-doc-actions">
                      <input
                        ref={(node) => {
                          documentUploadRefs.current[item.docType] = node;
                        }}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        hidden
                        onChange={(event) => {
                          queueQueueUpload(item.docType, event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                      />
                      <button
                        className="admit-btn admit-btn--ghost"
                        type="button"
                        disabled={!doc}
                        onClick={() => openDocument(item.docType, item.title)}
                      >
                        Inspect
                      </button>
                      <button
                        className="admit-btn admit-btn--cobalt"
                        type="button"
                        disabled={busy}
                        onClick={() => documentUploadRefs.current[item.docType]?.click()}
                      >
                        {busy ? "Uploading…" : doc ? "Replace" : "Upload"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </StepCard>
          ) : null}

          {step === 6 ? (
            <StepCard
              title="Step 6: MCB bank challan"
              lede="Download the prefilled MCB challan PDF, pay Rs. 3,000 at the bank, then upload the stamped slip. Payment status stays separate from the application."
              badge={challanSlipFile ? "Slip uploaded" : challanDownloaded ? "Downloaded" : "Not downloaded"}
              icon="payments"
            >
              <div className="admit-grid admit-grid-2">
                <article className="admit-record">
                  <header>
                    <strong>Prefilled MCB challan</strong>
                    <span className={challanDownloaded ? "admit-pill admit-pill--ok" : "admit-pill"}>
                      {challanDownloaded ? "Ready to redownload" : "Not downloaded yet"}
                    </span>
                  </header>
                  <dl className="admit-challan-facts">
                    <div>
                      <dt>Bank</dt>
                      <dd>{MCB_CHALLAN.bankName}</dd>
                    </div>
                    <div>
                      <dt>Admission A/C</dt>
                      <dd>{MCB_CHALLAN.accountNo}</dd>
                    </div>
                    <div>
                      <dt>Category</dt>
                      <dd>{MCB_CHALLAN.category}</dd>
                    </div>
                    <div>
                      <dt>Fee</dt>
                      <dd>{MCB_CHALLAN.feeLabel}</dd>
                    </div>
                    <div>
                      <dt>Challan No.</dt>
                      <dd>{form.challanSlip || dashboard.data?.applicationNo || "Assigned on first download"}</dd>
                    </div>
                    <div>
                      <dt>Prefill from</dt>
                      <dd>
                        {form.applicantName}
                        {form.surname ? ` ${form.surname}` : ""}
                        {" · "}
                        {nameOf(form.programChoices[0] ?? "")}
                      </dd>
                    </div>
                  </dl>
                  <p className="muted">
                    Download a PDF of the official 4-copy MCB challan with your name, father, CNIC, and mobile filled in. Leave the program line blank for the bank.
                  </p>
                  <div className="admit-doc-actions">
                    <button className="admit-btn admit-btn--cobalt" type="button" onClick={() => void downloadChallan(challanDownloaded)}>
                      <span className="ms">{challanDownloaded ? "restart_alt" : "download"}</span>
                      {challanDownloaded ? "Redownload PDF" : "Download prefilled PDF"}
                    </button>
                  </div>
                </article>

                <article className="admit-record">
                  <header>
                    <strong>Stamped slip upload</strong>
                    <span className={challanSlipFile ? "admit-pill admit-pill--ok" : "admit-pill"}>
                      {challanSlipFile ? "Uploaded" : "Required after payment"}
                    </span>
                  </header>
                  {challanSlipFile ? (
                    <div className="admit-slip-preview">
                      {challanSlipFile.name.toLowerCase().endsWith(".pdf") ? (
                        <div className="admit-slip-file">
                          <span className="ms">picture_as_pdf</span>
                          <div>
                            <strong>{challanSlipFile.name}</strong>
                            <small>{challanSlipFile.sizeLabel}</small>
                          </div>
                        </div>
                      ) : (
                        <img src={challanSlipFile.url} alt="Uploaded stamped challan" />
                      )}
                      <div className="admit-doc-actions">
                        <a className="admit-btn admit-btn--ghost" href={challanSlipFile.url} target="_blank" rel="noreferrer">
                          <span className="ms">open_in_new</span>
                          View
                        </a>
                        <button className="admit-btn admit-btn--ghost" type="button" onClick={clearChallanSlip}>
                          <span className="ms">delete</span>
                          Remove
                        </button>
                        <button className="admit-btn admit-btn--cobalt" type="button" onClick={() => challanUploadRef.current?.click()}>
                          <span className="ms">upload</span>
                          Replace upload
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="muted">
                        After paying at MCB, upload the bank-stamped candidate copy (PDF, JPG, or PNG, max 5 MB).
                      </p>
                      <button className="admit-btn admit-btn--cobalt" type="button" onClick={() => challanUploadRef.current?.click()}>
                        <span className="ms">upload_file</span>
                        Upload stamped slip
                      </button>
                    </>
                  )}
                  <input
                    ref={challanUploadRef}
                    className="admit-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(event) => onChallanSlipSelected(event.target.files)}
                  />
                  <div className="admit-grid admit-grid-2" style={{ marginTop: 12 }}>
                    <Field label="Deposit date">
                      <input type="date" value={form.challanDate} onChange={(event) => update("challanDate", event.target.value)} />
                    </Field>
                    <Field label="Challan / slip number">
                      <input
                        value={form.challanSlip}
                        onChange={(event) => update("challanSlip", event.target.value)}
                        placeholder="Filled from download"
                      />
                    </Field>
                  </div>
                </article>
              </div>
            </StepCard>
          ) : null}

          {step === 7 ? (
            <StepCard
              title="Step 7: Review"
              lede="Check each section before the declaration. Submit on the next step sends the file for admissions review."
              badge="Draft review"
              icon="fact_check"
            >
              <ReviewBlock title="1. Personal profile" icon="person" onEdit={() => goToStep(1)}>
                <dl className="admit-review-grid">
                  <div><dt>Name</dt><dd>{form.applicantName}</dd></div>
                  <div><dt>Surname</dt><dd>{form.surname || "—"}</dd></div>
                  <div><dt>Father</dt><dd>{form.fatherName}</dd></div>
                  <div><dt>CNIC</dt><dd>{form.cnicBform}</dd></div>
                  <div><dt>Domicile</dt><dd>{form.domicileDistrict}</dd></div>
                </dl>
              </ReviewBlock>
              <ReviewBlock title="2. Program preferences" icon="fact_check" onEdit={() => goToStep(2)}>
                <ol>
                  {form.programChoices
                    .map((choice, index) => ({ choice, index }))
                    .filter((row) => row.choice.trim())
                    .map((row) => (
                      <li key={`review-choice-${row.index}`}>
                        {ordinalLabel(row.index)}: {nameOf(row.choice)}
                      </li>
                    ))}
                </ol>
              </ReviewBlock>
              <ReviewBlock title="3. Academic records" icon="school" onEdit={() => goToStep(3)}>
                <div className="admit-grid admit-grid-2">
                  <p>SSC: {form.sscObtained} / {form.sscTotal} ({sscPercent}%) · {form.sscBoard}</p>
                  <p>HSC: {form.obtainedMarks} / {form.totalMarks} ({hscPercent}%) · {form.hscBoard}</p>
                </div>
              </ReviewBlock>
              <ReviewBlock title="4. Bank challan" icon="payments" onEdit={() => goToStep(6)}>
                <p>
                  {MCB_CHALLAN.bankName}
                  {form.challanSlip ? ` · Slip ${form.challanSlip}` : " · Challan not downloaded yet"}
                  {challanSlipFile ? ` · Uploaded ${challanSlipFile.name}` : " · Stamped slip not uploaded"}
                  {" · Fee PKR 3,000"}
                </p>
              </ReviewBlock>
            </StepCard>
          ) : null}

          {step === 8 ? (
            <StepCard
              title="Step 8: Declaration"
              lede={
                isResubmit
                  ? "Confirm the corrections, then resubmit the application for review."
                  : "Confirm the statements, then submit the application for review."
              }
              badge="Final step"
              icon="verified_user"
            >
              {submitIssues.length > 0 ? (
                <div className="admit-missing" role="alert">
                  <strong>Complete these required items before submit</strong>
                  <ul>
                    {submitIssues.map((issue) => (
                      <li key={`${issue.field}-${issue.message}`}>
                        <button className="admit-text" type="button" onClick={() => goToStep(issue.step)}>
                          Step {issue.step}: {issue.message}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="admit-oath">
                <label className="admit-check">
                  <input checked={form.declareTrue} type="checkbox" onChange={(event) => update("declareTrue", event.target.checked)} />
                  <span>The information and documents in this application are true and complete.</span>
                </label>
                <label className="admit-check">
                  <input checked={form.declareRules} type="checkbox" onChange={(event) => update("declareRules", event.target.checked)} />
                  <span>I agree to follow university admission regulations and the student code of conduct.</span>
                </label>
                <label className="admit-check">
                  <input
                    checked={form.declareCertificate}
                    type="checkbox"
                    onChange={(event) => update("declareCertificate", event.target.checked)}
                  />
                  <span>The HSC marks entered here match the original certificate.</span>
                </label>
              </div>
              <div className="admit-grid admit-grid-2">
                <Field label="Type your full legal name *">
                  <input
                    className="admit-signature"
                    value={form.declarationName}
                    onChange={(event) => update("declarationName", event.target.value)}
                  />
                </Field>
                <Field label="Draft date">
                  <input value={draftDate} readOnly />
                </Field>
              </div>
              {submitted ? (
                <p className="admit-saved">
                  {submittedAsResubmit
                    ? `Resubmitted for review${dashboard.data?.applicationNo ? ` (${dashboard.data.applicationNo})` : ""}.`
                    : `Submitted${dashboard.data?.applicationNo ? ` (${dashboard.data.applicationNo})` : ""}. Admissions will review your file.`}
                </p>
              ) : saved ? (
                <p className="admit-saved">
                  Draft saved
                  {dashboard.data?.applicationNo ? ` (${dashboard.data.applicationNo})` : ""}.
                </p>
              ) : null}
            </StepCard>
          ) : null}

          <div className="admit-footer">
            <div className="admit-footer-left">
              <button className="admit-btn admit-btn--ghost" type="button" onClick={saveDraft} disabled={saveDraftMutation.isPending}>
                <span className="ms">save</span>
                {saveDraftMutation.isPending ? "Saving..." : "Save draft"}
              </button>
              <button className="admit-btn admit-btn--ghost" type="button" disabled={step === 1} onClick={() => goToStep(step - 1)}>
                <span className="ms">arrow_back</span>
                {step === 1 ? "Start of form" : `Previous: ${current.prev}`}
              </button>
            </div>
            {step < 8 ? (
              <button className="admit-btn admit-btn--primary" type="button" onClick={() => goToStep(step + 1)}>
                Next: {current.next}
                <span className="ms">arrow_forward</span>
              </button>
            ) : (
              <button
                className="admit-btn admit-btn--primary"
                type="button"
                disabled={submitApplication.isPending || submitted}
                onClick={attemptSubmit}
              >
                {submitLabel}
                <span className="ms">send</span>
              </button>
            )}
          </div>
        </div>

        <aside className="admit-side">
          <section className="admit-panel">
            <header>
              <h2>
                <span className="ms">fact_check</span>
                Program choices
              </h2>
              <button className="admit-text" type="button" onClick={() => goToStep(2)}>
                Edit
              </button>
            </header>
            {form.programChoices.some((choice) => choice.trim()) ? (
              form.programChoices.map((choice, index) =>
                choice.trim() ? (
                  <div className="admit-side-choice" key={`side-choice-${index}`}>
                    <span>{ordinalLabel(index)} preference</span>
                    <strong>{nameOf(choice)}</strong>
                    {index === 0 ? <small>HSC on draft: {hscPercent}%</small> : null}
                  </div>
                ) : null,
              )
            ) : (
              <div className="admit-side-choice">
                <span>Preferences</span>
                <strong>Not selected yet</strong>
                <small>Up to 10 BS choices; repeats allowed</small>
              </div>
            )}
          </section>

          <section className="admit-panel">
            <header>
              <h2>
                <span className="ms">inventory_2</span>
                Linked credentials
              </h2>
            </header>
            <div className="admit-side-choice">
              <span>Documents</span>
              <strong>
                {documents.filter((item) => uploadedDoc(item.docType)).length} of {documents.length} uploaded
              </strong>
              <small>Stored privately on the admissions server</small>
            </div>
            <div className="admit-side-choice">
              <span>Bank challan</span>
              <strong>
                {challanSlipFile ? "Slip uploaded" : challanDownloaded ? "Challan downloaded" : "Download MCB challan"}
              </strong>
              <small>
                {MCB_CHALLAN.bankName} · {form.challanSlip || "No."} · PKR 3,000 · payment status separate
              </small>
            </div>
            <div className="admit-side-choice">
              <span>HSC marks</span>
              <strong>
                {form.obtainedMarks} / {form.totalMarks}
              </strong>
              <small>
                {hscPercent}% · {form.hscBoard}
                {changeRequest ? " · correction open" : ""}
              </small>
            </div>
            <button className="admit-text" type="button" onClick={() => setHelpOpen(true)}>
              <span className="ms">contact_support</span>
              Admissions help
            </button>
          </section>
        </aside>
      </div>

      {inspect ? (
        <div
          className="admit-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setInspect(null);
            }
          }}
        >
          <div className="admit-dialog">
            <header>
              <h3 id="inspect-title">{inspect.title}</h3>
              <button className="admit-icon-btn" type="button" onClick={() => setInspect(null)} aria-label="Close">
                <span className="ms">close</span>
              </button>
            </header>
            <p>{inspect.detail}</p>
            <button className="admit-btn admit-btn--cobalt" type="button" onClick={() => setInspect(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {helpOpen ? (
        <div
          className="admit-overlay admit-overlay--drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setHelpOpen(false);
            }
          }}
        >
          <aside className="admit-drawer">
            <header>
              <h3 id="help-title">Admissions help</h3>
              <button className="admit-icon-btn" type="button" onClick={() => setHelpOpen(false)} aria-label="Close help">
                <span className="ms">close</span>
              </button>
            </header>
            <div className="admit-faq">
              <strong>How do I answer the marks notice?</strong>
              <p>Open step 3, enter the HSC marks from the certificate, then keep the draft. Official verification is still a later step.</p>
            </div>
            <div className="admit-faq">
              <strong>How do I upload documents?</strong>
              <p>Open step 5, choose Upload on each required slot, and select a PDF, JPG, or PNG up to 5 MB. Inspect opens the file you uploaded.</p>
            </div>
            <div className="admit-faq">
              <strong>Does saving submit the application?</strong>
              <p>Save draft stores your answers on the server. Use Submit application on the last step when the file is complete.</p>
            </div>
            <button className="admit-btn admit-btn--primary" type="button" onClick={() => setHelpOpen(false)}>
              Done
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function StepCard({
  title,
  lede,
  badge,
  icon,
  children,
}: {
  title: string;
  lede: string;
  badge: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section className="admit-card">
      <header className="admit-card-head">
        <div>
          <h1>{title}</h1>
          <p>{lede}</p>
        </div>
        <span className="admit-badge">
          <span className="ms">{icon}</span>
          {badge}
        </span>
      </header>
      {children}
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className={`admit-field${error ? " is-invalid" : ""}`}>
      <span>{label}</span>
      {children}
      {error ? <small className="admit-field-error">{error}</small> : null}
    </label>
  );
}

function ProgramSelect({
  programs,
  value,
  onChange,
}: {
  programs: ProgramOption[] | undefined;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = programs ?? [];
  const known = options.some((program) => program.id === value || program.code === value);
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select a program</option>
      {!known && value ? <option value={value}>{value}</option> : null}
      {options.map((program) => (
        <option key={program.id} value={program.id}>
          {program.name}
        </option>
      ))}
    </select>
  );
}

function ReviewBlock({
  title,
  icon,
  onEdit,
  children,
}: {
  title: string;
  icon: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <article className="admit-review">
      <header>
        <strong>
          <span className="ms">{icon}</span>
          {title}
        </strong>
        <button className="admit-text" type="button" onClick={onEdit}>
          Edit section
        </button>
      </header>
      {children}
    </article>
  );
}
