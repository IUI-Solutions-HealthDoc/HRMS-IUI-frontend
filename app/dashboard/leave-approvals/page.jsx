"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/formatters";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import Pagination from "@/components/ui/Pagination";

const FILTERS = [
  { id: "", label: "All Leaves" },
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid Approved" },
  { id: "unpaid", label: "Unpaid Approved" },
  { id: "rejected", label: "Rejected" },
];

function getAttachments(item) {
  if (!item?.attachments) return [];
  if (Array.isArray(item.attachments)) return item.attachments.filter(Boolean);
  if (typeof item.attachments === "string") return item.attachments.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

export default function LeaveApprovalsPage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;
  const [showToast, toastNode] = useToast();
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionComment, setActionComment] = useState("");
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [editedLeaveType, setEditedLeaveType] = useState("");
  const [editedStartDate, setEditedStartDate] = useState("");
  const [editedEndDate, setEditedEndDate] = useState("");
  useEffect(() => {
    if (selectedLeave) {
      setEditedLeaveType(selectedLeave.leave_type || "Casual Leave");
      setEditedStartDate(selectedLeave.start_date ? selectedLeave.start_date.split("T")[0] : "");
      setEditedEndDate(selectedLeave.end_date ? selectedLeave.end_date.split("T")[0] : "");
      setActionComment(selectedLeave.approver_comment || "");
      apiFetch(`/leave/balance?emp_id=${selectedLeave.emp_id || selectedLeave.employee_id}`)
        .then(data => setSelectedBalance(data))
        .catch(e => console.error(e));
    } else {
      setSelectedBalance(null);
      setEditedLeaveType("");
      setEditedStartDate("");
      setEditedEndDate("");
      setActionComment("");
    }
  }, [selectedLeave]);

  async function handleUpdateLeaveType() {
    const isFemale = selectedLeave?.is_female || selectedBalance?.is_female || selectedBalance?.annual_quotas?.period;
    if (editedLeaveType === "Period Leave" && !isFemale) {
      showToast("Period Leave can only be assigned to female employees", "error");
      return;
    }
    try {
      await apiFetch(`/leave/${selectedLeave.id}/update`, { 
        method: "POST", 
        body: JSON.stringify({ action: "update_type", leave_type: editedLeaveType }) 
      });
      showToast("Leave type updated");
      load();
      setSelectedLeave(prev => ({ ...prev, leave_type: editedLeaveType }));
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function handleUpdateDates() {
    if (!editedStartDate || !editedEndDate) {
      showToast("Please select valid start and end dates", "error");
      return;
    }
    if (editedEndDate < editedStartDate) {
      showToast("End date cannot be before start date", "error");
      return;
    }
    try {
      await apiFetch(`/leave/${selectedLeave.id}/update`, {
        method: "POST",
        body: JSON.stringify({
          action: "update_dates",
          start_date: editedStartDate,
          end_date: editedEndDate,
        }),
      });
      showToast("Leave dates updated successfully");
      load();
      setSelectedLeave(prev => ({
        ...prev,
        start_date: editedStartDate,
        end_date: editedEndDate,
      }));
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingData, allData] = await Promise.all([
        apiFetch("/leave/pending").catch(() => []),
        apiFetch(filter ? `/leave/all?leave_type=${filter}` : "/leave/all").catch(() => []),
      ]);
      setPending(Array.isArray(pendingData) ? pendingData : []);
      setHistory(Array.isArray(allData) ? allData : []);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateLeave(item, action, customComment) {
    const actionLabel = action === "approve_paid" ? "Paid" : action === "approve_unpaid" ? "Unpaid" : "Rejected";
    const empName = item.name || item.emp_id || "Employee";
    const subject = item.subject || "No Subject";
    if (!confirm(`Are you sure you want to mark this leave as ${actionLabel} for ${empName} (Subject: ${subject})?`)) {
      return;
    }
    const finalComment = customComment !== undefined ? customComment : (selectedLeave && selectedLeave.id === item.id ? actionComment : undefined);
    try {
      await apiFetch(`/leave/${item.id}/update`, {
        method: "POST",
        body: JSON.stringify({ action, comment: finalComment || undefined }),
      });
      showToast("Leave updated");
      load();
      if (selectedLeave && selectedLeave.id === item.id) {
        setSelectedLeave(prev => ({
          ...prev,
          status: action === "reject" ? "Rejected" : "Approved",
          is_paid: action === "approve_paid",
          approver_comment: finalComment || prev?.approver_comment,
        }));
      }
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  const isOwnLeave = (item) => {
    if (!user) return false;
    if (item.user_id && user.id && String(item.user_id) === String(user.id)) return true;
    if (item.emp_id && user.emp_id && item.emp_id === user.emp_id) return true;
    return false;
  };

  const filteredPending = pending.filter((item) => !isOwnLeave(item));
  const filteredHistory = history;

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Leave Approvals</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {isAdmin ? "Admin can review the full leave ledger and pending approvals." : "Review requests, classify approvals as paid or unpaid, modify dates, or reject/re-approve leaves."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/dashboard/leave-balances" className="btn-ghost" style={{ textDecoration: "none" }}>
            Leave Balance Sheet →
          </Link>
          {FILTERS.map((item) => (
            <button
              key={item.id || "all"}
              className={filter === item.id ? "btn-primary" : "btn-ghost"}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filteredPending.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Pending Approvals ({filteredPending.length})</h2>
          </div>
          {/* Desktop Table */}
          <div className="table-wrap approvals-table-desktop">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Attachments</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((item) => (
                  <tr key={item.id} onClick={() => setSelectedLeave(item)} style={{ cursor: "pointer" }}>
                    <td>
                      <b>{item.name || item.emp_id}</b>
                      {item.emp_id && item.name && (
                        <div style={{ color: "var(--muted)", fontSize: 11 }}>{item.emp_id}</div>
                      )}
                    </td>
                    <td>
                      <span className="chip" style={{ fontWeight: 600 }}>
                        {item.cl_days > 0 && item.pl_days > 0 ? `${item.cl_days} CL + ${item.pl_days} PL` : (item.leave_type || "Casual Leave")}
                      </span>
                    </td>
                    <td><span className="chip">{item.subject}</span></td>
                    <td>{fmtDate(item.start_date)}</td>
                    <td>{fmtDate(item.end_date)}</td>
                    <td>
                      {item.description ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedLeave(item); }}
                          className="btn-ghost"
                          style={{
                            padding: "4px 10px",
                            fontSize: 12,
                            borderRadius: 6,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: "rgba(124, 58, 237, 0.08)",
                            border: "1px solid rgba(124, 58, 237, 0.25)",
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
                      {(() => {
                        const atts = getAttachments(item);
                        return atts.length > 0 ? (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 140 }}>
                            {atts.map((url, j) => (
                              <a
                                key={j}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="chip"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                                title={`Attachment ${j + 1}`}
                              >
                                📎 {atts.length > 1 ? `File ${j + 1}` : "File"}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); updateLeave(item, "approve_paid"); }}>Paid</button>
                        <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); updateLeave(item, "approve_unpaid"); }}>Unpaid</button>
                        <button className="btn-danger" style={{ padding: "6px 12px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); updateLeave(item, "reject"); }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards for Pending Approvals */}
          <div className="pending-cards-mobile">
            {filteredPending.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedLeave(item)}
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name || item.emp_id}</div>
                    {item.emp_id && item.name && (
                      <div style={{ color: "var(--muted)", fontSize: 11 }}>{item.emp_id}</div>
                    )}
                  </div>
                  <span className="chip" style={{ fontWeight: 700, fontSize: 11 }}>
                    {item.cl_days > 0 && item.pl_days > 0 ? `${item.cl_days} CL + ${item.pl_days} PL` : (item.leave_type || "Casual Leave")}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                  📅 {fmtDate(item.start_date)} – {fmtDate(item.end_date)}
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                  {item.subject}
                </div>

                {(() => {
                  const atts = getAttachments(item);
                  if (atts.length === 0) return null;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
                      <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600 }}>Attachments:</span>
                      {atts.map((url, j) => (
                        <a
                          key={j}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="chip"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                        >
                          📎 File {atts.length > 1 ? j + 1 : ""}
                        </a>
                      ))}
                    </div>
                  );
                })()}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border)", marginTop: 2, flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "4px 8px", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}
                    onClick={(e) => { e.stopPropagation(); setSelectedLeave(item); }}
                  >
                    👁️ View Details
                  </button>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-primary" style={{ padding: "5px 10px", fontSize: 11 }} onClick={(e) => { e.stopPropagation(); updateLeave(item, "approve_paid"); }}>Paid</button>
                    <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={(e) => { e.stopPropagation(); updateLeave(item, "approve_unpaid"); }}>Unpaid</button>
                    <button className="btn-danger" style={{ padding: "5px 10px", fontSize: 11 }} onClick={(e) => { e.stopPropagation(); updateLeave(item, "reject"); }}>Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>All Leave History</h2>
        </div>
        {loading ? <Loader /> : filteredHistory.length === 0 ? (
          <EmptyState icon="📅" title="No leave records" />
        ) : (
          <>
            <div className="table-wrap approvals-table-desktop">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Leave Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Subject</th>
                    <th>Reason</th>
                    <th>Attachments</th>
                    <th>Status</th>
                    <th>Action By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const safePage = Math.min(currentPage, Math.max(1, Math.ceil(filteredHistory.length / PER_PAGE)));
                    const paginated = filteredHistory.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
                    return paginated.map((item) => (
                      <tr key={item.id} onClick={() => setSelectedLeave(item)} style={{ cursor: "pointer" }}>
                        <td>
                          <b>{item.name || item.emp_id}</b>
                          {item.emp_id && item.name && (
                            <div style={{ color: "var(--muted)", fontSize: 11 }}>{item.emp_id}</div>
                          )}
                        </td>
                        <td>{item.status === "Approved" ? (item.is_paid ? "Paid" : "Unpaid") : "—"}</td>
                        <td>{item.cl_days > 0 && item.pl_days > 0 ? `${item.cl_days} CL + ${item.pl_days} PL` : (item.leave_type || "Casual Leave")}</td>
                        <td>{fmtDate(item.start_date)}</td>
                        <td>{fmtDate(item.end_date)}</td>
                        <td>{item.subject}</td>
                        <td>
                          {item.description ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedLeave(item); }}
                              className="btn-ghost"
                              style={{
                                padding: "4px 10px",
                                fontSize: 12,
                                borderRadius: 6,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                background: "rgba(124, 58, 237, 0.08)",
                                border: "1px solid rgba(124, 58, 237, 0.25)",
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
                          {(() => {
                            const atts = getAttachments(item);
                            return atts.length > 0 ? (
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 140 }}>
                                {atts.map((url, j) => (
                                  <a
                                    key={j}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="chip"
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                                    title={`Attachment ${j + 1}`}
                                  >
                                    📎 {atts.length > 1 ? `File ${j + 1}` : "File"}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                            );
                          })()}
                        </td>
                        <td>
                          <StatusBadge status={item.status} />
                          {item.approver_comment && (
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, maxWidth: 170, whiteSpace: "normal" }} title={item.approver_comment}>
                              💬 {item.approver_comment}
                            </div>
                          )}
                        </td>
                        <td>
                          {item.action_by_name ? (
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>
                              {item.action_by_name} {item.action_by_role ? `(${item.action_by_role})` : ""}
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {isOwnLeave(item) && !isAdmin ? (
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>Own record</span>
                            ) : item.status === "Approved" ? (
                              <>
                                {item.is_paid ? (
                                  <button
                                    className="btn-ghost"
                                    style={{ padding: "4px 8px", fontSize: 11 }}
                                    onClick={(e) => { e.stopPropagation(); updateLeave(item, "approve_unpaid"); }}
                                  >
                                    Make Unpaid
                                  </button>
                                ) : (
                                  <button
                                    className="btn-primary"
                                    style={{ padding: "4px 8px", fontSize: 11 }}
                                    onClick={(e) => { e.stopPropagation(); updateLeave(item, "approve_paid"); }}
                                  >
                                    Make Paid
                                  </button>
                                )}
                                <button
                                  className="btn-danger"
                                  style={{ padding: "4px 8px", fontSize: 11 }}
                                  onClick={(e) => { e.stopPropagation(); updateLeave(item, "reject"); }}
                                >
                                  Reject
                                </button>
                              </>
                            ) : item.status === "Cancelled" ? (
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>Cancelled by employee</span>
                            ) : item.status === "Rejected" ? (
                              <>
                                <button
                                  className="btn-primary"
                                  style={{ padding: "4px 8px", fontSize: 11 }}
                                  onClick={(e) => { e.stopPropagation(); updateLeave(item, "approve_paid"); }}
                                >
                                  Paid
                                </button>
                                <button
                                  className="btn-ghost"
                                  style={{ padding: "4px 8px", fontSize: 11 }}
                                  onClick={(e) => { e.stopPropagation(); updateLeave(item, "approve_unpaid"); }}
                                >
                                  Unpaid
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn-primary"
                                  style={{ padding: "4px 8px", fontSize: 11 }}
                                  onClick={(e) => { e.stopPropagation(); updateLeave(item, "approve_paid"); }}
                                >
                                  Paid
                                </button>
                                <button
                                  className="btn-ghost"
                                  style={{ padding: "4px 8px", fontSize: 11 }}
                                  onClick={(e) => { e.stopPropagation(); updateLeave(item, "approve_unpaid"); }}
                                >
                                  Unpaid
                                </button>
                                <button
                                  className="btn-danger"
                                  style={{ padding: "4px 8px", fontSize: 11 }}
                                  onClick={(e) => { e.stopPropagation(); updateLeave(item, "reject"); }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards for History */}
            <div className="history-cards-mobile">
              {(() => {
                const safePage = Math.min(currentPage, Math.max(1, Math.ceil(filteredHistory.length / PER_PAGE)));
                const paginated = filteredHistory.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
                return paginated.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedLeave(item)}
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name || item.emp_id}</div>
                        {item.emp_id && item.name && (
                          <div style={{ color: "var(--muted)", fontSize: 11 }}>{item.emp_id}</div>
                        )}
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                      <span className="chip" style={{ fontWeight: 600 }}>
                        {item.cl_days > 0 && item.pl_days > 0 ? `${item.cl_days} CL + ${item.pl_days} PL` : (item.leave_type || "Casual Leave")}
                      </span>
                      {item.status === "Approved" && (
                        <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                          {item.is_paid ? "Paid" : "Unpaid"}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                      📅 {fmtDate(item.start_date)} – {fmtDate(item.end_date)}
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      {item.subject}
                    </div>

                    {(() => {
                      const atts = getAttachments(item);
                      if (atts.length === 0) return null;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
                          <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600 }}>Attachments:</span>
                          {atts.map((url, j) => (
                            <a
                              key={j}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="chip"
                              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                            >
                              📎 File {atts.length > 1 ? j + 1 : ""}
                            </a>
                          ))}
                        </div>
                      );
                    })()}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border)", marginTop: 2, flexWrap: "wrap", gap: 8 }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: "4px 8px", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}
                        onClick={(e) => { e.stopPropagation(); setSelectedLeave(item); }}
                      >
                        👁️ View Details
                      </button>
                      {item.action_by_name && (
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          by {item.action_by_name}
                        </span>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredHistory.length}
          pageSize={PER_PAGE}
          onPageChange={(p) => setCurrentPage(p)}
        />
      </div>

      {selectedLeave && (
        <div className="modal-overlay" onClick={() => setSelectedLeave(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: "var(--card-bg, #fff)", padding: 24, borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
            <h2 className="syne" style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Leave Details & Actions</h2>
            
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>Employee</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <strong>{selectedLeave.name || selectedLeave.emp_id}</strong>
                {(selectedLeave?.is_female || selectedBalance?.is_female) ? (
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(236,72,153,0.15)", color: "#ec4899", fontWeight: 600 }}>
                    ♀ Female
                  </span>
                ) : (
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(100,116,139,0.12)", color: "var(--muted)", fontWeight: 600 }}>
                    ♂ Male
                  </span>
                )}
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>Leave Type</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={editedLeaveType}
                    onChange={(e) => setEditedLeaveType(e.target.value)}
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 14 }}
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Privileged Leave">Privileged Leave</option>
                    {(selectedLeave?.is_female || selectedBalance?.is_female || selectedBalance?.annual_quotas?.period || selectedLeave?.leave_type === "Period Leave") && (
                      <option value="Period Leave">Period Leave</option>
                    )}
                  </select>
                  {editedLeaveType !== (selectedLeave.leave_type || "Casual Leave") && (
                    <button className="btn-primary" onClick={handleUpdateLeaveType} style={{ padding: "6px 12px", fontSize: 12 }}>Update</button>
                  )}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>Current Status</span>
                <StatusBadge status={selectedLeave.status} />
              </div>
            </div>

            {selectedBalance && selectedBalance.annual_quotas && (
              <div style={{ marginBottom: 16, padding: "12px", background: "var(--bg, #f9fafb)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block", marginBottom: 8, fontWeight: 600 }}>Leave Balances (Remaining)</span>
                <div style={{ display: "grid", gridTemplateColumns: selectedBalance.annual_quotas.period ? "repeat(4, 1fr)" : "repeat(3, 1fr)", gap: 8 }}>
                  <div style={{ textAlign: "center", background: "#fff", padding: "8px", borderRadius: 6, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Casual</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedBalance.annual_quotas.casual.remaining}</div>
                  </div>
                  <div style={{ textAlign: "center", background: "#fff", padding: "8px", borderRadius: 6, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Sick</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedBalance.annual_quotas.sick.remaining}</div>
                  </div>
                  <div style={{ textAlign: "center", background: "#fff", padding: "8px", borderRadius: 6, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Privileged</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedBalance.annual_quotas.privileged.remaining}</div>
                  </div>
                  {selectedBalance.annual_quotas.period && (
                    <div style={{ textAlign: "center", background: "#fff", padding: "8px", borderRadius: 6, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 11, color: "#ec4899" }}>Period</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#ec4899" }}>{selectedBalance.annual_quotas.period.remaining}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
              <div>
                <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>From Date</span>
                <input
                  type="date"
                  value={editedStartDate}
                  onChange={(e) => setEditedStartDate(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 13 }}
                />
              </div>
              <div>
                <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>To Date</span>
                <input
                  type="date"
                  value={editedEndDate}
                  min={editedStartDate}
                  onChange={(e) => setEditedEndDate(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", fontSize: 13 }}
                />
              </div>
            </div>
            {(editedStartDate !== (selectedLeave.start_date ? selectedLeave.start_date.split("T")[0] : "") ||
              editedEndDate !== (selectedLeave.end_date ? selectedLeave.end_date.split("T")[0] : "")) && (
              <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
                <button className="btn-primary" onClick={handleUpdateDates} style={{ padding: "6px 12px", fontSize: 12 }}>
                  Save Date Changes
                </button>
              </div>
            )}
            
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>Subject</span>
              <strong>{selectedLeave.subject}</strong>
            </div>
            
            <div style={{ marginBottom: 14 }}>
              <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block", marginBottom: 6, fontWeight: 600 }}>Reason / Description</span>
              <div style={{ padding: "12px 14px", borderRadius: 8, background: "var(--hover-bg, rgba(255,255,255,0.04))", border: "1px solid var(--border)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 200, overflowY: "auto" }}>
                {selectedLeave.description || "No description provided."}
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block", marginBottom: 6, fontWeight: 600 }}>Attachments</span>
              {(() => {
                const atts = getAttachments(selectedLeave);
                return atts.length > 0 ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {atts.map((url, j) => (
                      <a
                        key={j}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          background: "var(--hover-bg, rgba(255,255,255,0.05))",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "var(--accent)",
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        📎 Attachment {atts.length > 1 ? j + 1 : ""}
                      </a>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: "var(--muted, #666)", fontSize: 13 }}>No attachments</span>
                );
              })()}
            </div>

            <div style={{ marginBottom: 14 }}>
              <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block", marginBottom: 4 }}>
                Approver Note / Reason (Optional)
              </span>
              <textarea
                className="input"
                rows={2}
                placeholder="Add a remark or note (e.g. Approved as per project deadline, or reason for rejection/unpaid)..."
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                style={{ width: "100%", fontSize: 13, resize: "vertical" }}
              />
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {selectedLeave.status === "Approved" ? (
                  <>
                    {selectedLeave.is_paid ? (
                      <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => updateLeave(selectedLeave, "approve_unpaid")}>
                        Mark as Unpaid
                      </button>
                    ) : (
                      <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => updateLeave(selectedLeave, "approve_paid")}>
                        Mark as Paid
                      </button>
                    )}
                    <button className="btn-danger" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => updateLeave(selectedLeave, "reject")}>
                      Reject Leave
                    </button>
                  </>
                ) : selectedLeave.status === "Cancelled" ? (
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                    Cancelled by the employee. No action needed.
                  </span>
                ) : selectedLeave.status === "Rejected" ? (
                  <>
                    <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => updateLeave(selectedLeave, "approve_paid")}>
                      Approve as Paid
                    </button>
                    <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => updateLeave(selectedLeave, "approve_unpaid")}>
                      Approve as Unpaid
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => updateLeave(selectedLeave, "approve_paid")}>
                      Approve (Paid)
                    </button>
                    <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => updateLeave(selectedLeave, "approve_unpaid")}>
                      Approve (Unpaid)
                    </button>
                    <button className="btn-danger" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => updateLeave(selectedLeave, "reject")}>
                      Reject
                    </button>
                  </>
                )}
              </div>
              <button className="btn-ghost" onClick={() => setSelectedLeave(null)} style={{ padding: "6px 16px", borderRadius: 6 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .approvals-table-desktop {
          display: block;
        }
        .pending-cards-mobile,
        .history-cards-mobile {
          display: none;
        }
        @media (max-width: 768px) {
          .approvals-table-desktop {
            display: none !important;
          }
          .pending-cards-mobile,
          .history-cards-mobile {
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
