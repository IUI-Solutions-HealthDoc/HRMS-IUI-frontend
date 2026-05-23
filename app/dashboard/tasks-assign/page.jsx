"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import { getToken } from "@/lib/api";

export default function TasksAssignPage() {
  const [tasks, setTasks] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teamMemberCount, setTeamMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({
    assignment_scope: "all",
    emp_id: "",
    department_id: "",
    title: "",
    employee_name: "",
    description: "",
    task_count: 1,
    deadline: "",
    file: null,
  });
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewReason, setReviewReason] = useState("");
  const [showToast, toastNode] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, assignmentData] = await Promise.all([
        apiFetch("/tasks/team"),
        apiFetch("/tasks/assignment-options").catch(() => ({})),
      ]);
      setTasks(Array.isArray(data) ? data : (data?.active_tasks || []));
      setPendingApprovals(Array.isArray(data?.pending_approvals) ? data.pending_approvals : []);
      const employees = Array.isArray(assignmentData?.employees) ? assignmentData.employees : [];
      const managedDepartments = Array.isArray(assignmentData?.departments) ? assignmentData.departments : [];
      setAssignees(employees);
      setDepartments(managedDepartments);
      setTeamMemberCount(Number(assignmentData?.total_employees || employees.length || 0));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function assignTask(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("assignment_scope", assignForm.assignment_scope);
    if (assignForm.assignment_scope === "all") {
      formData.append("assigned_to", "ALL");
    } else if (assignForm.assignment_scope === "department") {
      formData.append("assigned_to", `DEPARTMENT:${assignForm.department_id}`);
      if (assignForm.department_id) {
        formData.append("department_id", assignForm.department_id);
      }
    } else {
      formData.append("assigned_to", assignForm.emp_id);
    }
    formData.append("title", assignForm.title);
    formData.append("description", assignForm.description);
    formData.append("task_count", String(assignForm.task_count || 1));
    formData.append("due_date", assignForm.deadline);
    if (assignForm.file) {
      formData.append("attached_file", assignForm.file);
    }

    try {
      await apiFetch("/tasks/assign", {
        method: "POST",
        body: formData,
        headers: {}, // Browser sets multipart/form-data
      });
      showToast("Task assigned!");
      setShowAssign(false);
      setAssignForm({
        assignment_scope: "all",
        emp_id: "",
        department_id: "",
        title: "",
        employee_name: "",
        description: "",
        task_count: 1,
        deadline: "",
        file: null,
      });
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function reviewTask(revertId, decision, reason = "") {
    try { await apiFetch("/tasks/review", { method: "POST", body: JSON.stringify({ revert_id: revertId, decision, reason }) }); showToast(`Task ${decision}!`); setReviewTarget(null); setReviewReason(""); load(); } catch (e) { showToast(e.message, "error"); }
  }

  async function downloadReport() {
    try {
      const res = await fetch(`/api/proxy/exports/tasks/`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Task_Report.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  const selectedDepartment = departments.find((department) => String(department.id) === String(assignForm.department_id));
  const employeesByDepartment = departments
    .map((department) => ({
      ...department,
      employees: assignees.filter((employee) => employee.department_id === department.id),
    }))
    .filter((department) => department.employees.length > 0);
  const openTasks = tasks.filter((task) => (task.status || "").toLowerCase() !== "completed").length;

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Task Management</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>Assign tasks to your full team, one department, or an individual employee</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={downloadReport}>⬇ Download Report</button>
          <button className="btn-primary" onClick={() => setShowAssign(true)}>+ Assign Task</button>
        </div>
      </div>
      <div className="grid-stats" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ "--accent": "#8b5cf6" }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>👥</div>
          <div className="syne" style={{ fontSize: 22, fontWeight: 800 }}>{teamMemberCount}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Managed employees</div>
        </div>
        <div className="stat-card" style={{ "--accent": "#6366f1" }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>🏢</div>
          <div className="syne" style={{ fontSize: 22, fontWeight: 800 }}>{departments.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Managed departments</div>
        </div>
        <div className="stat-card" style={{ "--accent": "#10b981" }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>📋</div>
          <div className="syne" style={{ fontSize: 22, fontWeight: 800 }}>{openTasks}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Open tasks</div>
        </div>
        <div className="stat-card" style={{ "--accent": "#f59e0b" }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>⏳</div>
          <div className="syne" style={{ fontSize: 22, fontWeight: 800 }}>{pendingApprovals.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Pending reviews</div>
        </div>
      </div>
      <div className="card">
        {loading ? <Loader /> : tasks.length === 0 ? <EmptyState icon="✓" title="No tasks" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Name of Employee</th><th>Task Details</th><th>No. Tasks Provided</th><th>Deadline</th><th>Status</th><th>Attachment</th><th>Actions</th></tr></thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr key={i}>
                    <td>{t.assigned_date ? new Date(t.assigned_date).toLocaleDateString("en-IN") : "—"}</td>
                    <td>{t.assigned_to_name || t.emp_id}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.title}</div>
                      <div style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: "var(--muted)" }}>{t.description}</div>
                    </td>
                    <td>{t.task_count || 1}</td>
                    <td>{t.deadline ? new Date(t.deadline).toLocaleString("en-IN") : "—"}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      {t.attached_file ? (
                        <a href={t.attached_file} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>📎 View File</a>
                      ) : <span style={{ color: "var(--muted)", fontSize: 11 }}>None</span>}
                    </td>
                    <td>{t.status === "reviewing" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        {t.revert?.id && <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => reviewTask(t.revert.id, "Approved")}>✓ Approve</button>}
                        {t.revert?.id && <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setReviewTarget(t.revert.id)}>↩ Revise</button>}
                      </div>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {pendingApprovals.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
            <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Pending Reviews</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Task</th><th>Employee</th><th>Notes</th><th>Attachments</th><th>TL Status</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{pendingApprovals.map((item) => {
                const totalAttachments = (item.image_urls?.length || 0) + (item.attachments?.length || 0);
                return (
                <tr key={item.revert_id}>
                  <td>{item.title}{item.task_link ? <div style={{ fontSize: 11 }}><a href={item.task_link} target="_blank" rel="noreferrer">Open link</a></div> : null}</td>
                  <td>{item.assigned_to_name}</td>
                  <td style={{ maxWidth: 220 }}>{item.employee_notes || item.remarks || "—"}</td>
                  <td>
                    {totalAttachments ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(item.image_urls || []).map((url, idx) => (
                          <a key={`i-${idx}`} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(99,102,241,0.12)", color: "#4338ca" }}>📷 {idx + 1}</a>
                        ))}
                        {(item.attachments || []).map((att, idx) => (
                          <a key={`a-${idx}`} href={att.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(14,165,233,0.14)", color: "#0369a1" }}>{(att.kind || "file").toUpperCase()}</a>
                        ))}
                      </div>
                    ) : "—"}
                  </td>
                  <td>{item.tl_status && item.tl_status !== "skipped" ? <StatusBadge status={item.tl_status} /> : <span style={{ fontSize: 11, color: "var(--muted)" }}>—</span>}</td>
                  <td><StatusBadge status={item.hod_status || item.status} /></td>
                  <td><div style={{ display: "flex", gap: 6 }}><button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => reviewTask(item.revert_id, "Approved")}>Approve</button><button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setReviewTarget(item.revert_id)}>Needs Revisions</button></div></td>
                </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}
      {showAssign && (
        <Modal title="Assign Task" onClose={() => setShowAssign(false)}
          footer={<><button className="btn-ghost" onClick={() => setShowAssign(false)}>Cancel</button><button className="btn-primary" onClick={assignTask}>Assign</button></>}>
          <div className="form-group">
            <label className="label">Assign To</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              {[
                { value: "all", title: "Entire Team", sub: `${teamMemberCount} employees across all managed departments` },
                { value: "department", title: "Department", sub: "Assign to one selected department" },
                { value: "employee", title: "Single Employee", sub: "Assign directly to one employee" },
              ].map((option) => {
                const active = assignForm.assignment_scope === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAssignForm((form) => ({
                      ...form,
                      assignment_scope: option.value,
                      emp_id: option.value === "employee" ? form.emp_id : "",
                      department_id: option.value === "department" ? form.department_id : "",
                    }))}
                    style={{
                      border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: active ? "rgba(139,92,246,0.08)" : "var(--card-bg)",
                      borderRadius: 14,
                      padding: "14px 16px",
                      textAlign: "left",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{option.title}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{option.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="form-row">
            {assignForm.assignment_scope === "department" && (
              <div className="form-group">
                <label className="label">Department</label>
                <select className="input" value={assignForm.department_id} onChange={(e) => setAssignForm((form) => ({ ...form, department_id: e.target.value }))}>
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} ({department.employee_count || 0} employees)
                    </option>
                  ))}
                </select>
              </div>
            )}
            {assignForm.assignment_scope === "employee" && (
              <div className="form-group">
                <label className="label">Employee</label>
                <select className="input" value={assignForm.emp_id} onChange={(e) => setAssignForm((form) => ({ ...form, emp_id: e.target.value }))}>
                  <option value="">Select employee</option>
                  {employeesByDepartment.map((department) => (
                    <optgroup key={department.id} label={department.name}>
                      {department.employees.map((employee) => (
                        <option key={employee.emp_id} value={employee.emp_id}>
                          {employee.emp_id} - {employee.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="label">Scope Summary</label>
              <div className="input" style={{ minHeight: 46, display: "flex", alignItems: "center", color: "var(--text)" }}>
                {assignForm.assignment_scope === "all" && `This task will go to all ${teamMemberCount} managed employees.`}
                {assignForm.assignment_scope === "department" && (selectedDepartment
                  ? `This task will go to ${selectedDepartment.employee_count || 0} employees in ${selectedDepartment.name}.`
                  : "Choose one department from your managed list.")}
                {assignForm.assignment_scope === "employee" && (assignForm.emp_id
                  ? `This task will go only to ${assignForm.emp_id}.`
                  : "Choose one employee from your managed departments.")}
              </div>
            </div>
            <div className="form-group"><label className="label">Deadline</label><input className="input" type="datetime-local" value={assignForm.deadline} onChange={(e) => setAssignForm((f) => ({ ...f, deadline: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Name of Task</label><input className="input" placeholder="Task name…" value={assignForm.title} onChange={(e) => setAssignForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="form-group"><label className="label">No. Tasks Provided</label><input className="input" type="number" min="1" value={assignForm.task_count} onChange={(e) => setAssignForm((f) => ({ ...f, task_count: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="label">Task Details</label><textarea className="input" rows={3} value={assignForm.description} onChange={(e) => setAssignForm((f) => ({ ...f, description: e.target.value }))} /></div>
          
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="label">Attachment (Max 50MB)</label>
            <input type="file" className="input" onChange={(e) => setAssignForm(f => ({ ...f, file: e.target.files[0] }))} />
          </div>
        </Modal>
      )}
      {reviewTarget && (
        <Modal title="Request Revisions" onClose={() => setReviewTarget(null)}
          footer={<><button className="btn-ghost" onClick={() => setReviewTarget(null)}>Cancel</button><button className="btn-primary" disabled={!reviewReason.trim()} onClick={() => reviewTask(reviewTarget, "Needs Revisions", reviewReason)}>Send Back</button></>}>
          <div className="form-group"><label className="label">Reason</label><textarea className="input" rows={4} value={reviewReason} onChange={(e) => setReviewReason(e.target.value)} /></div>
        </Modal>
      )}
      {toastNode}
    </div>
  );
}
