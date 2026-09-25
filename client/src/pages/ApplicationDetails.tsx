import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DossierInspector } from "../components/DossierInspector";
import { useAuth } from "../auth/AuthProvider";
import { hasPermission } from "../types/auth";
import { applicationService } from "../services/applicationService";
import type { ChangeRequestItem } from "../types/application";

export function ApplicationDetails() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [error, setError] = useState("");
  const application = useQuery({
    queryKey: ["admin-application", id],
    queryFn: () => applicationService.getApplication(id ?? ""),
    enabled: Boolean(id),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin-application", id] });
    void queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
    void queryClient.invalidateQueries({ queryKey: ["applicant-dashboard"] });
  }

  const requestChange = useMutation({
    mutationFn: (items: ChangeRequestItem[]) => applicationService.requestChange(id ?? "", items),
    onSuccess: (file) => {
      if (!file) {
        setError("Could not save the change request. Pin at least one clear comment.");
        return;
      }
      setError("");
      refresh();
    },
  });
  const approveApplication = useMutation({
    mutationFn: (message?: string) => applicationService.approveApplication(id ?? "", message),
    onSuccess: (file) => {
      if (!file) {
        setError("Could not approve this application.");
        return;
      }
      setError("");
      refresh();
    },
  });
  const rejectApplication = useMutation({
    mutationFn: (message: string) => applicationService.rejectApplication(id ?? "", message),
    onSuccess: (file) => {
      if (!file) {
        setError("Could not reject this application. Add a clear rejection reason.");
        return;
      }
      setError("");
      refresh();
    },
  });
  const reviewPending = requestChange.isPending || approveApplication.isPending || rejectApplication.isPending;

  if (application.isPending) {
    return <p>Loading application...</p>;
  }

  if (!application.data) {
    return (
      <p>
        Application not found. <Link to="/admin/applications">Back to applications</Link>
      </p>
    );
  }

  return (
    <div className="cc-detail">
      <Link className="cc-back" to="/admin/dashboard">
        Back to command center
      </Link>
      <DossierInspector
        file={application.data}
        pending={reviewPending}
        error={error}
        onRequestChange={(items) => requestChange.mutate(items)}
        onApprove={(message) => approveApplication.mutate(message)}
        onReject={(message) => rejectApplication.mutate(message)}
        canReview={hasPermission(user, "application:review")}
        canApprove={hasPermission(user, "application:approve")}
        canReject={hasPermission(user, "application:reject")}
      />
    </div>
  );
}
