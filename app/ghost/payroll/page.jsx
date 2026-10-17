"use client";

import { useState, useEffect, useMemo } from "react";
import { ghostFetch } from "@/lib/ghost-api";
import { DollarSign, Search, Edit3, X, Check, AlertCircle, Building2, CreditCard, ShieldCheck } from "lucide-react";

export default function GhostPayrollPage() {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editBank, setEditBank] = useState("");
  const [editIfsc, setEditIfsc] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    fetchPayrollData();
  }, []);

  async function fetchPayrollData() {
    try {
      setLoading(true);
      setError(null);
      const data = await ghostFetch("/payroll");
      setPayrollData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching payroll:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditAmount(item.amount ?? "");
    setEditBank(item.bank_account ?? "");
    setEditIfsc(item.ifsc_code ?? "");
    setSaveSuccess(null);
    setSaveError(null);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setSaving(false);
    setSaveSuccess(null);
    setSaveError(null);
  };

  const handleSavePayroll = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const val = parseFloat(editAmount);
    if (isNaN(val) || val < 0) {
      setSaveError("Please enter a valid salary amount (≥ 0)");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const targetId = editingItem.emp_id || editingItem.id;
      const res = await ghostFetch(`/payroll/${targetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: val,
          bank_account: editBank,
          ifsc_code: editIfsc,
        }),
      });

      // Update state locally
      setPayrollData((prev) =>
        prev.map((p) =>
          (p.emp_id === editingItem.emp_id || p.id === editingItem.id)
            ? { ...p, amount: val, bank_account: editBank, ifsc_code: editIfsc }
            : p
        )
      );

      setSaveSuccess("Payroll updated silently.");
      setTimeout(() => {
        closeEditModal();
      }, 900);
    } catch (err) {
      console.error("Save payroll error:", err);
      setSaveError(err.message || "Failed to update payroll");
    } finally {
      setSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    return payrollData.filter((row) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (row.employee && row.employee.toLowerCase().includes(q)) ||
        (row.emp_id && row.emp_id.toLowerCase().includes(q)) ||
        (row.department && row.department.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === "all" ||
        (row.status || "pending").toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [payrollData, search, statusFilter]);

  const stats = useMemo(() => {
    const totalAmount = payrollData.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const avgAmount = payrollData.length > 0 ? totalAmount / payrollData.length : 0;
    const paidCount = payrollData.filter((p) => (p.status || "").toLowerCase() === "paid").length;
    return {
      totalAmount,
      avgAmount,
      totalCount: payrollData.length,
      paidCount,
    };
  }, [payrollData]);

  const getStatusBadge = (status) => {
    const isPaid = (status || "").toLowerCase() === "paid";
    return {
      bg: isPaid ? "rgba(16,185,129,0.14)" : "rgba(124,58,237,0.14)",
      color: isPaid ? "#34D399" : "#A78BFA",
      border: isPaid ? "rgba(16,185,129,0.3)" : "rgba(124,58,237,0.3)",
      label: isPaid ? "PAID" : "PENDING",
    };
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-2)" }}>
        <div style={{
          width: 32,
          height: 32,
          border: "3px solid rgba(124,58,237,0.2)",
          borderTopColor: "#7C3AED",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 16px",
        }} />
        <p style={{ fontSize: 13, letterSpacing: "0.04em" }}>Accessing secure payroll ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: "16px 20px",
        borderRadius: 14,
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.25)",
        color: "#F87171",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <AlertCircle size={18} />
        <span>Failed to load payroll: {error}</span>
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
              letterSpacing: "-0.02em",
              margin: 0,
            }}>
              Silent Payroll Management
            </h1>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              background: "rgba(124,58,237,0.15)",
              color: "#C4B5FD",
              border: "1px solid rgba(124,58,237,0.3)",
            }}>
              <ShieldCheck size={11} /> OVERRIDE ENABLED
            </span>
          </div>
          <p style={{
            color: "var(--text-2)",
            fontSize: 12.5,
            lineHeight: 1.5,
            margin: 0,
          }}>
            Inspect salary structures, override base compensation, and audit bank routing without triggering notification workflows.
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
          background: "rgba(124,58,237,0.06)",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: 12,
          padding: "12px 14px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Total Payroll Commitment
          </div>
          <div style={{ fontSize: "clamp(18px, 2.5vw, 22px)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
            ₹{stats.totalAmount.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#A78BFA", marginTop: 4 }}>
            {stats.totalCount} active employee ledgers
          </div>
        </div>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "12px 14px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Average Base Salary
          </div>
          <div style={{ fontSize: "clamp(18px, 2.5vw, 22px)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
            ₹{Math.round(stats.avgAmount).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>
            Across all departments
          </div>
        </div>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "12px 14px",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Disbursement Status
          </div>
          <div style={{ fontSize: "clamp(18px, 2.5vw, 22px)", fontWeight: 800, color: "#10B981", letterSpacing: "-0.02em" }}>
            {stats.paidCount} / {stats.totalCount}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>
            {stats.totalCount - stats.paidCount} awaiting slips
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
            placeholder="Search employee, ID, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: 12.5,
              outline: "none",
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", "paid", "pending"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                background: statusFilter === st ? "rgba(124,58,237,0.2)" : "var(--surface)",
                color: statusFilter === st ? "#C4B5FD" : "var(--text-2)",
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

      {/* Record Counter */}
      <div style={{
        marginBottom: 12,
        fontSize: 12,
        color: "var(--text-2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span>Showing {filteredData.length} records</span>
      </div>

      {/* Payroll Table */}
      <div className="ghost-table-wrap">
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12.5,
          minWidth: 640,
        }}>
          <thead>
            <tr style={{
              borderBottom: "1px solid var(--border)",
              background: "var(--surface)",
            }}>
              <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.06em" }}>
                Employee
              </th>
              <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.06em" }}>
                Department
              </th>
              <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.06em" }}>
                Bank / IFSC
              </th>
              <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.06em" }}>
                Base Salary
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.06em" }}>
                Status
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.06em" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => {
              const badge = getStatusBadge(row.status);
              return (
                <tr
                  key={row.id || row.emp_id || idx}
                  style={{
                    borderBottom: idx < filteredData.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(124,58,237,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ color: "var(--text)", fontWeight: 600 }}>
                      {row.employee || "Unknown"}
                    </div>
                    <div style={{ color: "var(--text-2)", fontSize: 11 }}>
                      {row.emp_id || "ID: " + row.id}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      fontSize: 11,
                      color: "var(--text-2)",
                    }}>
                      <Building2 size={11} /> {row.department || "General"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ color: "var(--text)", fontSize: 11.5, fontFamily: "monospace" }}>
                      {row.bank_account ? `•••• ${String(row.bank_account).slice(-4)}` : "—"}
                    </div>
                    <div style={{ color: "var(--text-2)", fontSize: 10.5 }}>
                      {row.ifsc_code || "No IFSC"}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>
                      ₹{Number(row.amount || 0).toLocaleString()}
                    </div>
                    <div style={{ color: "var(--text-2)", fontSize: 10.5 }}>
                      / month
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <span style={{
                      padding: "3px 9px",
                      borderRadius: 6,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <button
                      onClick={() => openEditModal(row)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        background: "rgba(124,58,237,0.12)",
                        border: "1px solid rgba(124,58,237,0.25)",
                        color: "#C4B5FD",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(124,58,237,0.25)";
                        e.currentTarget.style.borderColor = "#7C3AED";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(124,58,237,0.12)";
                        e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)";
                      }}
                    >
                      <Edit3 size={12} /> Edit
                    </button>
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
          borderRadius: 14,
          border: "1px dashed var(--border)",
          marginTop: 16,
          background: "var(--surface)",
        }}>
          No payroll records matching current filter
        </div>
      )}

      {/* Edit Payroll Modal */}
      {editingItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) closeEditModal();
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              background: "#0E1219",
              border: "1px solid rgba(124,58,237,0.35)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6), 0 0 30px rgba(124,58,237,0.15)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(124,58,237,0.08)",
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  <CreditCard size={16} color="#A78BFA" />
                  Override Payroll
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "rgba(255,255,255,0.6)" }}>
                  {editingItem.employee} ({editingItem.emp_id || editingItem.id})
                </p>
              </div>
              <button
                onClick={closeEditModal}
                disabled={saving}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePayroll} style={{ padding: "18px 20px" }}>
              {saveSuccess && (
                <div style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  color: "#34D399",
                  fontSize: 12,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <Check size={14} /> {saveSuccess}
                </div>
              )}

              {saveError && (
                <div style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#F87171",
                  fontSize: 12,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <AlertCircle size={14} /> {saveError}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
                  Monthly Base Salary (₹)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#A78BFA", fontWeight: 700, fontSize: 13 }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    style={{
                      width: "100%",
                      padding: "9px 12px 9px 28px",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginTop: 4, display: "block" }}>
                  Changes update base salary, future slip generation, and all financial totals.
                </span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={editBank}
                  onChange={(e) => setEditBank(e.target.value)}
                  placeholder="e.g. 919200000001"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={editIfsc}
                  onChange={(e) => setEditIfsc(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    background: "#7C3AED",
                    border: "none",
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: saving ? "wait" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 4px 12px rgba(124,58,237,0.35)",
                  }}
                >
                  {saving ? "Saving..." : "Commit Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
