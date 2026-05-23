"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import Loader from "@/components/ui/Loader";

function fmtDateTime(value) {
  if (!value) return "Not updated yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not updated yet";
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AttendanceSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [savingCollector, setSavingCollector] = useState(false);
  const [showToast, toastNode] = useToast();

  useEffect(() => {
    apiFetch("/attendance/settings")
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveRules() {
    if (!settings) return;
    setSavingRules(true);
    try {
      const payload = {
        shift_start: settings.shift_start,
        late_after: settings.late_after,
        half_day_in_after: settings.half_day_in_after,
        absent_in_after: settings.absent_in_after,
        early_leave_before: settings.early_leave_before,
        half_day_out_before: settings.half_day_out_before,
        absent_out_before: settings.absent_out_before,
        shift_end: settings.shift_end,
        lunch_start: settings.lunch_start,
        lunch_end: settings.lunch_end,
        lates_per_half_day_deduction: settings.lates_per_half_day_deduction,
        early_leaves_per_half_day: settings.early_leaves_per_half_day,
        allow_web_punch: settings.allow_web_punch,
      };
      await apiFetch("/attendance/settings", { method: "PUT", body: JSON.stringify(payload) });
      const fresh = await apiFetch("/attendance/settings");
      setSettings(fresh);
      showToast("Attendance rules updated");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSavingRules(false);
    }
  }

  async function saveCollector() {
    if (!settings) return;
    setSavingCollector(true);
    try {
      await apiFetch("/attendance/settings", {
        method: "PUT",
        body: JSON.stringify({ log_collector_enabled: !!settings.log_collector_enabled }),
      });
      const fresh = await apiFetch("/attendance/settings");
      setSettings(fresh);
      showToast(`Log collector ${fresh.log_collector_enabled ? "enabled" : "disabled"}`);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSavingCollector(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-header">
        <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Attendance Rules</h1>
        <p style={{ color: "var(--muted)", marginTop: 4 }}>Control shift timings and machine-log collection from one place.</p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ maxWidth: 680 }}>
            <div className="syne" style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Log Collector</div>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Attendance device pushes are written into HRMS only when this collector is enabled. Device heartbeat and biometric sync continue even while log collection is off.
            </p>
          </div>
          <div style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: `1px solid ${settings?.log_collector_enabled ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)"}`,
            background: settings?.log_collector_enabled ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            color: settings?.log_collector_enabled ? "#10b981" : "#ef4444",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>
            {settings?.log_collector_enabled ? "Collector On" : "Collector Off"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 14, marginTop: 18 }}>
          <div style={{ padding: "14px 16px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--hover-bg)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Last changed</div>
            <div style={{ fontWeight: 700 }}>{fmtDateTime(settings?.log_collector_enabled_at)}</div>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--hover-bg)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Changed by</div>
            <div style={{ fontWeight: 700 }}>{settings?.log_collector_enabled_by_name || "Not recorded yet"}</div>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--hover-bg)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Behavior while off</div>
            <div style={{ fontWeight: 700 }}>ATTLOG pushes are ignored</div>
          </div>
        </div>

        <div style={{
          marginTop: 18,
          padding: "14px 16px",
          borderRadius: 14,
          border: "1px solid rgba(245,158,11,0.18)",
          background: "rgba(245,158,11,0.08)",
          color: "#f59e0b",
          fontSize: 13,
          lineHeight: 1.55,
        }}>
          Keep this off when you do not want attendance imports. Machine logs sent during that period are not stored in HRMS.
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginTop: 20, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!settings?.log_collector_enabled}
              onChange={(e) => setSettings((current) => ({ ...current, log_collector_enabled: e.target.checked }))}
            />
            Collect machine attendance logs
          </label>
          <button className="btn-primary" onClick={saveCollector} disabled={savingCollector}>
            {savingCollector ? "Saving..." : "Save Collector"}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <div className="syne" style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Attendance Rule Engine</div>
            <p style={{ color: "var(--muted)", margin: 0 }}>Edit shift timings and deduction thresholds without redeploying code.</p>
          </div>
        </div>

        <div className="form-row">
          {["shift_start", "late_after", "half_day_in_after", "absent_in_after", "early_leave_before", "half_day_out_before", "absent_out_before", "shift_end", "lunch_start", "lunch_end"].map((field) => (
            <div className="form-group" key={field}>
              <label className="label">{field.replace(/_/g, " ")}</label>
              <input
                className="input"
                value={settings?.[field] || ""}
                onChange={(e) => setSettings((item) => ({ ...item, [field]: e.target.value }))}
              />
            </div>
          ))}
          <div className="form-group">
            <label className="label">Lates Per Half-Day Deduction</label>
            <input
              className="input"
              type="number"
              value={settings?.lates_per_half_day_deduction || 0}
              onChange={(e) => setSettings((item) => ({ ...item, lates_per_half_day_deduction: +e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="label">Early Leaves Per Half-Day</label>
            <input
              className="input"
              type="number"
              value={settings?.early_leaves_per_half_day || 0}
              onChange={(e) => setSettings((item) => ({ ...item, early_leaves_per_half_day: +e.target.value }))}
            />
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <input
            type="checkbox"
            checked={settings?.allow_web_punch || false}
            onChange={(e) => setSettings((item) => ({ ...item, allow_web_punch: e.target.checked }))}
          />
          Allow web punch
        </label>

        <button className="btn-primary" onClick={saveRules} disabled={savingRules}>
          {savingRules ? "Saving..." : "Save Rules"}
        </button>
      </div>

      {toastNode}
    </div>
  );
}
