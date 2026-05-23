"use client";

import { useState, useEffect } from "react";
import { ghostFetch } from "@/lib/ghost-api";

export default function GhostLeavePage() {
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaveData();
  }, []);

  async function fetchLeaveData() {
    try {
      setLoading(true);
      setError(null);
      const data = await ghostFetch("/leave");
      setLeaveData(data);
    } catch (err) {
      console.error("Error fetching leave data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      "approved": { bg: "rgba(16,185,129,0.12)", color: "#10B981" },
      "pending": { bg: "rgba(59,130,246,0.12)", color: "#3B82F6" },
      "rejected": { bg: "rgba(239,68,68,0.12)", color: "#EF4444" },
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "var(--text-2)" }}>
        <div style={{ marginBottom: 16, opacity: 0.5 }}>◈</div>
        <p>Loading leave applications...</p>
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
          Leave Applications
        </h1>
        <p style={{
          color: "var(--text-2)",
          fontSize: 14,
          lineHeight: 1.6,
        }}>
          View-only access to all leave applications and approvals. No actions available.
        </p>
      </div>

      {/* Record Count */}
      <div style={{
        marginBottom: 16,
        fontSize: 13,
        color: "var(--text-2)",
      }}>
        Showing {leaveData.length} leave applications
      </div>

      {/* Leave Table */}
      <div style={{
        borderRadius: 12,
        border: "1px solid var(--border)",
        overflow: "hidden",
        background: "var(--surface3)",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{
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
                  Type
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
                  Days
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
                  From - To
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
              {leaveData.map((row, idx) => {
                const statusStyle = getStatusColor(row.status);
                
                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: idx < leaveData.length - 1 ? "1px solid var(--border)" : "none",
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
                      <div style={{ color: "var(--text)", fontWeight: 600 }}>
                        {row.employee || "Unknown"}
                      </div>
                    </td>
                    <td style={{ padding: 14 }}>
                      <div style={{ color: "var(--text-2)" }}>
                        {row.type || "N/A"}
                      </div>
                    </td>
                    <td style={{ padding: 14, textAlign: "center" }}>
                      <div style={{ color: "var(--text)" }}>{row.days ?? 0}</div>
                    </td>
                    <td style={{ padding: 14 }}>
                      <div style={{ color: "var(--text-2)", fontSize: 12 }}>
                        {row.from} → {row.to}
                      </div>
                    </td>
                    <td style={{ padding: 14, textAlign: "center" }}>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: statusStyle.bg,
                        color: statusStyle.color,
                      }}>
                        {row.status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {leaveData.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--text-2)",
          borderRadius: 12,
          border: "1px dashed var(--border)",
          marginTop: 20,
        }}>
          No leave applications found
        </div>
      )}
    </div>
  );
}
