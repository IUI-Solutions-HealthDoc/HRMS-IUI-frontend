"use client";

import { countWords, WORD_LIMITS } from "@/lib/limits";

export const CLUB_DEFAULTS = { club: false, cl_days: "", pl_days: "" };

function spanDays(start, end) {
  if (!start || !end || end < start) return 0;
  return Math.round((new Date(end + "T00:00:00") - new Date(start + "T00:00:00")) / 86400000) + 1;
}

// Validation summary for the club split; `error` is "" when the form may be submitted.
export function clubStatus(form, balance) {
  if (!form.club) return { days: 0, error: "" };
  const days = spanDays(form.start_date, form.end_date);
  const cl = parseInt(form.cl_days || 0, 10) || 0;
  const pl = parseInt(form.pl_days || 0, 10) || 0;
  const clLeft = balance?.annual_quotas?.casual?.remaining;
  const plLeft = balance?.annual_quotas?.privileged?.remaining;
  let error = "";
  if (!days) error = "Select the dates first";
  else if (cl < 0 || pl < 0) error = "Days cannot be negative";
  else if (cl + pl !== days) error = `CL + PL must equal ${days} day(s)`;
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

export default function ClubLeaveFields({ form, setForm, balance }) {
  const st = clubStatus(form, balance);
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
