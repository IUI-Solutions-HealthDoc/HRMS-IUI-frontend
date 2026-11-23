"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/formatters";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import Pagination from "@/components/ui/Pagination";


const EMPTY_COMPOFF_FORM = { employee_emp_id: "", work_date: "", hours_worked: 8, notes: "" };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function CompOffAdjustments({ canApply, showToast, employees, refreshKey, onChanged }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [empId, setEmpId] = useState("");
  const [days, setDays] = useState(1);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState(null);
  const [adjustments, setAdjustments] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadAdjustments = useCallback(async () => {
    try {
      const data = await apiFetch(`/sunday-work/compoff/adjustments?month=${month}&year=${year}`);
      setAdjustments(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(error.message, "error");
    }
  }, [month, year, showToast]);

  const loadStatus = useCallback(async () => {
    const id = empId.trim().toUpperCase();
    if (!id) { setStatus(null); return; }
    try {
      setStatus(await apiFetch(`/sunday-work/compoff/status/${encodeURIComponent(id)}?month=${month}&year=${year}`));
    } catch (error) {
      setStatus({ error: error.message });
    }
  }, [empId, month, year]);

  useEffect(() => { loadAdjustments(); }, [loadAdjustments, refreshKey]);
  useEffect(() => {
    const t = setTimeout(loadStatus, 300);
    return () => clearTimeout(t);
  }, [loadStatus, refreshKey]);

  async function apply() {
    setBusy(true);
    try {
      const result = await apiFetch("/sunday-work/compoff/apply", {
        method: "POST",
        body: JSON.stringify({ employee_emp_id: empId.trim().toUpperCase(), month, year, days: +days, notes }),
      });
      showToast(result?.message || "Comp-off applied");
      setNotes("");
      await Promise.all([loadAdjustments(), loadStatus()]);
      onChanged?.();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function undo(id) {
    try {
      const result = await apiFetch(`/sunday-work/compoff/adjustments/${id}`, { method: "DELETE" });
      showToast(result?.message || "Adjustment removed");
      await Promise.all([loadAdjustments(), loadStatus()]);
      onChanged?.();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  const maxDays = status && !status.error ? Math.min(status.compoff_balance || 0, status.coverable_days || 0) : 0;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 className="syne" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Use Comp-Off for Unpaid Leave / Absence</h2>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, maxWidth: 640 }}>
            Comp-off earned for work on a Sunday or company holiday can cancel the salary cut for unpaid leave or absent days in a month. Each comp-off day covers one unpaid day in that month&apos;s payroll.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="input" style={{ width: "auto" }} value={month} onChange={(e) => setMonth(+e.target.value)}>
            {MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
          </select>
          <select className="input" style={{ width: "auto" }} value={year} onChange={(e) => setYear(+e.target.value)}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div style={{ padding: "18px 22px" }}>
        {canApply ? (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Employee ID</label>
                <input className="input" list="compoff-employees" placeholder="e.g. EMP001" value={empId} onChange={(e) => setEmpId(e.target.value)} />
                <datalist id="compoff-employees">
                  {employees.map((emp) => <option key={emp.emp_id} value={emp.emp_id}>{emp.name}</option>)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="label">Days to use</label>
                <input className="input" type="number" min={0.5} step={0.5} max={maxDays || undefined} value={days} onChange={(e) => setDays(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Notes</label>
                <input className="input" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            {status?.error ? <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{status.error}</div> : null}
            {status && !status.error ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 18, fontSize: 13, marginBottom: 14 }}>
                <span><b>{status.name}</b></span>
                <span>Comp-off balance: <b>{status.compoff_balance}</b></span>
                <span>Unpaid leave: <b>{status.unpaid_leave_days}</b></span>
                <span>Absent: <b>{status.absent_days}</b></span>
                <span>Half days: <b>{status.half_days}</b></span>
                <span>Already covered: <b>{status.already_adjusted_days}</b></span>
                <span>Can still cover: <b>{status.coverable_days}</b></span>
              </div>
            ) : null}
            <button className="btn-primary" disabled={busy || !empId.trim() || !(+days > 0) || (status && !status.error && +days > maxDays)} onClick={apply}>
              {busy ? "Applying..." : `Use comp-off for ${MONTHS[month - 1]} ${year}`}
            </button>
          </>
        ) : null}
        <div style={{ marginTop: canApply ? 20 : 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Adjustments for {MONTHS[month - 1]} {year}</div>
          {adjustments.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>No comp-off adjustments this month.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Employee</th><th>Days</th><th>Notes</th><th>Applied On</th>{canApply ? <th>Action</th> : null}</tr></thead>
                <tbody>
                  {adjustments.map((a) => (
                    <tr key={a.id}>
                      <td><b>{a.name}</b><div style={{ fontSize: 12, color: "var(--muted)" }}>{a.emp_id}</div></td>
                      <td>{a.days}</td>
                      <td>{a.notes || "—"}</td>
                      <td>{a.created_at ? fmtDate(a.created_at) : "—"}</td>
                      {canApply ? <td><button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => undo(a.id)}>Undo</button></td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompOffPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const canEdit = role === "hr";
  const canSeeAdjustments = isAdmin || role === "hr" || role === "accounts";
  const [refreshKey, setRefreshKey] = useState(0);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_COMPOFF_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;
  const [showToast, toastNode] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/sunday-work");
      setLogs(Array.isArray(data) ? data : []);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function logWork() {
    try {
      await apiFetch("/sunday-work/log", { method: "POST", body: JSON.stringify(form) });
      showToast("Comp-Off logged");
      setShowModal(false);
      setForm(EMPTY_COMPOFF_FORM);
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function resolve(id, resolution) {
    const today = new Date();
    try {
      await apiFetch(`/sunday-work/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution, resolve_month: today.getMonth() + 1, resolve_year: today.getFullYear() }),
      });
      showToast(`Resolved as ${resolution}`);
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Comp-Off Management</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>{isAdmin ? "Admin view is detail-first and read-only. HR resolves comp-off or extra pay." : "Log work done on a Sunday or company holiday and resolve it as comp-off or extra pay. Comp-off days can then cover unpaid leave or absence below."}</p>
        </div>
        {canEdit ? <button className="btn-primary" onClick={() => { setForm(EMPTY_COMPOFF_FORM); setShowModal(true); }}>Log Sunday / Holiday Work</button> : null}
      </div>
      <div className="card">
        {loading ? <Loader /> : logs.length === 0 ? (
          <EmptyState icon="☀" title="No comp-off logs" />
        ) : (
          <div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Employee</th><th>Date</th><th>Hours</th><th>Notes</th><th>Resolution</th><th>Extra Pay</th><th>Action</th></tr></thead>
                <tbody>
                  {(() => {
                    const safePage = Math.min(currentPage, Math.max(1, Math.ceil(logs.length / PER_PAGE)));
                    const paginatedLogs = logs.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
                    return paginatedLogs.map((log) => (
                      <tr key={log.id}>
                        <td><b>{log.name}</b><div style={{ fontSize: 12, color: "var(--muted)" }}>{log.emp_id}</div></td>
                        <td>{fmtDate(log.work_date)}</td>
                        <td>{log.hours_worked}h</td>
                        <td>{log.notes || "—"}</td>
                        <td><StatusBadge status={(log.resolution || "pending").toLowerCase()} /></td>
                        <td>{log.extra_pay ? `₹${log.extra_pay}` : "—"}</td>
                        <td>
                          {canEdit && log.resolution === "Pending" ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => resolve(log.id, "CompOff")}>Comp-Off</button>
                              <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => resolve(log.id, "ExtraPay")}>Extra Pay</button>
                            </div>
                          ) : "View only"}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={logs.length}
              pageSize={PER_PAGE}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>
      {canSeeAdjustments ? (
        <CompOffAdjustments
          canApply={canEdit}
          showToast={showToast}
          refreshKey={refreshKey}
          onChanged={() => setRefreshKey((k) => k + 1)}
          employees={Array.from(new Map(logs.map((l) => [l.emp_id, { emp_id: l.emp_id, name: l.name }])).values())}
        />
      ) : null}
      {showModal ? (
        <Modal
          title="Log Sunday / Holiday Work"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={logWork}>Save</button>
            </>
          }
        >
          <div className="form-row">
            <div className="form-group"><label className="label">Employee ID <span style={{ color: "#ef4444" }}>*</span></label><input className="input" value={form.employee_emp_id} onChange={(e) => setForm((current) => ({ ...current, employee_emp_id: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Date (Sunday or holiday) <span style={{ color: "#ef4444" }}>*</span></label><input className="input" type="date" max={new Date().toISOString().split("T")[0]} value={form.work_date} onChange={(e) => setForm((current) => ({ ...current, work_date: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Hours Worked <span style={{ color: "#ef4444" }}>*</span></label><input className="input" type="number" min={1} max={12} value={form.hours_worked} onChange={(e) => { const v = Math.min(12, Math.max(1, +e.target.value || 1)); setForm((current) => ({ ...current, hours_worked: v })); }} /></div>
          </div>
          <div className="form-group"><label className="label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} /></div>
        </Modal>
      ) : null}
      {toastNode}
    </div>
  );
}
