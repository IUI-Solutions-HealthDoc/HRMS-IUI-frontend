"use client";

import { useState, useEffect } from "react";
import { ghostFetch } from "@/lib/ghost-api";

export default function GhostEmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDept, setFilterDept] = useState("all");

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      setLoading(true);
      setError(null);
      const data = await ghostFetch("/employees");
      setEmployees(data);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const departments = ["all", ...new Set(employees.map(e => e.department || "Unknown"))];
  const filteredEmployees = filterDept === "all"
    ? employees
    : employees.filter(e => (e.department || "Unknown") === filterDept);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "var(--text-2)" }}>
        <div style={{ marginBottom: 16, opacity: 0.5 }}>◈</div>
        <p>Loading employee directory...</p>
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
          Employee Directory
        </h1>
        <p style={{
          color: "var(--text-2)",
          fontSize: 14,
          lineHeight: 1.6,
        }}>
          Complete view of all employees. No modifications possible from this view.
        </p>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 24 }}>
        <label style={{
          display: "block",
          marginBottom: 8,
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-2)",
        }}>
          Filter by Department
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setFilterDept(dept)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: filterDept === dept
                  ? "1px solid rgba(0,200,150,0.5)"
                  : "1px solid var(--border)",
                background: filterDept === dept
                  ? "rgba(0,200,150,0.12)"
                  : "transparent",
                color: filterDept === dept
                  ? "rgba(0,168,126,0.95)"
                  : "var(--text-2)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (filterDept !== dept) {
                  e.currentTarget.style.borderColor = "rgba(0,200,150,0.25)";
                  e.currentTarget.style.background = "rgba(0,200,150,0.06)";
                }
              }}
              onMouseLeave={(e) => {
                if (filterDept !== dept) {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {dept === "all" ? "All Departments" : dept}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Count */}
      <div style={{
        marginBottom: 16,
        fontSize: 13,
        color: "var(--text-2)",
      }}>
        Showing {filteredEmployees.length} of {employees.length} employees
      </div>

      {/* Employees Table */}
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
                  Name
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
                  Email
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
                  Department
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
                  Role
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp, idx) => (
                <tr
                  key={emp.id || emp.emp_id}
                  style={{
                    borderBottom: idx < filteredEmployees.length - 1 ? "1px solid var(--border)" : "none",
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
                      {emp.username || emp.name || "Unknown"}
                    </div>
                  </td>
                  <td style={{ padding: 14 }}>
                    <div style={{ color: "var(--text-2)" }}>{emp.email || "N/A"}</div>
                  </td>
                  <td style={{ padding: 14 }}>
                    <div style={{ color: "var(--text-2)" }}>
                      {emp.department || "N/A"}
                    </div>
                  </td>
                  <td style={{ padding: 14 }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: emp.is_hr ? "rgba(16,185,129,0.12)" : "rgba(0,200,150,0.12)",
                        color: emp.is_hr ? "#10B981" : "rgba(0,168,126,0.9)",
                      }}
                    >
                      {emp.is_hr ? "HR" : "Staff"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredEmployees.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--text-2)",
          borderRadius: 12,
          border: "1px dashed var(--border)",
          marginTop: 20,
        }}>
          No employees found in this department
        </div>
      )}
    </div>
  );
}
