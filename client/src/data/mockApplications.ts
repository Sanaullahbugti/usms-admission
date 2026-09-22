import type {ApplicantDashboardData,ApplicationSummary} from "../types/application";
export const applicantDashboard:ApplicantDashboardData={applicantName:"Ayesha Ali",applicationNo:"USMS-26-000123",admissionCycle:"Undergraduate 2026-2027",status:"DRAFT",completionPercentage:58,completedSections:["Personal Information","Program Choices","Education"],pendingSections:["Family","Documents","Review & Declaration"]};
export const applications:ApplicationSummary[]=[
{id:"1",applicationNo:"USMS-26-000101",applicantName:"Ali Raza",cnic:"41304-1234567-1",mobile:"0300-1234567",program:"BS Computer Science",district:"Hyderabad",status:"UNDER_REVIEW",paymentStatus:"VERIFIED",submittedAt:"2026-09-21"},
{id:"2",applicationNo:"USMS-26-000102",applicantName:"Sara Khan",cnic:"41306-7654321-2",mobile:"0312-7654321",program:"BS Information Technology",district:"Matiari",status:"CHANGE_REQUESTED",paymentStatus:"SUBMITTED",submittedAt:"2026-09-21"},
{id:"3",applicationNo:"USMS-26-000103",applicantName:"Ahmed Shah",cnic:"45203-1112233-4",mobile:"0333-1112233",program:"BBA",district:"Shaheed Benazirabad",status:"APPROVED",paymentStatus:"VERIFIED",submittedAt:"2026-09-20"}];
