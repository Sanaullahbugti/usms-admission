import { useEffect, useRef, useState } from "react";
import type {
  ApplicationDocument,
  ApplicationFile,
  ChangeRequestItem,
  ChangeTargetKind,
} from "../types/application";

const tabs = ["Dossier", "Education", "Documents", "Audit"] as const;
type Tab = (typeof tabs)[number];

type DraftComment = ChangeRequestItem;

function marksPercent(obtained: string, total: string) {
  const got = Number(obtained);
  const max = Number(total);
  if (!Number.isFinite(got) || !Number.isFinite(max) || max <= 0) {
    return "0.00";
  }
  return ((got / max) * 100).toFixed(2);
}

function paymentLabel(status: ApplicationFile["paymentStatus"]) {
  if (status === "VERIFIED") return "Verified";
  if (status === "SUBMITTED") return "Uploaded";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

function draftKey(kind: ChangeTargetKind, key: string) {
  return `${kind}:${key}`;
}

function CommentTrigger({
  active,
  disabled,
  label = "Request change",
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "cc-comment-btn is-on" : "cc-comment-btn"}
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={active ? "Edit pending comment" : label}
    >
      <span className="ms">{active ? "chat" : "add_comment"}</span>
      <span>{active ? "Edit comment" : label}</span>
    </button>
  );
}

export function DossierInspector({
  file,
  onRequestChange,
  onApprove,
  onReject,
  pending,
  error,
  onOpenFull,
  onClose,
}: {
  file: ApplicationFile;
  onRequestChange: (items: ChangeRequestItem[]) => void;
  onApprove: (message?: string) => void;
  onReject: (message: string) => void;
  pending: boolean;
  error: string;
  onOpenFull?: () => void;
  onClose?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("Documents");
  const [drafts, setDrafts] = useState<DraftComment[]>([]);
  const [composer, setComposer] = useState<{ kind: ChangeTargetKind; key: string; label: string } | null>(null);
  const [draftText, setDraftText] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [notice, setNotice] = useState("");
  const [documentId, setDocumentId] = useState(file.documents[0]?.id ?? "");
  const composerRef = useRef<HTMLDivElement>(null);
  const draftInputRef = useRef<HTMLTextAreaElement>(null);
  const closed = file.status === "APPROVED" || file.status === "REJECTED";

  useEffect(() => {
    setTab("Documents");
    setDrafts([]);
    setComposer(null);
    setDraftText("");
    setRejectReason("");
    setNotice("");
    setDocumentId(file.documents.find((item) => item.title.toLowerCase().includes("hsc"))?.id ?? file.documents[0]?.id ?? "");
  }, [file.id]);

  useEffect(() => {
    if (error) {
      setNotice("");
    }
  }, [error]);

  useEffect(() => {
    if (!composer) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
      window.setTimeout(() => {
        draftInputRef.current?.focus({ preventScroll: true });
      }, 180);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [composer]);

  const hsc = file.education.find((record) => record.level === "HSC");
  const ssc = file.education.find((record) => record.level === "SSC");
  const selected = file.documents.find((item) => item.id === documentId) ?? file.documents[0];

  function openComposer(kind: ChangeTargetKind, key: string, label: string, preferredTab?: Tab) {
    if (closed) {
      setNotice("This application is already closed. No further review actions are allowed.");
      return;
    }
    if (preferredTab) {
      setTab(preferredTab);
    }
    setComposer({ kind, key, label });
    const existing = drafts.find((item) => item.targetKind === kind && item.targetKey === key);
    setDraftText(existing?.message ?? "");
    setNotice("");
  }

  function pinComment() {
    if (!composer || closed) {
      return;
    }
    const message = draftText.trim();
    if (message.length < 8) {
      setNotice("Write at least 8 characters so the applicant knows what to fix.");
      return;
    }
    const next: DraftComment = {
      id: crypto.randomUUID(),
      targetKind: composer.kind,
      targetKey: composer.key,
      targetLabel: composer.label,
      message,
    };
    setDrafts((current) => {
      const without = current.filter((item) => !(item.targetKind === composer.kind && item.targetKey === composer.key));
      return [...without, next];
    });
    setComposer(null);
    setDraftText("");
    setNotice("");
  }

  function removeDraft(kind: ChangeTargetKind, key: string) {
    setDrafts((current) => current.filter((item) => !(item.targetKind === kind && item.targetKey === key)));
  }

  function commentCountFor(kind: ChangeTargetKind, key: string) {
    return drafts.some((item) => item.targetKind === kind && item.targetKey === key);
  }

  function submitChangeRequest() {
    if (closed) {
      setNotice("This application is already closed. No further review actions are allowed.");
      return;
    }
    if (drafts.length === 0) {
      setNotice("Pin at least one comment on a document or field, then submit the review.");
      return;
    }
    setNotice("");
    onRequestChange(drafts.map((item) => ({ ...item })));
    setDrafts([]);
    setComposer(null);
    setDraftText("");
    setTab("Audit");
  }

  function sendReject() {
    if (closed) {
      setNotice("This application is already closed. No further review actions are allowed.");
      return;
    }
    const note = rejectReason.trim();
    if (note.length < 8) {
      setNotice("Write a rejection reason of at least 8 characters.");
      return;
    }
    setNotice("");
    onReject(note);
    setDrafts([]);
    setComposer(null);
    setTab("Audit");
  }

  function sendApprove() {
    if (closed) {
      setNotice("This application is already closed. No further review actions are allowed.");
      return;
    }
    if (drafts.length > 0) {
      setNotice("Clear or submit pending change comments before approving.");
      return;
    }
    setNotice("");
    onApprove(rejectReason.trim() || undefined);
    setDrafts([]);
    setComposer(null);
    setTab("Audit");
  }

  return (
    <section className="cc-inspector">
      <header className="cc-inspector-head">
        <div>
          <h2>
            <span className="cc-live" />
            {file.applicationNo} — {file.applicantName}
          </h2>
          <span className={`status status--${file.status.toLowerCase()}`}>{file.status.replaceAll("_", " ")}</span>
        </div>
        <div>
          {drafts.length > 0 ? (
            <span className="cc-review-chip">
              <span className="ms">rate_review</span>
              {drafts.length} pending comment{drafts.length === 1 ? "" : "s"}
            </span>
          ) : null}
          {onOpenFull ? (
            <button className="cc-icon-btn" type="button" onClick={onOpenFull} title="Open the full file">
              <span className="ms">open_in_full</span>
            </button>
          ) : null}
          {onClose ? (
            <button className="cc-icon-btn" type="button" onClick={onClose} title="Close dossier">
              <span className="ms">close</span>
            </button>
          ) : null}
        </div>
      </header>
      <div className="cc-tabs" role="tablist">
        {tabs.map((item) => (
          <button key={item} className={item === tab ? "is-active" : undefined} type="button" onClick={() => setTab(item)}>
            {item === "Dossier" ? "Dossier & personal" : item === "Education" ? "Education" : item === "Documents" ? "Document inspector" : "Audit history"}
          </button>
        ))}
      </div>
      <div className="cc-inspector-body">
        {tab === "Dossier" ? (
          <dl className="cc-facts">
            {(
              [
                ["fatherName", "Father / guardian", file.fatherName],
                ["cnic", "CNIC", file.cnic],
                ["mobile", "Mobile", file.mobile],
                ["email", "Email", file.email],
                ["dateOfBirth", "Date of birth", file.dateOfBirth],
                ["gender", "Gender", file.gender],
                ["district", "District", file.district],
                ["program", "Program", file.program],
                ["postalAddress", "Address", file.postalAddress],
              ] as const
            ).map(([key, label, value]) => (
              <div key={key} className={key === "postalAddress" ? "is-wide" : undefined}>
                <dt>
                  <span>{label}</span>
                  {!closed ? (
                    <CommentTrigger
                      active={commentCountFor("profile", key)}
                      disabled={pending}
                      label="Comment"
                      onClick={() => openComposer("profile", key, label, "Dossier")}
                    />
                  ) : null}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {tab === "Education" ? (
          <div className="cc-edu-grid">
            <div className="cc-box">
              <header>
                <span>Academic record</span>
                {!closed ? (
                  <CommentTrigger
                    active={commentCountFor("education", "hsc_marks")}
                    disabled={pending}
                    label="Comment"
                    onClick={() => openComposer("education", "hsc_marks", "HSC / Intermediate marks", "Education")}
                  />
                ) : null}
              </header>
              {hsc ? (
                <p>
                  <span>Intermediate (HSC)</span>
                  <strong>
                    {hsc.obtainedMarks} / {hsc.totalMarks} ({marksPercent(hsc.obtainedMarks, hsc.totalMarks)}%)
                  </strong>
                </p>
              ) : null}
              {ssc ? (
                <p>
                  <span>SSC / Matric</span>
                  <strong>
                    {ssc.obtainedMarks} / {ssc.totalMarks} ({marksPercent(ssc.obtainedMarks, ssc.totalMarks)}%)
                  </strong>
                </p>
              ) : null}
              <small>{hsc ? `${hsc.group} · ${hsc.board} · ${hsc.year}` : "No intermediate record"}</small>
              {!closed ? (
                <div className="cc-box-actions">
                  <CommentTrigger
                    active={commentCountFor("education", "ssc_marks")}
                    disabled={pending}
                    label="Comment on SSC"
                    onClick={() => openComposer("education", "ssc_marks", "SSC / Matric marks", "Education")}
                  />
                </div>
              ) : null}
            </div>
            <DocumentPreview
              document={selected}
              compact
              closed={closed}
              pending={pending}
              hasComment={selected ? commentCountFor("document", selected.id) : false}
              onComment={() =>
                selected
                  ? openComposer("document", selected.id, selected.title, "Documents")
                  : undefined
              }
            />
            <div className="cc-box">
              <header>
                <span>Fee challan</span>
                <strong>{paymentLabel(file.paymentStatus)}</strong>
              </header>
              <p>Slip {file.challan.slipNo || "not entered"}</p>
              <p>{file.challan.bank}</p>
              <p>
                <span>{file.challan.paidOn || "Date not entered"}</span>
                <strong>{file.challan.amountLabel}</strong>
              </p>
              {!closed ? (
                <div className="cc-box-actions">
                  <CommentTrigger
                    active={commentCountFor("challan", "challan")}
                    disabled={pending}
                    label="Comment on challan"
                    onClick={() => openComposer("challan", "challan", "Bank challan", "Education")}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "Documents" ? (
          <div className="cc-docs-pane">
            <div className="cc-docs-rail">
              <header>
                <strong>Uploaded credentials</strong>
                <span>
                  {file.documents.filter((item) => item.status !== "MISSING").length}/{file.documents.length}
                </span>
              </header>
              {file.documents.map((item) => (
                <DocumentRow
                  key={item.id}
                  item={item}
                  active={item.id === selected?.id}
                  hasComment={commentCountFor("document", item.id)}
                  onSelect={() => setDocumentId(item.id)}
                />
              ))}
            </div>
            <DocumentPreview
              document={selected}
              closed={closed}
              pending={pending}
              hasComment={selected ? commentCountFor("document", selected.id) : false}
              onComment={() =>
                selected ? openComposer("document", selected.id, selected.title, "Documents") : undefined
              }
            />
          </div>
        ) : null}

        {tab === "Audit" ? (
          <div className="cc-audit">
            {file.reviews.length === 0 ? <p className="muted">No review notes yet.</p> : null}
            {file.reviews.map((note) => (
              <article key={note.id}>
                <strong>{note.action.replaceAll("_", " ")}</strong>
                <p>{note.message}</p>
                {note.items?.length ? (
                  <ul className="cc-audit-items">
                    {note.items.map((item) => (
                      <li key={item.id}>
                        <em>{item.targetLabel}</em>
                        <span>{item.message}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <small>
                  {note.reviewerLabel} · {note.createdAt}
                </small>
              </article>
            ))}
          </div>
        ) : null}

        {drafts.length > 0 ? (
          <div className="cc-pending-review">
            <header>
              <strong>
                <span className="ms">rate_review</span>
                Pending review ({drafts.length})
              </strong>
              <span>Submit from the footer when finished.</span>
            </header>
            <ul>
              {drafts.map((item) => (
                <li key={draftKey(item.targetKind, item.targetKey)}>
                  <div>
                    <em>{item.targetLabel}</em>
                    <p>{item.message}</p>
                  </div>
                  <button
                    className="cc-icon-btn"
                    type="button"
                    title="Remove comment"
                    disabled={pending}
                    onClick={() => removeDraft(item.targetKind, item.targetKey)}
                  >
                    <span className="ms">delete</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <label className="cc-reject-note">
          Rejection / approval note (optional for approve)
          <input
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Required only when rejecting the whole application."
            disabled={closed || pending}
          />
        </label>

        {error || notice ? <p className="cc-form-error">{error || notice}</p> : null}
        {closed ? (
          <p className="cc-form-note">This file is {file.status.replaceAll("_", " ").toLowerCase()}. Review actions are locked.</p>
        ) : null}
      </div>

      {composer ? (
        <div className="cc-composer-dock" ref={composerRef}>
          <div className="cc-composer">
            <header>
              <div>
                <strong>
                  <span className="ms">add_comment</span>
                  Request change
                </strong>
                <p>
                  On <em>{composer.label}</em> — pin now, submit all comments together later.
                </p>
              </div>
              <button className="cc-icon-btn" type="button" onClick={() => setComposer(null)} title="Close">
                <span className="ms">close</span>
              </button>
            </header>
            <textarea
              ref={draftInputRef}
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              placeholder={`What should the applicant fix on ${composer.label}?`}
              rows={3}
              disabled={closed || pending}
            />
            <div className="cc-composer-actions">
              <button className="cc-btn cc-btn--ghost" type="button" onClick={() => setComposer(null)}>
                Cancel
              </button>
              <button className="cc-btn cc-btn--amber" type="button" disabled={pending || closed} onClick={pinComment}>
                <span className="ms">push_pin</span>
                Pin comment
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="cc-actions">
        <button className="cc-btn cc-btn--ghost-danger" type="button" disabled={pending || closed} onClick={sendReject}>
          <span className="ms">block</span>
          Reject
        </button>
        <div>
          <button className="cc-btn cc-btn--amber" type="button" disabled={pending || closed} onClick={submitChangeRequest}>
            <span className="ms">rule_folder</span>
            {pending
              ? "Saving..."
              : drafts.length > 0
                ? `Submit change request (${drafts.length})`
                : "Submit change request"}
          </button>
          <button className="cc-btn cc-btn--approve" type="button" disabled={pending || closed} onClick={sendApprove}>
            <span className="ms">task_alt</span>
            Approve
          </button>
        </div>
      </footer>
    </section>
  );
}

function DocumentRow({
  item,
  active,
  hasComment,
  onSelect,
}: {
  item: ApplicationDocument;
  active: boolean;
  hasComment: boolean;
  onSelect: () => void;
}) {
  const icon = item.status === "MISSING" ? "upload_file" : item.kind === "pdf" ? "picture_as_pdf" : item.kind === "svg" ? "image" : "photo";
  return (
    <button className={active ? "cc-doc-row is-active" : "cc-doc-row"} type="button" onClick={onSelect}>
      <span className={`cc-doc-icon cc-doc-icon--${item.kind ?? "file"}`} aria-hidden="true">
        <span className="ms">{icon}</span>
      </span>
      <span className="cc-doc-copy">
        <strong>{item.title}</strong>
        <small>{item.fileName || "No file uploaded"}</small>
      </span>
      <span className="cc-doc-row-meta">
        {hasComment ? <span className="cc-doc-pin ms" title="Pending review comment">chat</span> : null}
        <em className={`cc-doc-status cc-doc-status--${item.status.toLowerCase()}`}>{item.status}</em>
      </span>
    </button>
  );
}

function DocumentPreview({
  document,
  compact = false,
  closed = false,
  pending = false,
  hasComment = false,
  onComment,
}: {
  document?: ApplicationDocument;
  compact?: boolean;
  closed?: boolean;
  pending?: boolean;
  hasComment?: boolean;
  onComment?: () => void;
}) {
  if (!document) {
    return (
      <article className={compact ? "cc-preview is-compact" : "cc-preview"}>
        <p className="muted">No document on this file.</p>
      </article>
    );
  }

  if (document.status === "MISSING" || !document.url) {
    return (
      <article className={compact ? "cc-preview is-compact" : "cc-preview"}>
        <header>
          <div>
            <strong>{document.title}</strong>
            <small>Not uploaded</small>
          </div>
          <em className="cc-doc-status cc-doc-status--missing">MISSING</em>
        </header>
        <div className="cc-preview-empty">
          <span className="ms">cloud_off</span>
          <p>This slot is empty. The applicant has not uploaded a file yet.</p>
          {!closed && onComment ? (
            <CommentTrigger active={hasComment} disabled={pending} onClick={onComment} />
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article className={compact ? "cc-preview is-compact" : "cc-preview"}>
      <header>
        <div>
          <strong>{document.title}</strong>
          <small>
            {document.fileName} · {document.sizeLabel || "size unknown"}
          </small>
        </div>
        <em className={`cc-doc-status cc-doc-status--${document.status.toLowerCase()}`}>{document.status}</em>
      </header>
      <div className="cc-preview-frame">
        {document.kind === "pdf" ? (
          <iframe title={document.title} src={document.url} />
        ) : (
          <img src={document.url} alt={document.title} />
        )}
      </div>
      <footer>
        <span>{document.summary ?? "Local sample file for admissions review."}</span>
        <div className="cc-preview-footer-actions">
          {!closed && onComment ? (
            <CommentTrigger active={hasComment} disabled={pending} onClick={onComment} />
          ) : null}
          <a href={document.url} target="_blank" rel="noreferrer">
            <span className="ms">open_in_new</span>
            Open file
          </a>
        </div>
      </footer>
    </article>
  );
}
