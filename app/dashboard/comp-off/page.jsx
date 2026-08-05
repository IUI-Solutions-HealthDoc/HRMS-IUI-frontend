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

export default function CompOffPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const canEdit = role === "hr";
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
          <p style={{ color: "var(--muted)", marginTop: 4 }}>{isAdmin ? "Admin view is detail-first and read-only. HR resolves comp-off or extra pay." : "Log comp-off work and resolve it as comp-off or extra pay."}</p>
        </div>
        {canEdit ? <button className="btn-primary" onClick={() => { setForm(EMPTY_COMPOFF_FORM); setShowModal(true); }}>Log Comp-Off Work</button> : null}
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
      {showModal ? (
        <Modal
          title="Log Comp-Off Work"
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
            <div className="form-group"><label className="label">Date <span style={{ color: "#ef4444" }}>*</span></label><input className="input" type="date" max={new Date().toISOString().split("T")[0]} value={form.work_date} onChange={(e) => setForm((current) => ({ ...current, work_date: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Hours Worked <span style={{ color: "#ef4444" }}>*</span></label><input className="input" type="number" min={1} max={12} value={form.hours_worked} onChange={(e) => { const v = Math.min(12, Math.max(1, +e.target.value || 1)); setForm((current) => ({ ...current, hours_worked: v })); }} /></div>
          </div>
          <div className="form-group"><label className="label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} /></div>
        </Modal>
      ) : null}
      {toastNode}
    </div>
  );
}
