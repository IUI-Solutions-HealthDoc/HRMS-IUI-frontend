"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import Loader from "@/components/ui/Loader";
import Pagination from "@/components/ui/Pagination";

const PER_PAGE = 15;

// Moved off the Leave Approvals page: the sheet lists every active employee, so it
// gets its own page with search and pagination instead of loading on every approval.
export default function LeaveBalancesPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const canEditLeaveQuotas = isAdmin || role === "hr";
  const [showToast, toastNode] = useToast();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [balances, setBalances] = useState([]);
  const [quotaEditor, setQuotaEditor] = useState(null);
  const [quotaForm, setQuotaForm] = useState({
    cl_quota: "", sl_quota: "", pl_quota: "", period_quota: "",
    cl_taken: "", sl_taken: "", pl_taken: "", period_taken: "",
  });
  const [quotaSaving, setQuotaSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/leave/balances");
      setBalances(Array.isArray(data?.balances) ? data.balances : []);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  function openQuotaEditor(row) {
    setQuotaEditor(row);
    setQuotaForm({
      cl_quota: String(row.casual.total),
      sl_quota: String(row.sick.total),
      pl_quota: String(row.privileged.total),
      period_quota: String(row.period?.total ?? (row.gender?.toLowerCase() === "female" ? 12 : 0)),
      cl_taken: String(row.casual.used),
      sl_taken: String(row.sick.used),
      pl_taken: String(row.privileged.used),
      period_taken: String(row.period?.used ?? 0),
    });
  }

  async function saveLeaveQuotas() {
    if (!quotaEditor) return;
    const clQ = Number(quotaForm.cl_quota);
    const slQ = Number(quotaForm.sl_quota);
    const plQ = Number(quotaForm.pl_quota);
    const pQ = Number(quotaForm.period_quota);

    const clT = Number(quotaForm.cl_taken);
    const slT = Number(quotaForm.sl_taken);
    const plT = Number(quotaForm.pl_taken);
    const pT = Number(quotaForm.period_taken);

    const allVals = [clQ, slQ, plQ, pQ, clT, slT, plT, pT];
    if (allVals.some((value) => !Number.isInteger(value) || value < 0)) {
      showToast("Quotas and taken leaves must be whole numbers of zero or more", "error");
      return;
    }
    setQuotaSaving(true);
    try {
      await apiFetch(`/leave/quota/${quotaEditor.emp_id}`, {
        method: "PUT",
        body: JSON.stringify({
          cl_quota: clQ,
          sl_quota: slQ,
          pl_quota: plQ,
          period_quota: pQ,
          cl_taken: clT,
          sl_taken: slT,
          pl_taken: plT,
          period_taken: pT,
        }),
      });
      setBalances((prev) => prev.map((b) => {
        if (b.emp_id !== quotaEditor.emp_id) return b;
        return {
          ...b,
          casual: { ...b.casual, total: clQ, used: clT, remaining: Math.max(0, clQ - clT) },
          sick: { ...b.sick, total: slQ, used: slT, remaining: Math.max(0, slQ - slT) },
          privileged: { ...b.privileged, total: plQ, used: plT, remaining: Math.max(0, plQ - plT) },
          period: { ...(b.period || {}), total: pQ, used: pT, remaining: Math.max(0, pQ - pT) },
        };
      }));
      showToast(`Leave quotas updated for ${quotaEditor.name || quotaEditor.emp_id}`);
      setQuotaEditor(null);
      await load();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setQuotaSaving(false);
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return balances;
    return balances.filter((row) =>
      [row.name, row.emp_id, row.department].some((value) => String(value || "").toLowerCase().includes(q))
    );
  }, [balances, search]);
  const pageRows = filteredRows.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div>
      {toastNode}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Leave Balance Sheet</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>Current-year quota, usage, and remaining balance for every active employee.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="input"
            type="search"
            placeholder="Search name, ID or department"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ minWidth: 240 }}
          />
          <Link href="/dashboard/leave-approvals" className="btn-ghost" style={{ textDecoration: "none" }}>
            ← Leave Approvals
          </Link>
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Leave Balancing Sheet ({filteredRows.length})</h2>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>Current-year quota, usage, and remaining balance for every active employee.</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Department</th><th>Casual (Taken / Total)</th><th>Sick (Taken / Total)</th><th>Privileged (Taken / Total)</th><th>Period (Taken / Total)</th>{canEditLeaveQuotas ? <th>Action</th> : null}</tr></thead>
              <tbody>
                {pageRows.map((row) => <tr key={row.emp_id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <b>{row.name}</b>
                      {row.gender?.toLowerCase() === "female" ? (
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(236,72,153,0.15)", color: "#ec4899", fontWeight: 600 }}>
                          ♀ Female
                        </span>
                      ) : null}
                      {row.is_in_probation ? (
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 600 }}>
                          Probation
                        </span>
                      ) : null}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>{row.emp_id}</div>
                  </td>
                  <td>{row.department || "—"}</td>
                  <td><b>{row.casual.used} / {row.casual.total}</b></td>
                  <td><b>{row.sick.used} / {row.sick.total}</b></td>
                  <td><b>{row.privileged.used} / {row.privileged.total}</b></td>
                  <td><b>{row.period ? `${row.period.used} / ${row.period.total}` : (row.gender?.toLowerCase() === "female" ? "0 / 12" : "—")}</b></td>
                  {canEditLeaveQuotas ? <td><button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => openQuotaEditor(row)}>Edit Quotas</button></td> : null}
                </tr>)}
                {!loading && filteredRows.length === 0 ? <tr><td colSpan={canEditLeaveQuotas ? 7 : 6} style={{ color: "var(--muted)" }}>No employee balances available.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredRows.length}
            pageSize={PER_PAGE}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}

      {quotaEditor && (
        <div className="modal-overlay" onClick={() => !quotaSaving && setQuotaEditor(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ background: "var(--card-bg, var(--surface))", padding: 24, borderRadius: 12, width: "100%", maxWidth: 560, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
            <h2 className="syne" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Edit Leave Quotas & Taken Count</h2>
            <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>{quotaEditor.name} ({quotaEditor.emp_id}) · {quotaEditor.department || "No department"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                ["Casual Leave", "cl_quota", "cl_taken"],
                ["Sick Leave", "sl_quota", "sl_taken"],
                ["Privileged Leave", "pl_quota", "pl_taken"],
                ...(quotaEditor.gender?.toLowerCase() === "female" || quotaEditor.is_female
                  ? [["Period Leave", "period_quota", "period_taken"]]
                  : []),
              ].map(([label, qField, tField]) => {
                const total = Number(quotaForm[qField]) || 0;
                const taken = Number(quotaForm[tField]) || 0;
                const left = Math.max(0, total - taken);
                return (
                  <div key={label} style={{ padding: 12, borderRadius: 8, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        Display: <b style={{ color: "var(--foreground)" }}>{taken} / {total}</b>
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="label" style={{ fontSize: 11 }}>Total Quota</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="1"
                          value={quotaForm[qField]}
                          onChange={(event) => setQuotaForm((current) => ({ ...current, [qField]: event.target.value }))}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="label" style={{ fontSize: 11 }}>Taken Leaves</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="1"
                          value={quotaForm[tField]}
                          onChange={(event) => setQuotaForm((current) => ({ ...current, [tField]: event.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 12 }}>Editing Taken Leaves increases used leaves (e.g. 4/10) without deducting total annual entitlement.</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button className="btn-ghost" disabled={quotaSaving} onClick={() => setQuotaEditor(null)}>Cancel</button>
              <button className="btn-primary" disabled={quotaSaving} onClick={saveLeaveQuotas}>{quotaSaving ? "Saving…" : "Save Quotas"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
