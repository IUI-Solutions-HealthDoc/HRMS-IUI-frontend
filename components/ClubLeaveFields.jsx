"use client";

import { countWords, WORD_LIMITS } from "@/lib/limits";

export const CLUB_DEFAULTS = { club: false, cl_days: "", pl_days: "" };

export function spanDays(start, end, holidays = []) {
  if (!start || !end || end < start) return 0;
  let count = 0;
  const curr = new Date(start + "T00:00:00");
  const stop = new Date(end + "T00:00:00");
  const holidayDates = new Set(
    (holidays || []).map((h) => (typeof h === "string" ? h : h.date)).filter(Boolean)
  );

  while (curr <= stop) {
    const isSunday = curr.getDay() === 0;
    const mm = String(curr.getMonth() + 1).padStart(2, "0");
    const dd = String(curr.getDate()).padStart(2, "0");
    const yyyy = curr.getFullYear();
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // Fixed Indian national holidays: 26 Jan, 15 Aug, 02 Oct
    const isNationalHoliday = (mm === "01" && dd === "26") || (mm === "08" && dd === "15") || (mm === "10" && dd === "02");
    const isHoliday = isNationalHoliday || holidayDates.has(dateStr);

    if (!isSunday && !isHoliday) {
      count++;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return count;
}

// Validation summary for the club split; `error` is "" when the form may be submitted.
export function clubStatus(form, balance, holidays = []) {
  if (!form.club) return { days: 0, error: "" };
  const days = spanDays(form.start_date, form.end_date, holidays);
  const cl = parseInt(form.cl_days || 0, 10) || 0;
  const pl = parseInt(form.pl_days || 0, 10) || 0;
  const clLeft = balance?.annual_quotas?.casual?.remaining;
  const plLeft = balance?.annual_quotas?.privileged?.remaining;
  let error = "";
  if (!days) error = "Selected date range contains no working days";
  else if (cl < 0 || pl < 0) error = "Days cannot be negative";
  else if (cl + pl !== days) error = `CL + PL must equal ${days} working day(s)`;
  else if (clLeft != null && cl > clLeft) error = `Only ${clLeft} CL available`;
  else if (plLeft != null && pl > plLeft) error = `Only ${plLeft} PL available`;
  return { days, cl, pl, error };
}

export function WordCounter({ value, limit }) {
  const n = countWords(value);
  return (
    <div style={{ fontSize: 11, marginTop: 4, textAlign: "right", color: n > limit ? "#ef4444" : "var(--muted)" }}>
      {n} / {limit} words
    </div>
  );
}

export default function ClubLeaveFields({ form, setForm, balance, holidays = [] }) {
  const st = clubStatus(form, balance, holidays);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  return (
    <div className="form-group">
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
        <input type="checkbox" checked={!!form.club} onChange={(e) => set({ club: e.target.checked })} />
        Club leaves (Casual + Privileged)
      </label>
      {form.club && (
        <div style={{ marginTop: 8 }}>
          <div className="form-row">
            <div className="form-group">
              <label className="label">CL days{balance?.annual_quotas?.casual ? ` (${balance.annual_quotas.casual.remaining} left)` : ""}</label>
              <input className="input" type="number" min="0" value={form.cl_days} onChange={(e) => set({ cl_days: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">PL days{balance?.annual_quotas?.privileged ? ` (${balance.annual_quotas.privileged.remaining} left)` : ""}</label>
              <input className="input" type="number" min="0" value={form.pl_days} onChange={(e) => set({ pl_days: e.target.value })} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: st.error ? "#ef4444" : "#10b981" }}>
            {st.error || `Total ${st.days} days: ${st.cl} CL + ${st.pl} PL`}
          </div>
        </div>
      )}
    </div>
  );
}

export { WORD_LIMITS };
