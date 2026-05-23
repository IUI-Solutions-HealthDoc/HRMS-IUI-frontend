"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Users, FileText, Calendar } from "lucide-react";
import Loader from "@/components/ui/Loader";
import { ghostFetch } from "@/lib/ghost-api";

export default function GhostDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      try {
        setLoading(true);
        setError("");
        const data = await ghostFetch("/dashboard");
        if (active) setSummary(data);
      } catch (err) {
        if (active) setError(err.message || "Failed to load dashboard summary");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSummary();
    return () => {
      active = false;
    };
  }, []);

  const monthLabel = useMemo(() => {
    if (!summary?.month || !summary?.year) return "current month";
    return new Date(summary.year, summary.month - 1, 1).toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, [summary]);

  const stats = [
    { label: "Total Employees", value: summary?.total_employees ?? 0, icon: <Users size={20} /> },
    { label: "Attendance Records", value: summary?.attendance_records ?? 0, icon: <FileText size={20} /> },
    { label: "Payroll Records", value: summary?.payroll_records ?? 0, icon: <BarChart3 size={20} /> },
    { label: "Pending Leaves", value: summary?.pending_leaves ?? 0, icon: <Calendar size={20} /> },
  ];

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
          Ghost Admin Overview
        </h1>
        <p style={{
          color: "var(--text-2)",
          fontSize: 14,
          lineHeight: 1.6,
        }}>
          Live backend summary for {monthLabel}. All viewing and editing happens with zero trace in normal audit logs.
        </p>
      </div>

      {/* Quick Stats Grid */}
      {loading ? (
        <div style={{ marginBottom: 32 }}>
          <Loader />
        </div>
      ) : error ? (
        <div
          style={{
            marginBottom: 32,
            padding: 16,
            borderRadius: 12,
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "rgba(239,68,68,0.85)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}>
          {stats.map((stat, idx) => (
            <div
              key={idx}
              style={{
                padding: 20,
                borderRadius: 12,
                background: "var(--surface3)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                transition: "all 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,200,150,0.25)";
                e.currentTarget.style.background = "rgba(0,200,150,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--surface3)";
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "rgba(0,200,150,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(0,168,126,0.8)",
                flexShrink: 0,
              }}>
                {stat.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 12,
                  color: "var(--text-2)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  marginBottom: 4,
                }}>
                  {stat.label}
                </div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "var(--text)",
                }}>
                  {Number(stat.value || 0).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Boxes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {/* What Ghost Can Do */}
        <div style={{
          padding: 20,
          borderRadius: 12,
          background: "rgba(16,185,129,0.06)",
          border: "1px solid rgba(16,185,129,0.18)",
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#10B981",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            ✓ Ghost Capabilities
          </h3>
          <ul style={{
            fontSize: 13,
            color: "var(--text-2)",
            lineHeight: 1.8,
            margin: 0,
            paddingLeft: 0,
          }}>
            <li style={{ marginBottom: 8 }}>• View all employee records & profiles</li>
            <li style={{ marginBottom: 8 }}>• Access complete attendance logs</li>
            <li style={{ marginBottom: 8 }}>• View payroll & financial records</li>
            <li style={{ marginBottom: 8 }}>• Silent edit attendance times (no trace)</li>
            <li style={{ marginBottom: 8 }}>• View leave & grievance records</li>
          </ul>
        </div>

        {/* Restrictions */}
        <div style={{
          padding: 20,
          borderRadius: 12,
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.18)",
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#EF4444",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            ✕ Restricted Actions
          </h3>
          <ul style={{
            fontSize: 13,
            color: "var(--text-2)",
            lineHeight: 1.8,
            margin: 0,
            paddingLeft: 0,
          }}>
            <li style={{ marginBottom: 8 }}>• Create or delete employees</li>
            <li style={{ marginBottom: 8 }}>• Approve/reject leaves</li>
            <li style={{ marginBottom: 8 }}>• Edit payroll values</li>
            <li style={{ marginBottom: 8 }}>• Appear in session logs</li>
            <li style={{ marginBottom: 8 }}>• Generate audit trail entries</li>
          </ul>
        </div>

        {/* Session Info */}
        <div style={{
          padding: 20,
          borderRadius: 12,
          background: "rgba(0,200,150,0.06)",
          border: "1px solid rgba(0,200,150,0.18)",
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(0,168,126,0.9)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            ◈ Session Security
          </h3>
          <ul style={{
            fontSize: 13,
            color: "var(--text-2)",
            lineHeight: 1.8,
            margin: 0,
            paddingLeft: 0,
          }}>
            <li style={{ marginBottom: 8 }}>• Session expires after 8 hours</li>
            <li style={{ marginBottom: 8 }}>• HttpOnly cookie - JS cannot access</li>
            <li style={{ marginBottom: 8 }}>• No login events recorded</li>
            <li style={{ marginBottom: 8 }}>• No logout events recorded</li>
            <li style={{ marginBottom: 8 }}>• Zero appearance in HR logs</li>
          </ul>
        </div>
      </div>

      {/* Feature Highlight */}
      <div style={{
        marginTop: 32,
        padding: 24,
        borderRadius: 12,
        background: "linear-gradient(135deg, rgba(0,200,150,0.12) 0%, rgba(59,130,246,0.06) 100%)",
        border: "1px solid rgba(0,200,150,0.18)",
      }}>
        <h3 style={{
          fontSize: 16,
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: 12,
        }}>
          Key Feature: Silent Attendance Editor
        </h3>
        <p style={{
          color: "var(--text-2)",
          fontSize: 13,
          lineHeight: 1.8,
          margin: 0,
        }}>
          Navigate to the <strong>Attendance</strong> section to access the core ghost admin feature. Hover over any time entry to reveal the edit icon. Click to modify check-in or check-out times. Changes are written directly to the database with zero audit trail — no &quot;edited_by&quot;, no &quot;original_time&quot;, no edit history. The record simply reflects the new time as if it always was.
        </p>
      </div>
    </div>
  );
}
