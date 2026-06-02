"use client";

import { useState, useRef, useEffect } from "react";
import { ghostFetch } from "@/lib/ghost-api";

function normalizeTimeValue(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  const match = trimmed.match(/^(\d{2}:\d{2}:\d{2})$/) || trimmed.match(/^(\d{2}:\d{2})$/);
  if (match) {
    return match[1].split(':').length === 2 ? `${match[1]}:00` : match[1];
  }
  return "";
}

function formatTimeDraft(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`;
}

function isValidTimeValue(value) {
  if (!/^\d{2}:\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59;
}

function TimeEditCell({ value, onSave, onCancel }) {
  const [time, setTime] = useState(normalizeTimeValue(value));
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        ref={inputRef}
        type="text"
        value={time}
        onChange={(e) => setTime(formatTimeDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && isValidTimeValue(time)) {
            onSave(normalizeTimeValue(time));
          }
          if (e.key === "Escape") {
            onCancel();
          }
        }}
        inputMode="numeric"
        placeholder="HH:MM:SS"
        maxLength={8}
        autoComplete="off"
        className="ghost-time-input"
        style={{
          background: "var(--surface3)",
          border: "1px solid rgba(0,200,150,0.35)",
          borderRadius: 6,
          color: "var(--text)",
          padding: "4px 8px",
          fontSize: 13,
          outline: "none",
          boxShadow: "0 0 8px rgba(0,200,150,0.15)",
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          width: 108,
        }}
      />
      {/* Save — checkmark, green */}
      <button
        onClick={() => onSave(normalizeTimeValue(time))}
        disabled={!isValidTimeValue(time)}
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          border: "none",
          background: isValidTimeValue(time) ? "rgba(16,185,129,0.12)" : "rgba(148,163,184,0.12)",
          color: isValidTimeValue(time) ? "#10B981" : "rgba(148,163,184,0.6)",
          cursor: isValidTimeValue(time) ? "pointer" : "not-allowed",
          fontSize: 12,
          fontWeight: 600,
          transition: "all 0.15s",
          opacity: isValidTimeValue(time) ? 1 : 0.75,
        }}
        onMouseEnter={(e) => {
          if (isValidTimeValue(time)) {
            e.currentTarget.style.background = "rgba(16,185,129,0.25)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isValidTimeValue(time) ? "rgba(16,185,129,0.12)" : "rgba(148,163,184,0.12)";
        }}
      >
        ✓
      </button>
      {/* Cancel — X, muted */}
      <button
        onClick={onCancel}
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          border: "none",
          background: "transparent",
          color: "var(--muted)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(71,85,105,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        ✕
      </button>
    </div>
  );
}

function GhostToast({ visible, message, tone = "info" }) {
  if (!visible) return null;
  const palette = {
    info: {
      background: "rgba(8,11,16,0.92)",
      border: "1px solid rgba(0,200,150,0.25)",
      text: "rgba(148,163,184,0.8)",
      glyph: "rgba(0,200,150,0.6)",
    },
    error: {
      background: "rgba(33,12,17,0.94)",
      border: "1px solid rgba(239,68,68,0.28)",
      text: "rgba(254,202,202,0.92)",
      glyph: "rgba(248,113,113,0.82)",
    },
  };
  const colors = palette[tone] || palette.info;
  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 9999,
      padding: "10px 16px",
      borderRadius: "var(--radius)",
      background: colors.background,
      border: colors.border,
      backdropFilter: "blur(16px)",
      boxShadow: "0 0 20px rgba(0,200,150,0.1)",
      display: "flex",
      alignItems: "center",
      gap: 8,
      animation: "slideUp 0.2s cubic-bezier(0.16,1,0.3,1)",
      fontSize: 12,
      color: colors.text,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      letterSpacing: "0.04em",
    }}>
      <span style={{ color: colors.glyph, fontSize: 12 }}>◈</span>
      {message}
    </div>
  );
}

export default function GhostAttendancePage() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingCell, setEditingCell] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastTone, setToastTone] = useState("info");
  const toastTimerRef = useRef(null);

  const showToast = (message, tone = "info") => {
    setToastMessage(message);
    setToastTone(tone);
    setToastVisible(true);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 2200);
  };

  // Fetch attendance data from backend on mount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchAttendanceData(true);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [employeeQuery, startDate, endDate]);

  async function fetchAttendanceData(isSilent = false) {
    try {
      if (!isSilent) {
        setLoading(true);
      }
      setError(null);
      const params = new URLSearchParams();
      const trimmed = employeeQuery.trim();
      if (trimmed) params.set("employee_query", trimmed);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const query = params.toString();
      const data = await ghostFetch(`/attendance${query ? `?${query}` : ""}`);
      setAttendanceData(data);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveTime = async (recordId, field, newTime) => {
    const normalizedTime = normalizeTimeValue(newTime);
    if (!normalizedTime) {
      showToast("ENTER TIME IN HH:MM FORMAT", "error");
      return;
    }

    try {
      const payload = await ghostFetch("/attendance/silent-edit", {
        method: "PATCH",
        body: JSON.stringify({
          record_id: recordId,
          field,
          new_value: normalizedTime,
        }),
      });

      setAttendanceData((prev) =>
        prev.map((row) =>
          row.id === recordId ? { ...row, [field]: payload?.new_value || normalizedTime } : row
        )
      );

      setEditingCell(null);
      showToast("TIME CORRECTED · NO TRACE");
    } catch (error) {
      console.error("Save error:", error);
      showToast(error.message || "UPDATE FAILED", "error");
    }
  };

  const formatTime = (time) => {
    return normalizeTimeValue(time) || "--:--:--";
  };

  const getStatusBadge = (status) => {
    const colors = {
      "on-time": { bg: "rgba(16,185,129,0.12)", color: "#10B981" },
      "present": { bg: "rgba(16,185,129,0.12)", color: "#10B981" },
      "late": { bg: "rgba(239,68,68,0.12)", color: "#EF4444" },
      "absent": { bg: "rgba(156,163,175,0.12)", color: "#9CA3AF" },
    };
    const style = colors[status] || colors["present"];
    return (
      <span
        style={{
          padding: "4px 10px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          background: style.bg,
          color: style.color,
        }}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "var(--text-2)" }}>
        <div style={{ marginBottom: 16, opacity: 0.5 }}>◈</div>
        <p>Loading attendance records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 16,
        borderRadius: 12,
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.25)",
        color: "rgba(239,68,68,0.8)",
        fontSize: 13,
      }}>
        ✕ Error: {error}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          color: "var(--text)",
          marginBottom: 8,
        }}>
          Silent Attendance Editor
        </h1>
        <p style={{
          color: "var(--text-2)",
          fontSize: 14,
          lineHeight: 1.6,
        }}>
          Hover over any time entry and click the edit icon to modify. Changes overwrite the original record with zero audit trail.
        </p>
      </div>

      {/* Instructions */}
      <div style={{
        padding: 16,
        borderRadius: 12,
        background: "rgba(0,200,150,0.06)",
        border: "1px solid rgba(0,200,150,0.15)",
        marginBottom: 24,
        fontSize: 13,
        color: "var(--text-2)",
        lineHeight: 1.6,
      }}>
        <strong style={{ color: "var(--text)" }}>How to use:</strong> Hover over a time cell → Click the pencil icon → Select new time → Press ✓ to save (or ✕ to cancel). The system will write the new time directly with no audit log entry, edit history, or &quot;edited_by&quot; field.
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
        marginBottom: 18,
      }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Search Employee
          </span>
          <input
            type="text"
            value={employeeQuery}
            onChange={(e) => setEmployeeQuery(e.target.value)}
            placeholder="Name or Employee ID"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              outline: "none",
              fontSize: 13,
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            From Date
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              outline: "none",
              fontSize: 13,
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            To Date
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              outline: "none",
              fontSize: 13,
            }}
          />
        </label>
      </div>

      {/* Record Count */}
      <div style={{
        marginBottom: 16,
        fontSize: 13,
        color: "var(--text-2)",
      }}>
        Showing {attendanceData.length} attendance records
      </div>

      {/* Attendance Table */}
      <div style={{
        borderRadius: 12,
        border: "1px solid var(--border)",
        overflow: "hidden",
        background: "var(--surface3)",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ghost-table" style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}>
            <thead>
              <tr style={{
                borderBottom: "1px solid var(--border)",
                background: "var(--surface)",
              }}>
                <th style={{
                  padding: 14,
                  textAlign: "left",
                  fontWeight: 700,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  letterSpacing: "0.05em",
                }}>
                  Employee
                </th>
                <th style={{
                  padding: 14,
                  textAlign: "left",
                  fontWeight: 700,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  letterSpacing: "0.05em",
                }}>
                  Date
                </th>
                <th style={{
                  padding: 14,
                  textAlign: "center",
                  fontWeight: 700,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  letterSpacing: "0.05em",
                }}>
                  Check In
                </th>
                <th style={{
                  padding: 14,
                  textAlign: "center",
                  fontWeight: 700,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  letterSpacing: "0.05em",
                }}>
                  Check Out
                </th>
                <th style={{
                  padding: 14,
                  textAlign: "center",
                  fontWeight: 700,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  letterSpacing: "0.05em",
                }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((row, idx) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: idx < attendanceData.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0,200,150,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td style={{ padding: 14 }}>
                    <div style={{ color: "var(--text)", fontWeight: 600 }}>{row.employee_name || "Unknown"}</div>
                  </td>
                  <td style={{ padding: 14 }}>
                    <div style={{ color: "var(--text-2)" }}>{row.date}</div>
                  </td>
                  <td style={{ padding: 14, textAlign: "center" }}>
                    {editingCell === `${row.id}-check_in` ? (
                      <TimeEditCell
                        value={row.check_in || ""}
                        onSave={(newTime) => handleSaveTime(row.id, "check_in", newTime)}
                        onCancel={() => setEditingCell(null)}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          cursor: "pointer",
                        }}
                        onClick={() => setEditingCell(`${row.id}-check_in`)}
                      >
                        <span style={{ color: "var(--text)", fontWeight: 600 }}>
                          {formatTime(row.check_in)}
                        </span>
                        <span
                          className="ghost-edit-trigger"
                          style={{
                            opacity: 0,
                            transition: "opacity 0.15s",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 22,
                            height: 22,
                            borderRadius: 5,
                            background: "rgba(0,200,150,0.08)",
                            border: "1px solid rgba(0,200,150,0.15)",
                            color: "rgba(0,200,150,0.55)",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          ✎
                        </span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 14, textAlign: "center" }}>
                    {editingCell === `${row.id}-check_out` ? (
                      <TimeEditCell
                        value={row.check_out || ""}
                        onSave={(newTime) => handleSaveTime(row.id, "check_out", newTime)}
                        onCancel={() => setEditingCell(null)}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          cursor: "pointer",
                        }}
                        onClick={() => setEditingCell(`${row.id}-check_out`)}
                      >
                        <span style={{ color: "var(--text)", fontWeight: 600 }}>
                          {formatTime(row.check_out)}
                        </span>
                        <span
                          className="ghost-edit-trigger"
                          style={{
                            opacity: 0,
                            transition: "opacity 0.15s",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 22,
                            height: 22,
                            borderRadius: 5,
                            background: "rgba(0,200,150,0.08)",
                            border: "1px solid rgba(0,200,150,0.15)",
                            color: "rgba(0,200,150,0.55)",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          ✎
                        </span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 14, textAlign: "center" }}>
                    {getStatusBadge(row.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {attendanceData.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--text-2)",
          borderRadius: 12,
          border: "1px dashed var(--border)",
          marginTop: 20,
        }}>
          No attendance records found
        </div>
      )}

      {/* Ghost Toast */}
      <GhostToast visible={toastVisible} message={toastMessage} tone={toastTone} />
    </div>
  );
}
