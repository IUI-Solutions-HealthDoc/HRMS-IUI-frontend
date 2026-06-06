"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/formatters";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";

const FILTERS = [
  { id: "", label: "All Leaves" },
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid Approved" },
  { id: "unpaid", label: "Unpaid Approved" },
  { id: "rejected", label: "Rejected" },
];

export default function LeaveApprovalsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showToast, toastNode] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingData, allData] = await Promise.all([
        apiFetch("/leave/pending"),
        apiFetch(filter ? `/leave/all?leave_type=${filter}` : "/leave/all"),
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

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Pending Approvals ({pending.length})</h2>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((item) => (
                  <tr key={item.id}>
                    <td><b>{item.name || item.emp_id}</b></td>
                    <td><span className="chip">{item.subject}</span></td>
                    <td>{fmtDate(item.start_date)}</td>
                    <td>{fmtDate(item.end_date)}</td>
                    <td style={{ maxWidth: 220 }}>{item.description}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => updateLeave(item, "approve_paid")}>Paid</button>
                        <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => updateLeave(item, "approve_unpaid")}>Unpaid</button>
                        <button className="btn-danger" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => updateLeave(item, "reject")}>Reject</button>
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
        {loading ? <Loader /> : history.length === 0 ? (
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td><b>{item.name || item.emp_id}</b></td>
                    <td>{item.status === "Approved" ? (item.is_paid ? "Paid" : "Unpaid") : "—"}</td>
                    <td>{fmtDate(item.start_date)}</td>
                    <td>{fmtDate(item.end_date)}</td>
                    <td>{item.subject}</td>
                    <td><StatusBadge status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toastNode}
    </div>
  );
}
