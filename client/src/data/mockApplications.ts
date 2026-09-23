import type {
  ApplicantDashboardData,
  ApplicationSummary,
  ProgramOption,
  VcDashboardData,
} from "../types/application";

export const applicantDashboard: ApplicantDashboardData = {
  applicantName: "Muhammad Ali",
  applicationNo: "APP-2026-08192",
  admissionCycle: "Undergraduate 2026-2027",
  status: "DRAFT",
  completionPercentage: 37,
  completedSections: ["Personal Info", "Program Choices"],
  pendingSections: ["Education History", "Parents & Family", "Documents", "Bank Challan", "Review", "Declaration"],
};

export const programs: ProgramOption[] = [
  { code: "BSCS", name: "BS Computer Science" },
  { code: "BSIT", name: "BS Information Technology" },
  { code: "BBA", name: "Bachelor of Business Administration" },
];

export const vcDashboard: VcDashboardData = {
  cycleName: "Undergraduate 2026-2027",
  phase: "1st Merit Ratification",
  demandYield: { applications: 1842, seats: 2100, capacityPercent: 87.7 },
  eligiblePool: { qualified: 1489, ratePercent: 80.8 },
  feeRealization: { amountLabel: "PKR 6.45M", clearedPercent: 94.2 },
  topMeritCutoff: { percent: "81.2%", program: "CS Peak" },
  diversity: { femaleShare: "41.5%", urban: "61%", rural: "34%" },
  programs: [
    {
      code: "BSCS",
      name: "BS Computer Science",
      faculty: "Faculty of Computing",
      sanctionedSeats: 120,
      candidates: 640,
      demandRatio: "5.3x",
      projectedCutoff: "81.2%",
      fillPercent: 100,
    },
    {
      code: "BSIT",
      name: "BS Information Technology",
      faculty: "Faculty of Computing",
      sanctionedSeats: 100,
      candidates: 390,
      demandRatio: "3.9x",
      projectedCutoff: "75.0%",
      fillPercent: 100,
    },
    {
      code: "BBA",
      name: "Bachelor of Business Administration",
      faculty: "Faculty of Management Sciences",
      sanctionedSeats: 150,
      candidates: 412,
      demandRatio: "2.7x",
      projectedCutoff: "69.8%",
      fillPercent: 88,
    },
  ],
};

export const applications: ApplicationSummary[] = [
  {
    id: "1",
    applicationNo: "APP-260012",
    applicantName: "Ali Ahmed",
    cnic: "42101-1234567-1",
    mobile: "0300-1234567",
    program: "BS Computer Science",
    district: "Karachi",
    hscPercentage: 82.5,
    status: "UNDER_REVIEW",
    paymentStatus: "VERIFIED",
    submittedAt: "2026-09-21",
  },
  {
    id: "2",
    applicationNo: "APP-260018",
    applicantName: "Sara Khan",
    cnic: "41306-7654321-2",
    mobile: "0312-7654321",
    program: "BS Information Technology",
    district: "Hyderabad",
    hscPercentage: 76.0,
    status: "CHANGE_REQUESTED",
    paymentStatus: "SUBMITTED",
    submittedAt: "2026-09-21",
  },
  {
    id: "3",
    applicationNo: "APP-260024",
    applicantName: "Ahmed Shah",
    cnic: "45203-1112233-4",
    mobile: "0333-1112233",
    program: "BBA",
    district: "Sukkur",
    hscPercentage: 71.4,
    status: "APPROVED",
    paymentStatus: "VERIFIED",
    submittedAt: "2026-09-20",
  },
];
