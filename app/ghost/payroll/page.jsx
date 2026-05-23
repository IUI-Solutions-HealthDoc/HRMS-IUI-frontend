"use client";

import { useState, useEffect } from "react";
import { ghostFetch } from "@/lib/ghost-api";

export default function GhostPayrollPage() {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPayrollData();
  }, []);

  async function fetchPayrollData() {
    try {
      setLoading(true);
      setError(null);
      const data = await ghostFetch("/payroll");
      setPayrollData(data);
    } catch (err) {
      console.error("Error fetching payroll:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status) => {
    return status === "paid"
      ? { bg: "rgba(16,185,129,0.12)", color: "#10B981" }
      : { bg: "rgba(59,130,246,0.12)", color: "#3B82F6" };
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "var(--text-2)" }}>
        <div style={{ marginBottom: 16, opacity: 0.5 }}>◈</div>
        <p>Loading payroll records...</p>
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
          Payroll Records
        </h1>
        <p style={{
          color: "var(--text-2)",
          fontSize: 14,
          lineHeight: 1.6,
        }}>
          View-only access to all payroll and financial records. No modifications permitted.
        </p>
      </div>

      {/* Record Count */}
      <div style={{
        marginBottom: 16,
        fontSize: 13,
        color: "var(--text-2)",
      }}>
        Showing {payrollData.length} payroll records
      </div>

      {/* Payroll Table */}
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
                  Month
                </th>
                <th style={{
                  padding: 14,
                  textAlign: "right",
                  fontWeight: 700,
                  color: "var(--text-2)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  letterSpacing: "0.05em",
                }}>
                  Amount
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
              {payrollData.map((row, idx) => {
                const statusStyle = getStatusColor(row.status || "pending");
                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: idx < payrollData.length - 1 ? "1px solid var(--border)" : "none",
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
                        {row.month || "N/A"}
                      </div>
                    </td>
                    <td style={{ padding: 14, textAlign: "right" }}>
                      <div style={{ color: "var(--text)", fontWeight: 600 }}>
                        ₹{Number(row.amount || 0).toLocaleString()}
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
                        {(row.status || "pending").toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {payrollData.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--text-2)",
          borderRadius: 12,
          border: "1px dashed var(--border)",
          marginTop: 20,
        }}>
          No payroll records found
        </div>
      )}
    </div>
  );
}
