/**
 * Application workflow statuses — single source of truth for the client.
 * Keep in sync with Prisma `ApplicationStatus` and ARCHITECTURE.md workflow.
 */

export const APPLICATION_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  CHANGE_REQUESTED: "CHANGE_REQUESTED",
  RESUBMITTED: "RESUBMITTED",
  DOCUMENTS_VERIFIED: "DOCUMENTS_VERIFIED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

/** All statuses in workflow order. */
export const APPLICATION_STATUSES = [
  APPLICATION_STATUS.DRAFT,
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.CHANGE_REQUESTED,
  APPLICATION_STATUS.RESUBMITTED,
  APPLICATION_STATUS.DOCUMENTS_VERIFIED,
  APPLICATION_STATUS.APPROVED,
  APPLICATION_STATUS.REJECTED,
] as const satisfies readonly ApplicationStatus[];

/** Applicant can still edit the form. */
export const EDITABLE_STATUSES = [
  APPLICATION_STATUS.DRAFT,
  APPLICATION_STATUS.CHANGE_REQUESTED,
] as const satisfies readonly ApplicationStatus[];

/** Show post-submit confirmation instead of the wizard form. */
export const POST_SUBMIT_VIEW_STATUSES = [
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.APPROVED,
] as const satisfies readonly ApplicationStatus[];

/** Terminal review outcomes — dossier closed for further review actions. */
export const CLOSED_STATUSES = [
  APPLICATION_STATUS.APPROVED,
  APPLICATION_STATUS.REJECTED,
] as const satisfies readonly ApplicationStatus[];

/** Statuses shown in admin queue filters (excludes DRAFT). */
export const ADMIN_FILTER_STATUSES = [
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.CHANGE_REQUESTED,
  APPLICATION_STATUS.DOCUMENTS_VERIFIED,
  APPLICATION_STATUS.APPROVED,
  APPLICATION_STATUS.REJECTED,
] as const satisfies readonly ApplicationStatus[];

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  CHANGE_REQUESTED: "Change requested",
  RESUBMITTED: "Resubmitted",
  DOCUMENTS_VERIFIED: "Documents verified",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function includesStatus(list: readonly ApplicationStatus[], status: ApplicationStatus): boolean {
  return list.includes(status);
}

export function isEditableStatus(status: ApplicationStatus): boolean {
  return includesStatus(EDITABLE_STATUSES, status);
}

export function isPostSubmitViewStatus(status: ApplicationStatus): boolean {
  return includesStatus(POST_SUBMIT_VIEW_STATUSES, status);
}

export function isClosedStatus(status: ApplicationStatus): boolean {
  return includesStatus(CLOSED_STATUSES, status);
}
