"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch, getToken } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fmtDate, fmtTime } from "@/lib/formatters";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";

const AUTO_REFRESH_MS = 60000;

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ working_days: 0, present: 0, late: 0, absent: 0, half_day: 0, early_leave: 0, paid_leave: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showToast, toastNode] = useToast();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  function normalizeRecords(d) {
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.records)) return d.records;
    if (d && Array.isArray(d.data)) return d.data;
    if (d && typeof d === "object") return [d];
    return [];
  }

  const loadAttendance = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [data, ratingData] = await Promise.all([
        apiFetch(`/attendance/me?month=${month}&year=${year}`),
        apiFetch(`/performance/attendance-ratings?month=${month}&year=${year}`).catch(() => null),
      ]);
      setRecords(normalizeRecords(data));
      const myRow = ratingData?.employees?.[0];
      if (myRow) {
        setSummary({
          working_days: myRow.working_days || 0,
          present: myRow.present || 0,
          late: myRow.late || 0,
          absent: myRow.absent || 0,
          half_day: myRow.half_day || 0,
          early_leave: myRow.early_leave || 0,
          paid_leave: myRow.paid_leave || 0,
          attendance_star: myRow.attendance_star,
          punctuality_star: myRow.punctuality_star,
          present_equivalent: myRow.present_equivalent,
        });
      }
      setLastUpdated(new Date());
    } catch (error) {
      if (!silent) {
        setRecords([]);
        showToast(error.message, "error");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [month, showToast, year]);

  async function downloadMyAttendance() {
    setExporting(true);
    try {
      const token = getToken();
      const response = await fetch(`/api/proxy/exports/my-attendance?month=${month}&year=${year}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Attendance export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const contentDisposition = response.headers.get("content-disposition") || "";
      const match = contentDisposition.match(/filename="?([^\"]+)"?/i);
      const filename = match?.[1] || `My_Attendance_${year}_${String(month).padStart(2, "0")}.xlsx`;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast("Attendance export started");
    } catch (error) {
      showToast(error.message || "Attendance export failed", "error");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    loadAttendance();
    const interval = setInterval(() => loadAttendance({ silent: true }), AUTO_REFRESH_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadAttendance({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadAttendance]);

  // Authoritative counts come from /performance/attendance-ratings (includes no-punch absents).
  // Fallback to record-based counts when the rating call has not landed yet.
  const presents = summary.present_equivalent != null
    ? summary.present_equivalent
    : records.filter((r) => r.status === "present" || r.status === "half_day" || r.status === "late" || r.status === "early_leave").length;
  const lates = summary.late || records.filter((r) => r.status === "late").length;
  const absents = summary.absent != null
    ? summary.absent
    : records.filter((r) => r.status === "absent").length;
  const workingDays = summary.working_days || 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Attendance</h1>
        <p style={{ color: "var(--muted)", marginTop: 4 }}>Track your daily punch-in/out & monthly records</p>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select className="input" style={{ width: "auto" }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {months.map((item, index) => <option key={item} value={index + 1}>{item}</option>)}
          </select>
          <select className="input" style={{ width: "auto" }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <button className="btn-ghost" onClick={() => loadAttendance()}>Refresh</button>
          {lastUpdated ? (
            <span style={{ alignSelf: "center", fontSize: 12, color: "var(--muted)" }}>
              Auto-updates every minute · last {lastUpdated.toLocaleTimeString()}
            </span>
          ) : null}
          <button className="btn-primary" disabled={exporting} onClick={downloadMyAttendance}>
            {exporting ? "Exporting..." : "Export My Attendance"}
          </button>
        </div>
      </div>
      <div className="card" style={{ padding: 20, marginBottom: 24, display: "flex", alignItems: "center", gap: 14, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
        <span style={{ fontSize: 28 }}>📟</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Attendance via Biometric Terminal</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>
            Check-in and check-out are recorded by the biometric device at the office entrance.
          </div>
        </div>
      </div>
      <div className="grid-stats" style={{ marginBottom: 28 }}>
        <StatCard icon="✅" label={`Present (of ${workingDays || "—"} working days)`} value={presents} accent="#10b981" />
        <StatCard icon="⚠️" label="Late Arrivals" value={lates} accent="#f59e0b" />
        <StatCard icon="✗" label="Absences" value={absents} accent="#ef4444" />
        <StatCard icon="📅" label="Total Records" value={records.length} />
      </div>
      {summary.attendance_star ? (
        <div className="card" style={{ padding: 16, marginBottom: 24, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>Attendance Stars</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{"★".repeat(summary.attendance_star)}<span style={{ color: "rgba(148,163,184,0.4)" }}>{"★".repeat(5 - summary.attendance_star)}</span></div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{summary.present_equivalent}/{workingDays} present-equivalent</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>Punctuality Stars</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{"★".repeat(summary.punctuality_star)}<span style={{ color: "rgba(148,163,184,0.4)" }}>{"★".repeat(5 - summary.punctuality_star)}</span></div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{summary.late} late punches this month</div>
          </div>
        </div>
      ) : null}
      <div className="card">
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Monthly Records — {months[month - 1]} {year}</h2>
        </div>
        {loading ? <Loader /> : records.length === 0 ? <EmptyState icon="📅" title="No records yet" sub="Start punching in to see your records" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Punch In</th><th>Punch Out</th><th>Status</th><th>Notes</th><th>Hours</th></tr></thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    <td>{fmtDate(r.date)}</td>
                    <td>{fmtTime(r.punch_in) || "—"}</td>
                    <td>{fmtTime(r.punch_out) || "—"}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      {r.edited_by_hr
                        ? <span style={{ fontSize: 11, color: "#f59e0b" }}>HR Edit{r.edit_reason ? `: ${r.edit_reason}` : ""}</span>
                        : <span style={{ color: "var(--muted)", fontSize: 11 }}>—</span>}
                    </td>
                    <td>{r.hours_worked ? `${r.hours_worked}h` : "—"}</td>
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
