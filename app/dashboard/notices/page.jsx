"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/formatters";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import Pagination from "@/components/ui/Pagination";

const EMPTY_FORM = { title: "", message: "", target_audience: "All", target_department: "", target_employee_id: "" };

export default function NoticesPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const canPost = role === "hr";
  const [notices, setNotices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editItem, setEditItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;
  const [showToast, toastNode] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [
        apiFetch(isAdmin || canPost ? "/notices/all" : "/notices"),
      ];
      if (isAdmin || canPost) {
        requests.push(apiFetch("/departments/"));
        requests.push(apiFetch("/employees/"));
      }
      const [noticeData, departmentData, employeeData] = await Promise.all(requests);
      setNotices(Array.isArray(noticeData) ? noticeData : []);
      if (isAdmin || canPost) {
        setDepartments(Array.isArray(departmentData) ? departmentData : []);
        setEmployees(Array.isArray(employeeData) ? employeeData : []);
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [canPost, isAdmin, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function post(event) {
    event.preventDefault();
    if (form.target_audience === "Department" && !form.target_department) {
      showToast("Select a department", "error");
      return;
    }
    if (form.target_audience === "Employee" && !form.target_employee_id) {
      showToast("Select an employee", "error");
      return;
    }
    try {
      await apiFetch("/notices", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          target_employee_id: form.target_audience === "Employee" && form.target_employee_id ? +form.target_employee_id : null,
        }),
      });
      showToast("Notice published");
      setForm(EMPTY_FORM);
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function updateNotice() {
    if (editItem.target_audience === "Department" && !editItem.target_department) {
      showToast("Select a department", "error");
      return;
    }
    if (editItem.target_audience === "Employee" && !editItem.target_employee_id) {
      showToast("Select an employee", "error");
      return;
    }
    try {
      await apiFetch(`/notices/${editItem.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...editItem,
          target_employee_id: editItem.target_audience === "Employee" && editItem.target_employee_id ? +editItem.target_employee_id : null,
        }),
      });
      showToast("Notice updated");
      setEditItem(null);
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function deleteNotice(id) {
    if (!window.confirm("Are you sure you want to delete this notice? This action cannot be undone.")) return;
    try {
      await apiFetch(`/notices/${id}`, { method: "DELETE" });
      showToast("Notice deleted");
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  const audienceColor = { All: "#10b981", Department: "#8b5cf6", Employee: "#f59e0b" };
  const sortedEmployees = employees
    .slice()
    .sort((a, b) => `${a.emp_id} ${a.first_name} ${a.last_name}`.localeCompare(`${b.emp_id} ${b.first_name} ${b.last_name}`));

  return (
    <div>
      <div className="page-header">
        <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Notice Board</h1>
        <p style={{ color: "var(--muted)", marginTop: 4 }}>
          {canPost ? "HR can publish notices. Admin can edit or remove them." : "Company announcements and targeted updates."}
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: canPost ? "repeat(auto-fit, minmax(min(100%, 340px), 1fr))" : "1fr", gap: 24, alignItems: "start" }}>
        {canPost && (
          <div className="card" style={{ padding: 24 }}>
            <h2 className="syne" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Create Notice</h2>
            <form onSubmit={post}>
              <div className="form-group"><label className="label">Title <span style={{ color: "#ef4444" }}>*</span></label><input className="input" required value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} /></div>
              <div className="form-group"><label className="label">Message <span style={{ color: "#ef4444" }}>*</span></label><textarea className="input" rows={4} required value={form.message} onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))} /></div>
              <div className="form-group">
                <label className="label">Target</label>
                <select className="input" value={form.target_audience} onChange={(e) => setForm((current) => ({ ...current, target_audience: e.target.value }))}>
                  <option value="All">Everyone</option>
                  <option value="Department">Department</option>
                  <option value="Employee">Single Employee</option>
                </select>
              </div>
              {form.target_audience === "Department" ? (
                <div className="form-group">
                  <label className="label">Department</label>
                  <select className="input" value={form.target_department} onChange={(e) => setForm((current) => ({ ...current, target_department: e.target.value }))}>
                    <option value="">Select department…</option>
                    {departments.map((dept) => <option key={dept.id} value={dept.name}>{dept.name}</option>)}
                  </select>
                </div>
              ) : null}
              {form.target_audience === "Employee" ? (
                <div className="form-group">
                  <label className="label">Employee</label>
                  <select className="input" value={form.target_employee_id} onChange={(e) => setForm((current) => ({ ...current, target_employee_id: e.target.value }))}>
                    <option value="">Select employee…</option>
                    {sortedEmployees.map((employee) => (
                      <option key={employee.emp_id} value={employee.user_id}>
                        {employee.emp_id} - {[employee.first_name, employee.last_name].filter(Boolean).join(" ")}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <button className="btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>Publish</button>
            </form>
          </div>
        )}
        <div>
          {loading ? <Loader /> : notices.length === 0 ? <EmptyState icon="📢" title="No notices yet" /> : (
            <div>
              {(() => {
                const safePage = Math.min(currentPage, Math.max(1, Math.ceil(notices.length / PER_PAGE)));
                const paginatedNotices = notices.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
                return paginatedNotices.map((notice) => {
                  const color = audienceColor[notice.target_audience] || "#64748b";
                  return (
                    <div key={notice.id} className="card" style={{ padding: 20, marginBottom: 12, borderLeft: `3px solid ${color}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                        <div>
                          <h3 style={{ fontWeight: 700, fontSize: 15 }}>{notice.title}</h3>
                          <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>📅 {fmtDate(notice.created_at)} · {notice.posted_by_name || "HR"}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span className="badge" style={{ background: `${color}22`, color, flexShrink: 0 }}>{notice.target_audience}</span>
                          {isAdmin ? (
                            <>
                              <button className="btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setEditItem({ ...notice })}>Edit</button>
                              <button className="btn-danger" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => deleteNotice(notice.id)}>Delete</button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      {notice.target_audience === "Department" && notice.target_department ? (
                        <div style={{ marginBottom: 8, fontSize: 12, color: "var(--muted)" }}>Department: {notice.target_department}</div>
                      ) : null}
                      {notice.target_audience === "Employee" && notice.target_employee_id ? (
                        <div style={{ marginBottom: 8, fontSize: 12, color: "var(--muted)" }}>
                          Employee: {sortedEmployees.find((employee) => employee.user_id === notice.target_employee_id)?.emp_id || notice.target_employee_id}
                        </div>
                      ) : null}
                      <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{notice.message}</p>
                    </div>
                  );
                });
              })()}
              <Pagination
                currentPage={currentPage}
                totalItems={notices.length}
                pageSize={PER_PAGE}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </div>
          )}
        </div>
      </div>

      {editItem && (
        <Modal
          title="Edit Notice"
          onClose={() => setEditItem(null)}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setEditItem(null)}>Cancel</button>
              <button className="btn-primary" onClick={updateNotice}>Save</button>
            </>
          }
        >
          <div className="form-group"><label className="label">Title</label><input className="input" value={editItem.title || ""} onChange={(e) => setEditItem((current) => ({ ...current, title: e.target.value }))} /></div>
          <div className="form-group"><label className="label">Message</label><textarea className="input" rows={4} value={editItem.message || ""} onChange={(e) => setEditItem((current) => ({ ...current, message: e.target.value }))} /></div>
          <div className="form-group">
            <label className="label">Target</label>
            <select className="input" value={editItem.target_audience || "All"} onChange={(e) => setEditItem((current) => ({ ...current, target_audience: e.target.value }))}>
              <option value="All">Everyone</option>
              <option value="Department">Department</option>
              <option value="Employee">Single Employee</option>
            </select>
          </div>
          {editItem.target_audience === "Department" ? (
            <div className="form-group">
              <label className="label">Department</label>
              <select className="input" value={editItem.target_department || ""} onChange={(e) => setEditItem((current) => ({ ...current, target_department: e.target.value }))}>
                <option value="">Select department…</option>
                {departments.map((dept) => <option key={dept.id} value={dept.name}>{dept.name}</option>)}
              </select>
            </div>
          ) : null}
          {editItem.target_audience === "Employee" ? (
            <div className="form-group">
              <label className="label">Employee</label>
              <select className="input" value={editItem.target_employee_id || ""} onChange={(e) => setEditItem((current) => ({ ...current, target_employee_id: e.target.value }))}>
                <option value="">Select employee…</option>
                {sortedEmployees.map((employee) => (
                  <option key={employee.emp_id} value={employee.user_id}>
                    {employee.emp_id} - {[employee.first_name, employee.last_name].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </Modal>
      )}
      {toastNode}
    </div>
  );
}
