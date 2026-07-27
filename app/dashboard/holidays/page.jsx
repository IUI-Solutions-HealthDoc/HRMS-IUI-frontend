"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/formatters";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";

export default function HolidaysPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: "", name: "" });
  const [showToast, toastNode] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/attendance/holidays?year=${year}`);
      setHolidays(data.holidays || []);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, year]);

  useEffect(() => {
    load();
  }, [load]);

  async function addHoliday() {
    if (!form.date) {
      showToast("Please select a date", "error");
      return;
    }
    if (!form.name.trim()) {
      showToast("Please enter a holiday name", "error");
      return;
    }
    const holidayYear = new Date(form.date).getFullYear();
    const currentYear = new Date().getFullYear();
    if (holidayYear < currentYear) {
      showToast("Cannot add holidays for previous years", "error");
      return;
    }
    if (holidays.some((h) => h.date === form.date || (h.name || "").toLowerCase().trim() === form.name.toLowerCase().trim())) {
      showToast("A holiday with this date or name already exists in the calendar", "error");
      return;
    }
    try {
      await apiFetch("/attendance/holidays", { method: "POST", body: JSON.stringify(form) });
      showToast("Holiday added successfully!");
      setForm({ date: "", name: "" });
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function deleteHoliday(id) {
    try {
      await apiFetch(`/attendance/holidays/${id}`, { method: "DELETE" });
      showToast("Holiday removed");
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Holiday Calendar</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>{isAdmin ? "Manage the yearly holiday calendar." : "View the company holiday calendar for the selected year."}</p>
        </div>
        <select className="input" style={{ width: "auto" }} value={year} onChange={(e) => setYear(+e.target.value)}>
          {[2024, 2025, 2026, 2027].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {isAdmin ? (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div className="form-row">
            <div className="form-group"><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Holiday Name</label><input className="input" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} /></div>
            <div className="form-group" style={{ alignSelf: "end" }}><button className="btn-primary" onClick={addHoliday} disabled={!form.date || !form.name.trim()}>Add Holiday</button></div>
          </div>
        </div>
      ) : null}

      <div className="card">
        {loading ? <Loader /> : holidays.length === 0 ? (
          <EmptyState icon="🎉" title="No holidays found" subtitle="No holidays are configured for this year yet." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Name</th><th>Action</th></tr></thead>
              <tbody>
                {holidays.map((holiday) => (
                  <tr key={holiday.id}>
                    <td>{fmtDate(holiday.date)}</td>
                    <td>{holiday.name}</td>
                    <td>{isAdmin ? <button className="btn-danger" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => deleteHoliday(holiday.id)}>Delete</button> : "View only"}</td>
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
