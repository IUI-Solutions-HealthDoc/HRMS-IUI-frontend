"use client";

import { useState, useEffect, useMemo } from "react";
import { ghostFetch } from "@/lib/ghost-api";
import { Search, Calendar, AlertCircle, ShieldAlert, CheckCircle2, Clock, XCircle } from "lucide-react";

export default function GhostLeavePage() {
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchLeaveData();
  }, []);

  async function fetchLeaveData() {
    try {
      setLoading(true);
      setError(null);
      const data = await ghostFetch("/leave");
      setLeaveData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching leave data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") {
      return { bg: "rgba(16,185,129,0.12)", color: "#10B981", border: "rgba(16,185,129,0.25)", icon: CheckCircle2 };
    }
    if (s === "rejected") {
      return { bg: "rgba(239,68,68,0.12)", color: "#EF4444", border: "rgba(239,68,68,0.25)", icon: XCircle };
    }
    return { bg: "rgba(124,58,237,0.12)", color: "#A78BFA", border: "rgba(124,58,237,0.25)", icon: Clock };
  };

  const filteredData = useMemo(() => {
    return leaveData.filter((row) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (row.employee && row.employee.toLowerCase().includes(q)) ||
        (row.type && row.type.toLowerCase().includes(q)) ||
        (row.reason && row.reason.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === "all" ||
        (row.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [leaveData, search, statusFilter]);

  const stats = useMemo(() => {
    const total = leaveData.length;
    const approved = leaveData.filter((l) => (l.status || "").toLowerCase() === "approved").length;
    const pending = leaveData.filter((l) => (l.status || "").toLowerCase() === "pending").length;
    const totalDays = leaveData.reduce((acc, curr) => acc + (Number(curr.days) || 0), 0);
    return { total, approved, pending, totalDays };
  }, [leaveData]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-2)" }}>
        <div style={{
          width: 32,
          height: 32,
          border: "2px solid rgba(124,58,237,0.2)",
          borderTopColor: "#7C3AED",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 16px",
        }} />
        <p style={{ fontSize: 13, color: "var(--text-2)" }}>Querying leave audit records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: "16px 20px",
        borderRadius: 12,
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.25)",
        color: "#EF4444",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <AlertCircle size={18} />
        <span>Failed to load leave records: {error}</span>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "100%" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 20,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{
              fontSize: "clamp(18px, 3.5vw, 24px)",
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.01em",
              margin: 0,
            }}>
              Leave Applications Audit
            </h1>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              background: "rgba(124,58,237,0.12)",
              color: "#A78BFA",
              border: "1px solid rgba(124,58,237,0.3)",
            }}>
              <ShieldAlert size={11} /> READ-ONLY SURVEILLANCE
            </span>
          </div>
          <p style={{
            color: "var(--text-2)",
            fontSize: 12.5,
            lineHeight: 1.5,
            margin: 0,
          }}>
            Inspect leave records, quota claims, approval channels, and historical employee absences across IUI Solutions.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        marginBottom: 20,
      }}>
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "12px 16px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Total Applications
          </div>
          <div style={{ fontSize: "clamp(18px, 2.5vw, 22px)", fontWeight: 800, color: "var(--text)" }}>
            {stats.total}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>
            Historical leave filings
          </div>
        </div>

        <div style={{
          background: "rgba(16,185,129,0.05)",
          border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: 12,
          padding: "12px 16px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Approved
          </div>
          <div style={{ fontSize: "clamp(18px, 2.5vw, 22px)", fontWeight: 800, color: "#10B981" }}>
            {stats.approved}
          </div>
          <div style={{ fontSize: 11, color: "rgba(16,185,129,0.8)", marginTop: 4 }}>
            Cleared by management
          </div>
        </div>

        <div style={{
          background: "rgba(124,58,237,0.05)",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: 12,
          padding: "12px 16px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Pending Review
          </div>
          <div style={{ fontSize: "clamp(18px, 2.5vw, 22px)", fontWeight: 800, color: "#A78BFA" }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: 11, color: "rgba(124,58,237,0.8)", marginTop: 4 }}>
            Awaiting decision
          </div>
        </div>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "12px 16px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Total Days Claimed
          </div>
          <div style={{ fontSize: "clamp(18px, 2.5vw, 22px)", fontWeight: 800, color: "var(--text)" }}>
            {stats.totalDays}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>
            Cumulative days off
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
      }}>
        {/* Search */}
        <div style={{
          position: "relative",
          flex: "1 1 240px",
          minWidth: 180,
          maxWidth: "100%",
        }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-2)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search employee or leave type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              color: "var(--text)",
              fontSize: 12.5,
              outline: "none",
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", "approved", "pending", "rejected"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                background: statusFilter === st ? "rgba(124,58,237,0.18)" : "var(--surface)",
                color: statusFilter === st ? "#A78BFA" : "var(--text-2)",
                border: statusFilter === st ? "1px solid rgba(124,58,237,0.4)" : "1px solid var(--border)",
                textTransform: "capitalize",
                transition: "all 0.15s ease",
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Counter */}
      <div style={{
        marginBottom: 12,
        fontSize: 12,
        color: "var(--text-2)",
      }}>
        Showing {filteredData.length} leave applications
      </div>

      {/* Leave Table */}
      <div className="ghost-table-wrap">
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12.5,
          minWidth: 620,
        }}>
          <thead>
            <tr style={{
              borderBottom: "1px solid var(--border)",
              background: "var(--surface)",
            }}>
              <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.08em" }}>
                Employee
              </th>
              <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.08em" }}>
                Type
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.08em" }}>
                Days
              </th>
              <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.08em" }}>
                Duration
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.08em" }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => {
              const badge = getStatusColor(row.status);
              const Icon = badge.icon;
              return (
                <tr
                  key={row.id || idx}
                  style={{
                    borderBottom: idx < filteredData.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(124,58,237,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ color: "var(--text)", fontWeight: 600 }}>
                      {row.employee || "Unknown"}
                    </div>
                    {row.reason && (
                      <div style={{ color: "var(--text-2)", fontSize: 11, marginTop: 2, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        &ldquo;{row.reason}&rdquo;
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{
                      display: "inline-flex",
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      fontSize: 11,
                      color: "var(--text)",
                      fontWeight: 500,
                    }}>
                      {row.type || "General Leave"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <span style={{
                      color: "var(--text)",
                      fontWeight: 700,
                      fontFamily: "monospace",
                      fontSize: 13,
                    }}>
                      {row.days ?? 0}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ color: "var(--text-2)", fontSize: 11.5, display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={12} color="var(--text-2)" />
                      <span>{row.from || "—"}</span>
                      <span style={{ color: "rgba(124,58,237,0.6)" }}>→</span>
                      <span>{row.to || "—"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 9px",
                      borderRadius: 6,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}>
                      <Icon size={11} /> {row.status?.toUpperCase() || "PENDING"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "48px 20px",
          color: "var(--text-2)",
          borderRadius: 12,
          border: "1px dashed var(--border)",
          marginTop: 16,
          background: "var(--surface)",
        }}>
          No leave applications found matching filter
        </div>
      )}
    </div>
  );
}
