"use client";

import { useCallback, useEffect, useState } from "react";
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

  async function updateLeave(item, action) {
    const actionLabel = action === "approve_paid" ? "Paid" : action === "approve_unpaid" ? "Unpaid" : "Rejected";
    const empName = item.name || item.emp_id || "Employee";
    const subject = item.subject || "No Subject";
    if (!confirm(`Are you sure you want to mark this leave as ${actionLabel} for ${empName} (Subject: ${subject})?`)) {
      return;
    }
    try {
      await apiFetch(`/leave/${item.id}/update`, { method: "POST", body: JSON.stringify({ action }) });
      showToast("Leave updated");
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  const filteredPending = pending.filter((item) => {
    if (!user) return true;
    if (item.employee_id && user.id && String(item.employee_id) === String(user.id)) return false;
    if (item.emp_id && user.emp_id && item.emp_id === user.emp_id) return false;
    return true;
  });

  const filteredHistory = history.filter((item) => {
    if (!user) return true;
    if (item.employee_id && user.id && String(item.employee_id) === String(user.id)) return false;
    if (item.emp_id && user.emp_id && item.emp_id === user.emp_id) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Leave Approvals</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {isAdmin ? "Admin can review the full leave ledger and pending approvals." : "Review requests and classify approvals as paid or unpaid."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Subject</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Description</th>
                  <th>Attachments</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((item) => (
                  <tr key={item.id} onClick={() => setSelectedLeave(item)} style={{ cursor: "pointer" }}>
                    <td><b>{item.name || item.emp_id}</b></td>
                    <td><span className="chip">{item.subject}</span></td>
                    <td>{fmtDate(item.start_date)}</td>
                    <td>{fmtDate(item.end_date)}</td>
                    <td style={{ maxWidth: 220 }}>{item.description}</td>
                    <td>
                      {(item.attachments?.length > 0) ? item.attachments.map((url, j) => (
                        <a key={j} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginRight: 6, fontSize: 12, color: "var(--accent)" }}>
                          📎 File {j + 1}
                        </a>
                      )) : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}
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
        </div>
      )}

      <div className="card">
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>All Leave History</h2>
        </div>
        {loading ? <Loader /> : filteredHistory.length === 0 ? (
          <EmptyState icon="📅" title="No leave records" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Attachments</th>
                  <th>Status</th>
                  <th>Action By</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const safePage = Math.min(currentPage, Math.max(1, Math.ceil(filteredHistory.length / PER_PAGE)));
                  const paginated = filteredHistory.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
                  return paginated.map((item) => (
                    <tr key={item.id} onClick={() => setSelectedLeave(item)} style={{ cursor: "pointer" }}>
                      <td><b>{item.name || item.emp_id}</b></td>
                      <td>{item.status === "Approved" ? (item.is_paid ? "Paid" : "Unpaid") : "—"}</td>
                      <td>{fmtDate(item.start_date)}</td>
                      <td>{fmtDate(item.end_date)}</td>
                      <td>{item.subject}</td>
                      <td>
                        {(item.attachments?.length > 0) ? item.attachments.map((url, j) => (
                          <a key={j} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginRight: 6, fontSize: 12, color: "var(--accent)" }}>
                            📎 File {j + 1}
                          </a>
                        )) : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}
                      </td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>
                        {item.action_by_name ? (
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>
                            {item.action_by_name} {item.action_by_role ? `(${item.action_by_role})` : ""}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: "var(--card-bg, #fff)", padding: 24, borderRadius: 12, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
            <h2 className="syne" style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Leave Details</h2>
            
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>Employee</span>
              <strong>{selectedLeave.name || selectedLeave.emp_id}</strong>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>Leave Type</span>
                <strong>{selectedLeave.leave_type || "Casual Leave"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>Status</span>
                <StatusBadge status={selectedLeave.status} />
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>From</span>
                <strong>{fmtDate(selectedLeave.start_date)}</strong>
              </div>
              <div>
                <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>To</span>
                <strong>{fmtDate(selectedLeave.end_date)}</strong>
              </div>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>Subject</span>
              <strong>{selectedLeave.subject}</strong>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block" }}>Description</span>
              <p style={{ margin: "4px 0 0 0", fontSize: 14 }}>{selectedLeave.description || "—"}</p>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <span style={{ color: "var(--muted, #666)", fontSize: 12, display: "block", marginBottom: 4 }}>Attachments</span>
              {(selectedLeave.attachments?.length > 0) ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selectedLeave.attachments.map((url, j) => (
                    <a key={j} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "6px 12px", background: "var(--bg, #f3f4f6)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 6, fontSize: 12, color: "var(--accent, #3b82f6)", textDecoration: "none" }}>
                      📎 Attachment {j + 1}
                    </a>
                  ))}
                </div>
              ) : <span style={{ color: "var(--muted, #666)", fontSize: 14 }}>No attachments</span>}
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setSelectedLeave(null)} style={{ padding: "8px 16px", borderRadius: 6 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toastNode}
    </div>
  );
}
