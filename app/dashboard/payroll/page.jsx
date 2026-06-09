"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fmtINR } from "@/lib/formatters";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";

export default function PayrollPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const canEdit = role === "accounts";
  const canUploadPayslip = role === "hr";
  const showSalary = isAdmin || canEdit;
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [editModal, setEditModal] = useState(null);
  const [uploadModal, setUploadModal] = useState(null);
  const [salaryForm, setSalaryForm] = useState({ base_salary: "", bank_account: "", ifsc_code: "" });
  const [selfServiceSettings, setSelfServiceSettings] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [showToast, toastNode] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [apiFetch(`/payroll/summary?month=${month}&year=${year}`)];
      if (isAdmin) requests.push(apiFetch("/payroll/approval-queue"));
      if (isAdmin) requests.push(apiFetch("/auth/self-service-settings"));
      const [data, queueData, settingsData] = await Promise.all(requests);
      setPayroll(Array.isArray(data) ? data : []);
      setQueue(Array.isArray(queueData) ? queueData : []);
      setSelfServiceSettings(settingsData || null);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [month, showToast, year]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateEmployee(empId) {
    try {
      await apiFetch(`/payroll/update-employee/${empId}`, {
        method: "POST",
        body: JSON.stringify({
          base_salary: salaryForm.base_salary ? +salaryForm.base_salary : undefined,
          bank_account: salaryForm.bank_account || undefined,
          ifsc_code: salaryForm.ifsc_code || undefined,
        }),
      });
      showToast("Payroll details updated");
      setEditModal(null);
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function uploadPayslip() {
    if (!uploadModal || !uploadFile) return;
    const body = new FormData();
    body.append("file", uploadFile);
    try {
      await apiFetch(`/payroll/uploaded-payslip/${uploadModal.emp_id}?month=${month}&year=${year}`, {
        method: "POST",
        body,
        headers: {},
      });
      showToast("Payslip uploaded");
      setUploadModal(null);
      setUploadFile(null);
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function decideRequest(kind, id, decision) {
    try {
      await apiFetch(`/payroll/approval-queue/${kind}/${id}/decide?decision=${decision}`, { method: "POST" });
      showToast(`Request ${decision}d`);
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function saveSelfServiceSettings() {
    try {
      await apiFetch("/auth/self-service-settings", { method: "PUT", body: JSON.stringify(selfServiceSettings) });
      showToast("Payslip visibility updated");
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  const totalPayroll = payroll.reduce((sum, row) => sum + (row.net_salary || 0), 0);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Payroll Summary</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {isAdmin ? "Admin can review payroll and approve increments. Salary edits stay with Accounts." : "Accounts can save the first payroll edit directly. Any later change goes to Admin for approval."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="input" style={{ width: "auto" }} value={month} onChange={(e) => setMonth(+e.target.value)}>
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
          </select>
          <select className="input" style={{ width: "auto" }} value={year} onChange={(e) => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <button className="btn-primary" onClick={load}>Load</button>
        </div>
      </div>

      {isAdmin && (
        <div className="card" style={{ padding: 18, marginBottom: 24, background: "rgba(59,130,246,0.08)" }}>
          Payroll is view-only here for Admin. Use the Increments section for approvals and leave salary edits to Accounts.
        </div>
      )}

      {isAdmin && selfServiceSettings && (
        <div className="card" style={{ padding: 18, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>My Payslip Visibility</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            {[
              ["show_employee_payslip", "Employee"],
              ["show_hr_payslip", "HR"],
              ["show_hod_payslip", "HOD"],
              ["show_accounts_payslip", "Accounts"],
            ].map(([field, label]) => (
              <label key={field} className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={selfServiceSettings[field]} onChange={(event) => setSelfServiceSettings((current) => ({ ...current, [field]: event.target.checked }))} />
                <span>{label} can see `My Payslip`</span>
              </label>
            ))}
          </div>
          <button className="btn-primary" onClick={saveSelfServiceSettings}>Save Visibility</button>
        </div>
      )}

      {isAdmin && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Pending Payroll Approvals</h2>
          </div>
          {queue.length === 0 ? (
            <div style={{ padding: 24, color: "var(--muted)" }}>No pending payroll requests from Accounts.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Employee</th><th>Request Type</th><th>Details</th><th>Requested On</th><th>Action</th></tr></thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={`${item.kind}-${item.id}`}>
                      <td><b>{item.employee_name}</b><div style={{ fontSize: 12, color: "var(--muted)" }}>{item.emp_id}</div></td>
                      <td>{item.kind === "salary" ? "Salary Change" : "Payroll Update"}</td>
                      <td style={{ maxWidth: 320 }}>
                        {item.proposed_base_salary !== null && item.proposed_base_salary !== undefined ? <div>Base Salary: {fmtINR(item.current_base_salary)} → {fmtINR(item.proposed_base_salary)}</div> : null}
                        {item.proposed_bank_account ? <div>Bank: {item.proposed_bank_account}</div> : null}
                        {item.proposed_ifsc_code ? <div>IFSC: {item.proposed_ifsc_code}</div> : null}
                      </td>
                      <td>{item.requested_on?.split("T")[0] || "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => decideRequest(item.kind, item.id, "approve")}>Approve</button>
                          <button className="btn-danger" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => decideRequest(item.kind, item.id, "reject")}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard icon="👥" label="Employees" value={payroll.length} />
        {showSalary && <StatCard icon="💰" label="Total Payroll" value={fmtINR(totalPayroll)} accent="#f59e0b" />}
        {showSalary && <StatCard icon="📊" label="Avg Salary" value={payroll.length ? fmtINR(Math.round(totalPayroll / payroll.length)) : "—"} />}
      </div>

      <div className="card">
        {loading ? <Loader /> : payroll.length === 0 ? (
          <EmptyState icon="💰" title="No payroll data" sub="Load a month to review payroll." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>EMP ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  {showSalary && <th>Base Salary</th>}
                  {showSalary && <th>Net Salary</th>}
                  <th>Uploaded Payslip</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payroll.map((row) => (
                  <tr key={row.emp_id}>
                    <td><span className="chip">{row.emp_id}</span></td>
                    <td style={{ fontWeight: 600 }}>{row.employee_name}</td>
                    <td>{row.department || "—"}</td>
                    {showSalary && (
                      <td>
                        <div>{fmtINR(row.base_salary)}</div>
                        {canEdit ? <div style={{ fontSize: 11, color: "var(--muted)" }}>{row.payroll_edit_count ? "Next change needs admin approval" : "First change can be saved directly"}</div> : null}
                      </td>
                    )}
                    {showSalary && <td><span style={{ fontWeight: 700, color: "#10b981" }}>{fmtINR(row.net_salary)}</span></td>}
                    <td>{row.uploaded_payslip_url ? <a href={row.uploaded_payslip_url} target="_blank" rel="noreferrer">View</a> : "Not uploaded"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {canEdit ? (
                          <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => {
                            setEditModal(row);
                            setSalaryForm({ base_salary: row.base_salary || "", bank_account: row.bank_account || "", ifsc_code: row.ifsc_code || "" });
                          }}>
                            Edit
                          </button>
                        ) : null}
                        {canUploadPayslip ? (
                          <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => setUploadModal(row)}>
                            {row.uploaded_payslip_url ? "Replace Payslip" : "Upload Payslip"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editModal && (
        <Modal
          title={`Edit Payroll: ${editModal.employee_name}`}
          onClose={() => setEditModal(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => updateEmployee(editModal.emp_id)}>Update</button>
            </>
          }
        >
          <div className="card" style={{ padding: 14, marginBottom: 16, background: "rgba(59,130,246,0.08)" }}>
            {editModal.payroll_edit_count ? "This employee already used the first direct payroll edit. Saving now will create an admin approval request." : "This is the first payroll edit for this employee, so Accounts can save it directly."}
          </div>
          <div className="form-group">
            <label className="label">Base Salary</label>
            <input className="input" type="number" value={salaryForm.base_salary} onChange={(e) => setSalaryForm((current) => ({ ...current, base_salary: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Bank Account</label>
            <input className="input" value={salaryForm.bank_account} onChange={(e) => setSalaryForm((current) => ({ ...current, bank_account: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">IFSC Code</label>
            <input className="input" value={salaryForm.ifsc_code} onChange={(e) => setSalaryForm((current) => ({ ...current, ifsc_code: e.target.value }))} />
          </div>
        </Modal>
      )}

      {uploadModal && (
        <Modal
          title={`Upload Payslip: ${uploadModal.employee_name}`}
          onClose={() => setUploadModal(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setUploadModal(null)}>Cancel</button>
              <button className="btn-primary" disabled={!uploadFile} onClick={uploadPayslip}>Upload</button>
            </>
          }
        >
          <div className="form-group">
            <label className="label">Payslip File</label>
            <input className="input" type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
          </div>
        </Modal>
      )}

      {toastNode}
    </div>
  );
}
