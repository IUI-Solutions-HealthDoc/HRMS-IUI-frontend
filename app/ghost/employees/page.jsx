"use client";

import { useState, useEffect } from "react";
import { ghostFetch } from "@/lib/ghost-api";
import { useToast } from "@/hooks/useToast";

export default function GhostEmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDept, setFilterDept] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit Modal States
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [showToast, toastNode] = useToast();

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

  function openEdit(emp) {
    setEditModal(emp);
    setEditForm({
      first_name: emp.first_name || "",
      last_name: emp.last_name || "",
      email: emp.email || "",
      username: emp.username || "",
      new_password: "",
      emp_id: emp.emp_id || "",
      machine_user_id: emp.machine_user_id || "",
      department: emp.department || "",
      job_title: emp.job_title || "",
      is_active: !!emp.is_active,
      is_hr: !!emp.is_hr,
      is_accounts: !!emp.is_accounts,
      is_hod: !!emp.is_hod,
      is_tl: !!emp.is_tl,
      is_night_shift: !!emp.is_night_shift,
      base_salary: emp.base_salary || 0,
      bank_account: emp.bank_account || "",
      ifsc_code: emp.ifsc_code || "",
      system_no: emp.system_no || "",
      hod_user_id: emp.hod_user_id || "",
      tl_user_id: emp.tl_user_id || "",
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!editModal) return;
    try {
      setSaving(true);
      
      const payload = {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        email: editForm.email.trim(),
        username: editForm.username.trim(),
        emp_id: editForm.emp_id.trim(),
        machine_user_id: editForm.machine_user_id.trim() || null,
        department: editForm.department.trim(),
        job_title: editForm.job_title.trim() || null,
        is_active: !!editForm.is_active,
        is_hr: !!editForm.is_hr,
        is_accounts: !!editForm.is_accounts,
        is_hod: !!editForm.is_hod,
        is_tl: !!editForm.is_tl,
        is_night_shift: !!editForm.is_night_shift,
        base_salary: Number(editForm.base_salary) || 0,
        bank_account: editForm.bank_account.trim() || null,
        ifsc_code: editForm.ifsc_code.trim() || null,
        system_no: editForm.system_no.trim() || null,
        hod_user_id: editForm.hod_user_id ? Number(editForm.hod_user_id) : null,
        tl_user_id: editForm.tl_user_id ? Number(editForm.tl_user_id) : null,
      };

      if (editForm.new_password.trim()) {
        if (editForm.new_password.trim().length < 6) {
          showToast("Password must be at least 6 characters", "error");
          setSaving(false);
          return;
        }
        payload.new_password = editForm.new_password.trim();
      }

      const res = await ghostFetch(`/employees/${editModal.emp_id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      showToast(res.message || "Employee updated silently!");
      setEditModal(null);
      await fetchEmployees();
    } catch (err) {
      console.error("Error saving employee:", err);
      showToast(err.message || "Failed to update employee", "error");
    } finally {
      setSaving(false);
    }
  }

  const departments = ["all", ...new Set(employees.map(e => e.department || "Unknown"))];
  
  const filteredEmployees = employees.filter(e => {
    const matchesDept = filterDept === "all" || (e.department || "Unknown") === filterDept;
    const nameStr = `${e.first_name || ""} ${e.last_name || ""} ${e.username || ""} ${e.emp_id || ""}`.toLowerCase();
    const matchesSearch = nameStr.includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  // HOD & TL options for the dropdowns
  const hodOptions = employees.filter(e => e.is_hod && e.user_id);
  const tlOptions = employees.filter(e => e.is_tl && e.user_id);

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
      {toastNode}

      {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
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
            Complete view of all employees. Ghost Admin can edit details silently with zero trace.
          </p>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label style={{
            display: "block",
            marginBottom: 8,
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-2)",
          }}>
            Search Employees
          </label>
          <input
            type="text"
            placeholder="Search by name, username or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ flex: 2 }}>
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
              >
                {dept === "all" ? "All Departments" : dept}
              </button>
            ))}
          </div>
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
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 11 }}>
                  ID
                </th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 11 }}>
                  Name
                </th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 11 }}>
                  Username
                </th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 11 }}>
                  Email
                </th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 11 }}>
                  Department
                </th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 11 }}>
                  Role
                </th>
                <th style={{ padding: 14, textAlign: "right", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", fontSize: 11 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp, idx) => (
                <tr
                  key={emp.id || emp.emp_id || emp.user_id}
                  style={{
                    borderBottom: idx < filteredEmployees.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.12s",
                  }}
                >
                  <td style={{ padding: 14, color: "var(--text-2)", fontWeight: 500 }}>
                    {emp.emp_id}
                  </td>
                  <td style={{ padding: 14 }}>
                    <div style={{ color: "var(--text)", fontWeight: 600 }}>
                      {emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "N/A"}
                    </div>
                  </td>
                  <td style={{ padding: 14, color: "var(--text-2)" }}>
                    {emp.username}
                  </td>
                  <td style={{ padding: 14, color: "var(--text-2)" }}>
                    {emp.email || "N/A"}
                  </td>
                  <td style={{ padding: 14, color: "var(--text-2)" }}>
                    {emp.department || "N/A"}
                  </td>
                  <td style={{ padding: 14 }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {emp.is_superuser && (
                        <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>
                          Admin
                        </span>
                      )}
                      {emp.is_hr && (
                        <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                          HR
                        </span>
                      )}
                      {emp.is_accounts && (
                        <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "rgba(59,130,246,0.12)", color: "#3B82F6" }}>
                          Accounts
                        </span>
                      )}
                      {emp.is_hod && (
                        <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}>
                          HOD
                        </span>
                      )}
                      {emp.is_tl && (
                        <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
                          TL
                        </span>
                      )}
                      {!emp.is_superuser && !emp.is_hr && !emp.is_accounts && !emp.is_hod && !emp.is_tl && (
                        <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "rgba(107,114,128,0.12)", color: "#6B7280" }}>
                          Staff
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: 14, textAlign: "right" }}>
                    <button
                      onClick={() => openEdit(emp)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text)",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(0,200,150,0.5)";
                        e.currentTarget.style.background = "rgba(0,200,150,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.background = "var(--surface)";
                      }}
                    >
                      Edit
                    </button>
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
          No employees found
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            background: "var(--surface3)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            width: "100%",
            maxWidth: 680,
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "20px 24px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
                  Edit Employee Profile (Silent Mode)
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
                  Changes will be saved directly with no audit log stamp.
                </p>
              </div>
              <button
                onClick={() => setEditModal(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-2)",
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} style={{ overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Section: Personal Info */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,200,150,0.9)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Personal Information
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>First Name</label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      required
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Last Name</label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Username</label>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      required
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Reset Password (Leave blank to keep current)</label>
                    <input
                      type="password"
                      placeholder="New password (min 6 characters)"
                      value={editForm.new_password}
                      onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Organization Details */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,200,150,0.9)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Organization Details
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Employee ID</label>
                    <input
                      type="text"
                      value={editForm.emp_id}
                      onChange={(e) => setEditForm({ ...editForm, emp_id: e.target.value })}
                      required
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Machine User ID</label>
                    <input
                      type="text"
                      value={editForm.machine_user_id}
                      onChange={(e) => setEditForm({ ...editForm, machine_user_id: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Department</label>
                    <input
                      type="text"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      list="ghost-dept-list"
                      required
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                    <datalist id="ghost-dept-list">
                      {departments.filter(d => d !== "all").map(d => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Job Title</label>
                    <input
                      type="text"
                      value={editForm.job_title}
                      onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Roles & Shift (Grid Checkboxes) */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,200,150,0.9)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Roles & Shift Settings
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, background: "var(--surface)", padding: 16, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    />
                    Active Status
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.is_hr}
                      onChange={(e) => setEditForm({ ...editForm, is_hr: e.target.checked })}
                    />
                    HR Access
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.is_accounts}
                      onChange={(e) => setEditForm({ ...editForm, is_accounts: e.target.checked })}
                    />
                    Accounts Access
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.is_hod}
                      onChange={(e) => setEditForm({ ...editForm, is_hod: e.target.checked })}
                    />
                    HOD Status
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.is_tl}
                      onChange={(e) => setEditForm({ ...editForm, is_tl: e.target.checked })}
                    />
                    Team Lead Status
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.is_night_shift}
                      onChange={(e) => setEditForm({ ...editForm, is_night_shift: e.target.checked })}
                    />
                    Night Shift
                  </label>
                </div>
              </div>

              {/* Section: Payroll & Financials */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,200,150,0.9)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Payroll & Financial Details
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Base Salary</label>
                    <input
                      type="number"
                      value={editForm.base_salary}
                      onChange={(e) => setEditForm({ ...editForm, base_salary: e.target.value })}
                      required
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Bank Account No</label>
                    <input
                      type="text"
                      value={editForm.bank_account}
                      onChange={(e) => setEditForm({ ...editForm, bank_account: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>IFSC Code</label>
                    <input
                      type="text"
                      value={editForm.ifsc_code}
                      onChange={(e) => setEditForm({ ...editForm, ifsc_code: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Section: System No & Reporting */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,200,150,0.9)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  System & Reporting
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>System Number</label>
                    <input
                      type="text"
                      value={editForm.system_no}
                      onChange={(e) => setEditForm({ ...editForm, system_no: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Reporting HOD</label>
                    <select
                      value={editForm.hod_user_id}
                      onChange={(e) => setEditForm({ ...editForm, hod_user_id: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    >
                      <option value="">None</option>
                      {hodOptions.map(h => (
                        <option key={h.user_id} value={h.user_id}>
                          {h.name || `${h.first_name || ""} ${h.last_name || ""}`.trim() || h.username} (ID: {h.emp_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Reporting TL</label>
                    <select
                      value={editForm.tl_user_id}
                      onChange={(e) => setEditForm({ ...editForm, tl_user_id: e.target.value })}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
                    >
                      <option value="">None</option>
                      {tlOptions.map(t => (
                        <option key={t.user_id} value={t.user_id}>
                          {t.name || `${t.first_name || ""} ${t.last_name || ""}`.trim() || t.username} (ID: {t.emp_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                marginTop: 12,
                paddingTop: 20,
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}>
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-2)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    border: "none",
                    background: "rgba(0,200,150,0.9)",
                    color: "#FFF",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving silently..." : "Save Silently"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
