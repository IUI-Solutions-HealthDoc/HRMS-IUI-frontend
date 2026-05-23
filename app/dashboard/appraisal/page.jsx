"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fmtINR } from "@/lib/formatters";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";

export default function AppraisalPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isAccounts = role === "accounts";
  const isHR = role === "hr";
  const canView = isAdmin || isAccounts || isHR;
  const [requests, setRequests] = useState([]);
  const [targets, setTargets] = useState([]);
  const [requestForm, setRequestForm] = useState({ employee_emp_id: "", increment_percent: "", justification: "", effective_from: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showToast, toastNode] = useToast();
  const showFinancialColumns = isAdmin || isAccounts;

  const load = useCallback(async () => {
    if (!canView) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const status = isAdmin ? "pending_admin" : (isAccounts ? "pending_accounts" : "all");
      const promises = [apiFetch(`/performance/increment-requests?status=${status}`)];
      if (isHR) promises.push(apiFetch("/employees"));
      const [d, employeeData] = await Promise.all(promises);
      setRequests(Array.isArray(d) ? d : []);
      if (isHR) {
        const employees = (Array.isArray(employeeData) ? employeeData : []).filter((item) => !item.is_accounts && !item.is_superuser);
        setTargets(employees);
        if (!requestForm.employee_emp_id && employees.length > 0) {
          setRequestForm((current) => ({ ...current, employee_emp_id: employees[0].emp_id }));
        }
      }
    } catch {
      setRequests([]);
      if (isHR) setTargets([]);
    }
    setLoading(false);
  }, [canView, isAccounts, isAdmin, isHR, requestForm.employee_emp_id]);

  useEffect(() => { load(); }, [load]);

  async function decide(id, decision) {
    const note = window.prompt(
      isAccounts ? "Add Accounts review note (optional):" : "Add Admin decision note (optional):",
      ""
    );
    if (note === null) return;
    try {
      await apiFetch(`/performance/increment-requests/${id}/decide`, {
        method: "POST",
        body: JSON.stringify(
          isAccounts
            ? { decision, accounts_comments: note || undefined }
            : { decision, admin_comments: note || undefined }
        ),
      });
      showToast(isAccounts ? "Request updated for Admin queue" : "Increment decision saved");
      load();
    } catch (e) { showToast(e.message, "error"); }
  }

  async function submitIncrementRequest(e) {
    e.preventDefault();
    if (!isHR) return;
    const percent = Number(requestForm.increment_percent);
    if (!requestForm.employee_emp_id) {
      showToast("Select an employee", "error");
      return;
    }
    if (!Number.isFinite(percent) || percent <= 0) {
      showToast("Enter a valid increment percentage", "error");
      return;
    }
    if (!requestForm.justification.trim()) {
      showToast("Justification is required", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employee_emp_id: requestForm.employee_emp_id,
        increment_percent: percent,
        justification: requestForm.justification.trim(),
      };
      if (requestForm.effective_from) payload.effective_from = requestForm.effective_from;

      await apiFetch("/performance/increment-request", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      showToast("Increment request sent to Accounts review");
      setRequestForm((current) => ({ ...current, increment_percent: "", justification: "", effective_from: "" }));
      load();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const heading = isAccounts ? "Appraisal Review Queue" : "Salary Appraisal Approvals";
  const subheading = isAccounts
    ? "Review HR appraisals, verify amount impact, and forward to Admin"
    : (isAdmin
      ? "Review account-verified appraisals and finalize approval"
      : "Create and track appraisals from HR");

  const emptyTitle = isAccounts
    ? "No appraisals pending Accounts review"
    : (isAdmin ? "No appraisals pending Admin approval" : "No appraisals yet");

  return (
    <div>
      <div className="page-header"><h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>{heading}</h1><p style={{ color: "var(--muted)", marginTop: 4 }}>{subheading}</p></div>

      {isHR ? (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Create Appraisal</div>
          <form onSubmit={submitIncrementRequest}>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Employee</label>
                <select className="input" value={requestForm.employee_emp_id} onChange={(e) => setRequestForm((current) => ({ ...current, employee_emp_id: e.target.value }))}>
                  <option value="">Select employee</option>
                  {targets.map((item) => <option key={item.emp_id} value={item.emp_id}>{item.emp_id} - {item.first_name} {item.last_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Increment %</label>
                <input className="input" type="number" step="0.01" min="0.01" value={requestForm.increment_percent} onChange={(e) => setRequestForm((current) => ({ ...current, increment_percent: e.target.value }))} placeholder="e.g. 8" />
              </div>
              <div className="form-group">
                <label className="label">Effective From (optional)</label>
                <input className="input" type="date" value={requestForm.effective_from} onChange={(e) => setRequestForm((current) => ({ ...current, effective_from: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Justification</label>
              <textarea className="input" rows={3} value={requestForm.justification} onChange={(e) => setRequestForm((current) => ({ ...current, justification: e.target.value }))} placeholder="Reason for this appraisal" />
            </div>
            <button className="btn-primary" type="submit" disabled={submitting || loading}>{submitting ? "Submitting..." : "Submit to Accounts"}</button>
          </form>
        </div>
      ) : null}

      <div className="card">
        {!canView ? <EmptyState icon="💹" title="Access restricted" sub="Only HR, Accounts, and Admin can view appraisals." /> : loading ? <Loader /> : requests.length === 0 ? <EmptyState icon="💹" title={emptyTitle} /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Employee</th>{showFinancialColumns ? <th>Current</th> : null}<th>Increment</th>{showFinancialColumns ? <th>Increment Amount</th> : null}{showFinancialColumns ? <th>Proposed</th> : null}<th>Requested By</th><th>Notes</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{requests.map((r, i) => (
                <tr key={i}>
                  <td><b>{r.emp_id}</b><div style={{fontSize:12,color:"var(--muted)"}}>{r.name}</div></td>
                  {showFinancialColumns ? <td>{fmtINR(r.current_salary)}</td> : null}
                  <td><span style={{ color: "#10b981", fontWeight: 700 }}>{r.increment_percent ? `+${r.increment_percent}%` : "—"}</span></td>
                  {showFinancialColumns ? <td>{fmtINR(r.increment_amount)}</td> : null}
                  {showFinancialColumns ? <td><span style={{ fontWeight: 700, color: "#10b981" }}>{fmtINR(r.proposed_salary)}</span></td> : null}
                  <td>{r.requested_by_name || `ID: ${r.requested_by_id}`}</td>
                  <td style={{ maxWidth: 220 }}>
                    <div>{r.justification}</div>
                    {r.accounts_comments ? <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>Accounts: {r.accounts_comments}</div> : null}
                    {r.admin_comments ? <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>Admin: {r.admin_comments}</div> : null}
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{(isAccounts && r.status === "pending_accounts") || (isAdmin && r.status === "pending_admin") ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      {isAccounts ? (
                        <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => decide(r.id, "forward")}>→ Forward</button>
                      ) : (
                        <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => decide(r.id, "approve")}>✓ Approve</button>
                      )}
                      <button className="btn-danger" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => decide(r.id, "reject")}>✕ Reject</button>
                    </div>
                  ) : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
      {toastNode}
    </div>
  );
}
