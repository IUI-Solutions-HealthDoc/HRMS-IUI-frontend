"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/formatters";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Loader from "@/components/ui/Loader";
import ClubLeaveFields, { CLUB_DEFAULTS, clubStatus, WordCounter } from "@/components/ClubLeaveFields";
import { countWords, WORD_LIMITS } from "@/lib/limits";

const EMPTY_LEAVE_FORM = { subject: "", description: "", start_date: "", end_date: "", leave_type: "Casual Leave", ...CLUB_DEFAULTS };

export default function LeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [form, setForm] = useState(EMPTY_LEAVE_FORM);
  const [files, setFiles] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;
  const [showToast, toastNode] = useToast();

  const safePage = Math.min(currentPage, Math.max(1, Math.ceil(leaves.length / PER_PAGE)));
  const paginatedLeaves = leaves.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const MAX_FILES = 5;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const currentYear = new Date().getFullYear();
      const [d, b, holidayData] = await Promise.all([
        apiFetch("/leave/my"),
        apiFetch("/leave/balance").catch(() => null),
        apiFetch(`/attendance/holidays?year=${currentYear}`).catch(() => ({ holidays: [] })),
      ]);
      setLeaves(Array.isArray(d) ? [...d].sort((a, b) => String(b.submitted_on || b.created_at || b.start_date || "").localeCompare(String(a.submitted_on || a.created_at || a.start_date || ""))) : []);
      if (b) setBalance(b);
      setHolidays(Array.isArray(holidayData?.holidays) ? holidayData.holidays : []);
    } catch (error) {
      setLeaves([]);
      setLoadError(error.message || "Leaves could not be loaded");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function applyLeave(e) {
    e.preventDefault(); setSubmitting(true);
    if (!form.subject.trim()) { showToast("Subject is required", "error"); setSubmitting(false); return; }
    if (!form.start_date || !form.end_date) { showToast("Please select both start and end dates", "error"); setSubmitting(false); return; }
    if (form.end_date < form.start_date) { showToast("End date cannot be before start date", "error"); setSubmitting(false); return; }
    if (countWords(form.subject) > WORD_LIMITS.subject) { showToast(`Subject cannot exceed ${WORD_LIMITS.subject} words`, "error"); setSubmitting(false); return; }
    if (countWords(form.description) > WORD_LIMITS.description) { showToast(`Description cannot exceed ${WORD_LIMITS.description} words`, "error"); setSubmitting(false); return; }
    const club = clubStatus(form, balance, holidays);
    if (club.error) { showToast(club.error, "error"); setSubmitting(false); return; }
    if (balance?.is_in_probation && (form.club || (form.leave_type !== "Casual Leave" && form.leave_type !== "Period Leave"))) {
      showToast("Only Casual Leave and Period Leave can be applied during probation period.", "error");
      setSubmitting(false);
      return;
    }
    try {
      const fd = new FormData();
      fd.append("subject", form.subject.trim());
      fd.append("leave_type", form.leave_type || "Casual Leave");
      fd.append("description", form.description.trim() || form.subject.trim());
      if (form.club) { fd.append("cl_days", club.cl); fd.append("pl_days", club.pl); }
      fd.append("start_date", form.start_date);
      fd.append("end_date", form.end_date);
      files.forEach((f) => fd.append("attachments", f));
      await apiFetch("/leave/apply", { method: "POST", body: fd });
      showToast("Leave application submitted!");
      setShowModal(false);
      setForm(EMPTY_LEAVE_FORM);
      setFiles([]);
      load();
    } catch (e) { showToast(e.message, "error"); } finally { setSubmitting(false); }
  }

  function handleFileChange(e) {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter((f) => {
      const ext = "." + f.name.split(".").pop().toLowerCase();
      return ALLOWED_EXT.includes(ext);
    });
    if (valid.length !== selected.length) showToast("Some files were skipped (only PDF & images allowed)", "error");
    if (files.length + valid.length > MAX_FILES) {
      showToast(`Maximum ${MAX_FILES} attachments allowed. Remove a file before adding another.`, "error");
      e.target.value = "";
      return;
    }
    setFiles([...files, ...valid]);
    e.target.value = "";
  }

  async function cancelLeave(id) {
    if (!window.confirm("Are you sure you want to cancel this pending leave request?")) return;
    try {
      await apiFetch(`/leave/${id}/cancel`, { method: "POST" });
      showToast("Leave request cancelled");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  const quotas = balance?.annual_quotas;
  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>My Leaves</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            Annual Quotas: {quotas?.casual?.total ?? 10} Casual Leaves, {quotas?.sick?.total ?? 12} Sick Leaves & {quotas?.privileged?.total ?? 15} Privileged Leaves per year
            {quotas?.period && <span> · {quotas.period.total} Period Leaves (1/Month)</span>}
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(EMPTY_LEAVE_FORM); setFiles([]); setShowModal(true); }}>+ Apply Leave</button>
      </div>

      {balance?.is_in_probation && (
        <div style={{ padding: "12px 16px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, fontSize: 13, color: "#f59e0b", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          <div>
            <b>Probation Period Active</b>: Your probation ends on <b>{balance.probation_end_date ? fmtDate(balance.probation_end_date) : "the scheduled date"}</b>. Only <b>Casual Leave</b> and <b>Period Leave</b> can be applied during probation. Sick Leave and Privileged Leave will automatically become available once probation concludes.
          </div>
        </div>
      )}

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>CASUAL LEAVE (CL)</div>
          <div className="syne" style={{ fontSize: 24, fontWeight: 800, color: "#10b981", marginTop: 4 }}>
            {quotas?.casual?.remaining ?? 10} <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>/ {quotas?.casual?.total ?? 10} days left</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            Used: {quotas?.casual?.used ?? 0} days{(quotas?.casual?.deduction ?? 0) > 0 && <span> · HR Adjusted: −{quotas.casual.deduction}</span>}
          </div>
        </div>
        <div className="card" style={{ padding: "18px 20px", opacity: balance?.is_in_probation ? 0.75 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>SICK LEAVE (SL)</div>
            {balance?.is_in_probation && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 600 }}>Locked (Probation)</span>}
          </div>
          <div className="syne" style={{ fontSize: 24, fontWeight: 800, color: "#6366f1", marginTop: 4 }}>
            {quotas?.sick?.remaining ?? 12} <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>/ {quotas?.sick?.total ?? 12} days left</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            Used: {quotas?.sick?.used ?? 0} days{(quotas?.sick?.deduction ?? 0) > 0 && <span> · HR Adjusted: −{quotas.sick.deduction}</span>}
          </div>
        </div>
        <div className="card" style={{ padding: "18px 20px", opacity: balance?.is_in_probation ? 0.75 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>PRIVILEGED LEAVE (PL)</div>
            {balance?.is_in_probation && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 600 }}>Locked (Probation)</span>}
          </div>
          <div className="syne" style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b", marginTop: 4 }}>
            {quotas?.privileged?.remaining ?? 15} <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>/ {quotas?.privileged?.total ?? 15} days left</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            Used: {quotas?.privileged?.used ?? 0} days{(quotas?.privileged?.deduction ?? 0) > 0 && <span> · HR Adjusted: −{quotas.privileged.deduction}</span>}
          </div>
        </div>
        {quotas?.period && (
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>PERIOD LEAVE</div>
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(236,72,153,0.15)", color: "#ec4899", fontWeight: 600 }}>1 / Month</span>
            </div>
            <div className="syne" style={{ fontSize: 24, fontWeight: 800, color: "#ec4899", marginTop: 4 }}>
              {quotas.period.remaining ?? 12} <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>/ {quotas.period.total ?? 12} days left</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              Used: {quotas.period.used ?? 0} days{(quotas.period.deduction ?? 0) > 0 && <span> · HR Adjusted: −{quotas.period.deduction}</span>}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Leave History</h2>
        </div>
        {loading ? <Loader /> : loadError ? <EmptyState icon="⚠️" title="Leaves could not be loaded" sub={loadError} /> : leaves.length === 0 ? <EmptyState icon="📅" title="No leaves yet" sub="Apply for your first leave" /> : (
          <>
            {/* Desktop Table View */}
            <div className="table-wrap leave-table-desktop">
              <table>
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Category</th>
                    <th>Subject</th>
                    <th>Reason</th>
                    <th>Attachments</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeaves.map((l, i) => (
                    <tr key={i} style={{ cursor: "pointer" }} onClick={(e) => {
                      if (e.target.closest("button") || e.target.closest("a")) return;
                      setSelectedLeave(l);
                    }}>
                      <td>{fmtDate(l.start_date)}</td>
                      <td>{fmtDate(l.end_date)}</td>
                      <td>
                        <span className="chip" style={{ fontWeight: 600 }}>
                          {l.cl_days > 0 && l.pl_days > 0 ? `${l.cl_days} CL + ${l.pl_days} PL` : (l.leave_type || "Casual Leave")}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedLeave(l); }}
                          style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "inherit" }}
                        >
                          <span className="chip" style={{ fontWeight: 600, color: "var(--accent)" }}>
                            {l.subject || "Leave Request"}
                          </span>
                        </button>
                      </td>
                      <td>
                        {l.description ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedLeave(l); }}
                            className="btn-ghost"
                            style={{
                              padding: "4px 10px",
                              fontSize: 12,
                              borderRadius: 6,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "rgba(124, 58, 237, 0.08)",
                              border: "1px solid rgba(124, 58, 237, 0.2)",
                              color: "var(--accent)",
                              cursor: "pointer",
                            }}
                            title="Click to view full description"
                          >
                            <span>👁️ View Note</span>
                          </button>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        {(l.attachments?.length > 0) ? l.attachments.map((url, j) => (
                          <a key={j} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginRight: 6, fontSize: 12, color: "var(--accent)" }}>
                            📎 File {j + 1}
                          </a>
                        )) : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        <StatusBadge status={l.status} />
                        {l.action_by_name && (
                          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                            by {l.action_by_name} {l.action_by_role ? `(${l.action_by_role})` : ""}
                          </div>
                        )}
                        {l.approver_comment && (
                          <div style={{ fontSize: 11, color: "var(--text)", marginTop: 4, background: "var(--hover-bg)", padding: "3px 6px", borderRadius: 4, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            💬 {l.approver_comment}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: "4px 8px", fontSize: 12 }}
                            onClick={() => setSelectedLeave(l)}
                          >
                            Details
                          </button>
                          {l.status === "Pending" && (
                            <button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 12, color: "#ef4444" }} onClick={() => cancelLeave(l.id)}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="leave-cards-mobile">
              {paginatedLeaves.map((l, i) => (
                <div
                  key={i}
                  className="leave-card-item"
                  onClick={() => setSelectedLeave(l)}
                  style={{
                    padding: "14px 16px",
                    background: "var(--hover-bg, rgba(255,255,255,0.03))",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                      {fmtDate(l.start_date)} – {fmtDate(l.end_date)}
                    </span>
                    <StatusBadge status={l.status} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span className="chip" style={{ fontWeight: 700, fontSize: 11 }}>
                        {l.cl_days > 0 && l.pl_days > 0 ? `${l.cl_days} CL + ${l.pl_days} PL` : (l.leave_type || "Casual Leave")}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                      {l.subject || "Leave Request"}
                    </div>
                  </div>
                  {l.attachments?.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
                      <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600 }}>Attachments:</span>
                      {l.attachments.map((url, j) => (
                        <a
                          key={j}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="chip"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                        >
                          📎 File {l.attachments.length > 1 ? j + 1 : ""}
                        </a>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, borderTop: "1px solid var(--border)", marginTop: 2 }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "4px 8px", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}
                      onClick={(e) => { e.stopPropagation(); setSelectedLeave(l); }}
                    >
                      👁️ View Details
                    </button>
                    {l.status === "Pending" && (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: "4px 8px", fontSize: 12, color: "#ef4444", fontWeight: 600 }}
                        onClick={(e) => { e.stopPropagation(); cancelLeave(l.id); }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <Pagination
          currentPage={safePage}
          totalItems={leaves.length}
          pageSize={PER_PAGE}
          onPageChange={(p) => setCurrentPage(p)}
        />
      </div>

      {/* Leave Details Modal */}
      {selectedLeave && (
        <Modal
          title={`Leave Details — ${selectedLeave.subject || "Leave Request"}`}
          onClose={() => setSelectedLeave(null)}
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              {selectedLeave.status === "Pending" ? (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ color: "#ef4444", fontWeight: 600, fontSize: 13 }}
                  onClick={() => {
                    const id = selectedLeave.id;
                    setSelectedLeave(null);
                    cancelLeave(id);
                  }}
                >
                  Cancel Request
                </button>
              ) : <span />}
              <button type="button" className="btn-primary" onClick={() => setSelectedLeave(null)}>Close</button>
            </div>
          }
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "12px 14px", background: "var(--hover-bg, rgba(255,255,255,0.03))", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div>
                <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", display: "block" }}>Category</span>
                <span className="chip" style={{ marginTop: 4, fontWeight: 700, fontSize: 12 }}>
                  {selectedLeave.cl_days > 0 && selectedLeave.pl_days > 0 ? `${selectedLeave.cl_days} CL + ${selectedLeave.pl_days} PL` : (selectedLeave.leave_type || "Casual Leave")}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", display: "block" }}>Status</span>
                <div style={{ marginTop: 4 }}><StatusBadge status={selectedLeave.status} /></div>
              </div>
            </div>

            <div className="form-row">
              <div style={{ padding: 10, background: "var(--hover-bg, rgba(255,255,255,0.02))", borderRadius: 8, border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, display: "block" }}>Start Date</span>
                <span style={{ fontSize: 13, fontWeight: 700, marginTop: 4, display: "block" }}>{fmtDate(selectedLeave.start_date)}</span>
              </div>
              <div style={{ padding: 10, background: "var(--hover-bg, rgba(255,255,255,0.02))", borderRadius: 8, border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, display: "block" }}>End Date</span>
                <span style={{ fontSize: 13, fontWeight: 700, marginTop: 4, display: "block" }}>{fmtDate(selectedLeave.end_date)}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>Subject</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{selectedLeave.subject || "—"}</div>
            </div>

            <div>
              <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Reason / Description</span>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--hover-bg, rgba(255,255,255,0.04))", border: "1px solid var(--border)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 220, overflowY: "auto" }}>
                {selectedLeave.description || "No description provided."}
              </div>
            </div>

            {selectedLeave.approver_comment && (
              <div style={{ padding: "12px 14px", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: "var(--accent, #7c3aed)", fontWeight: 700, display: "block", marginBottom: 4 }}>Approver Remarks</span>
                <div style={{ fontSize: 13, color: "var(--text)" }}>💬 {selectedLeave.approver_comment}</div>
                {selectedLeave.action_by_name && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                    by {selectedLeave.action_by_name} {selectedLeave.action_by_role ? `(${selectedLeave.action_by_role})` : ""}
                  </div>
                )}
              </div>
            )}

            {selectedLeave.attachments?.length > 0 && (
              <div>
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Attachments</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {selectedLeave.attachments.map((url, j) => (
                    <a
                      key={j}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "var(--hover-bg)", border: "1px solid var(--border)", fontSize: 12, color: "var(--accent)", textDecoration: "none" }}
                    >
                      📎 File {j + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Apply Leave Modal */}
      {showModal && (
        <Modal title="Apply for Leave" onClose={() => setShowModal(false)}
          footer={<><button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button><button className="btn-primary" onClick={applyLeave} disabled={submitting}>{submitting ? "Submitting…" : "Apply Leave"}</button></>}>
          {balance?.is_in_probation && (
            <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, fontSize: 13, color: "#f59e0b", marginBottom: 14 }}>
              ⏳ <b>Probation Active</b>: You can apply for <b>Casual Leave</b> and <b>Period Leave</b> until your probation period concludes on {balance.probation_end_date ? fmtDate(balance.probation_end_date) : "the scheduled date"}.
            </div>
          )}
          {!form.club && <div className="form-group"><label className="label">Leave Category</label>
            <select className="input" value={form.leave_type} onChange={(e) => {
              const lt = e.target.value;
              setForm((f) => ({
                ...f,
                leave_type: lt,
                end_date: lt === "Period Leave" && f.start_date ? f.start_date : f.end_date,
                club: false,
              }));
            }}>
              <option value="Casual Leave">Casual Leave (CL - 10/yr)</option>
              <option value="Sick Leave" disabled={balance?.is_in_probation}>
                Sick Leave (SL - 12/yr){balance?.is_in_probation ? " — Locked (Probation)" : ""}
              </option>
              <option value="Privileged Leave" disabled={balance?.is_in_probation}>
                Privileged Leave (PL - 15/yr){balance?.is_in_probation ? " — Locked (Probation)" : ""}
              </option>
              {(quotas?.period || balance?.is_female || balance?.allowed_leave_types?.includes("Period Leave")) && (
                <option value="Period Leave">
                  Period Leave (1/month - 12/yr)
                </option>
              )}
            </select>
          </div>}
          <div className="form-group"><label className="label">Subject <span style={{ color: "#ef4444" }}>*</span></label><input className="input" placeholder="e.g. Family function, Medical, etc." value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required /><WordCounter value={form.subject} limit={WORD_LIMITS.subject} /></div>
          <div className="form-row">
            <div className="form-group"><label className="label">Start Date <span style={{ color: "#ef4444" }}>*</span></label><input className="input" type="date" value={form.start_date} onChange={(e) => {
              const val = e.target.value;
              setForm((f) => ({
                ...f,
                start_date: val,
                end_date: f.leave_type === "Period Leave" ? val : (f.end_date && f.end_date < val ? val : f.end_date),
              }));
            }} required /></div>
            <div className="form-group"><label className="label">End Date <span style={{ color: "#ef4444" }}>*</span></label><input className="input" type="date" min={form.start_date || undefined} value={form.leave_type === "Period Leave" ? (form.start_date || form.end_date) : form.end_date} disabled={form.leave_type === "Period Leave"} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} required /></div>
          </div>
          <ClubLeaveFields form={form} setForm={setForm} balance={balance} holidays={holidays} />
          <div className="form-group">
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Reason for leave…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <WordCounter value={form.description} limit={WORD_LIMITS.description} />
          </div>
          {(() => {
            const warn = [];
            if (form.start_date) { const d = new Date(form.start_date + "T00:00:00"); if (d.getDay() === 0) warn.push("Start date is a Sunday"); else if (d.getDay() === 6) warn.push("Start date is a Saturday"); }
            if (form.end_date) { const d = new Date(form.end_date + "T00:00:00"); if (d.getDay() === 0) warn.push("End date is a Sunday"); else if (d.getDay() === 6) warn.push("End date is a Saturday"); }
            const startHoliday = holidays.find((item) => item.date === form.start_date);
            const endHoliday = holidays.find((item) => item.date === form.end_date && item.date !== form.start_date);
            if (startHoliday) warn.push(`Start date is ${startHoliday.name || "a holiday"}`);
            if (endHoliday) warn.push(`End date is ${endHoliday.name || "a holiday"}`);
            return warn.length > 0 ? <div style={{ padding: "8px 12px", background: "rgba(245,158,11,0.15)", borderRadius: 8, fontSize: 13, color: "#f59e0b", marginBottom: 8 }}>⚠️ {warn.join(" · ")} — weekends may not count as working days</div> : null;
          })()}
          <div className="form-group">
            <label className="label">Attachments <span style={{ fontWeight: 400, color: "var(--muted)" }}>(max 5 — PDF, JPG, PNG only)</span></label>
            <label className="btn-ghost" style={{ display: "inline-flex", cursor: files.length >= MAX_FILES ? "not-allowed" : "pointer", opacity: files.length >= MAX_FILES ? 0.6 : 1 }}>
              Choose files ({files.length}/{MAX_FILES})
              <input type="file" multiple disabled={files.length >= MAX_FILES} accept=".pdf,.jpg,.jpeg,.png,.webp,.gif" onChange={handleFileChange} style={{ display: "none" }} />
            </label>
            {files.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {files.map((f, i) => (
                  <span key={i} className="chip" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    📎 {f.name}
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      <style jsx>{`
        .leave-table-desktop {
          display: block;
        }
        .leave-cards-mobile {
          display: none;
        }
        @media (max-width: 768px) {
          .leave-table-desktop {
            display: none !important;
          }
          .leave-cards-mobile {
            display: flex !important;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
          }
        }
      `}</style>
      {toastNode}
    </div>
  );
}
