"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";

export default function DepartmentsPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "hr";
  const canDelete = role === "admin";
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [showToast, toastNode] = useToast();
  const isProtectedDepartment = (dept) => ["administration", "hr"].includes((dept.name || "").trim().toLowerCase());
  const canDeleteDepartment = (dept) => canDelete && !isProtectedDepartment(dept) && Number(dept.employee_count || 0) === 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/departments/");
      setDepartments(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createDepartment() {
    try {
      await apiFetch("/departments/", { method: "POST", body: JSON.stringify(form) });
      showToast("Department created!");
      setShowAdd(false);
      setForm({ name: "", description: "" });
      load();
    } catch (e) { showToast(e.message, "error"); }
  }

  async function updateDepartment() {
    try {
      await apiFetch(`/departments/${editItem.id}`, { method: "PUT", body: JSON.stringify(editItem) });
      showToast("Department updated!");
      setEditItem(null);
      load();
    } catch (e) { showToast(e.message, "error"); }
  }

  async function deleteDepartment(id) {
    if (!confirm("Delete this department?")) return;
    try {
      await apiFetch(`/departments/${id}`, { method: "DELETE" });
      showToast("Department deleted");
      load();
    } catch (e) { showToast(e.message, "error"); }
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Departments</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>Manage company departments and team structure</p>
        </div>
        {canManage && <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Department</button>}
      </div>
      <div className="card">
        {loading ? <Loader /> : departments.length === 0 ? <EmptyState icon="🏢" title="No departments yet" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Description</th><th>Employees</th><th>Type</th>{canManage && <th>Actions</th>}</tr></thead>
              <tbody>{departments.map((dept) => (
                <tr key={dept.id}>
                  <td>{dept.name}</td>
                  <td>{dept.description || "—"}</td>
                  <td>{dept.employee_count}</td>
                  <td>{isProtectedDepartment(dept) ? "Protected" : dept.is_system ? "System" : "Custom"}</td>
                  {canManage && <td><div style={{ display: "flex", gap: 8 }}>{<button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setEditItem(dept)}>Edit</button>}{canDeleteDepartment(dept) && <button className="btn-danger" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => deleteDepartment(dept.id)}>Delete</button>}</div></td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {showAdd && (
        <Modal title="Add Department" onClose={() => setShowAdd(false)}
          footer={<><button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn-primary" onClick={createDepartment}>Create</button></>}>
          <div className="form-group"><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm((item) => ({ ...item, name: e.target.value }))} /></div>
          <div className="form-group"><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm((item) => ({ ...item, description: e.target.value }))} /></div>
        </Modal>
      )}
      {editItem && (
        <Modal title={`Edit: ${editItem.name}`} onClose={() => setEditItem(null)}
          footer={<><button className="btn-ghost" onClick={() => setEditItem(null)}>Cancel</button><button className="btn-primary" onClick={updateDepartment}>Save</button></>}>
          <div className="form-group"><label className="label">Name</label><input className="input" value={editItem.name} onChange={(e) => setEditItem((item) => ({ ...item, name: e.target.value }))} /></div>
          <div className="form-group"><label className="label">Description</label><input className="input" value={editItem.description || ""} onChange={(e) => setEditItem((item) => ({ ...item, description: e.target.value }))} /></div>
        </Modal>
      )}
      {toastNode}
    </div>
  );
}
