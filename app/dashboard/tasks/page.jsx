"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/formatters";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workModal, setWorkModal] = useState(null);
  const [workForm, setWorkForm] = useState({
    task_name: "",
    completed_flag: false,
    completion_percent: 0,
    output_text: "",
    task_link: "",
    issue_text: "",
    hours_taken: "",
    remarks: "",
    notes: "",
    attached_file: null,
    picture_1: null,
    picture_2: null,
    picture_3: null,
    attachments: [],
  });
  const [showToast, toastNode] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch("/tasks/my"); setTasks(Array.isArray(d) ? d : []); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitWork(taskId) {
    const formData = new FormData();
    formData.append("date", new Date().toISOString().slice(0, 10));
    formData.append("task_name", workForm.task_name || workModal?.title || "");
    formData.append("completed_flag", String(!!workForm.completed_flag));
    formData.append("completion_percent", String(workForm.completion_percent || 0));
    formData.append("output_text", workForm.output_text || "");
    formData.append("task_link", workForm.task_link || "");
    formData.append("issue_text", workForm.issue_text || "");
    formData.append("hours_taken", String(workForm.hours_taken || 0));
    formData.append("remarks", workForm.remarks || "");
    formData.append("notes", workForm.notes || "");
    if (workForm.attached_file) formData.append("attached_file", workForm.attached_file);
    if (workForm.picture_1) formData.append("picture_1", workForm.picture_1);
    if (workForm.picture_2) formData.append("picture_2", workForm.picture_2);
    if (workForm.picture_3) formData.append("picture_3", workForm.picture_3);
    (workForm.attachments || []).forEach((file) => {
      if (file) formData.append("attachments", file);
    });
    
    try {
      // Note: Backend endpoint was updated to /{task_id}/revert to match HOD review flow
      await apiFetch(`/tasks/${taskId}/revert`, {
        method: "POST",
        body: formData,
        headers: {},
      });
      showToast("Work submitted for review!");
      setWorkModal(null);
      setWorkForm({
        task_name: "",
        completed_flag: false,
        completion_percent: 0,
        output_text: "",
        task_link: "",
        issue_text: "",
        hours_taken: "",
        remarks: "",
        notes: "",
        attached_file: null,
        picture_1: null,
        picture_2: null,
        picture_3: null,
        attachments: [],
      });
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>My Tasks</h1>
        <p style={{ color: "var(--muted)", marginTop: 4 }}>Track and manage your assigned tasks</p>
      </div>
      <div className="card">
        {loading ? <Loader /> : tasks.length === 0 ? <EmptyState icon="✓" title="No tasks" sub="Tasks will appear here" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Name of Task</th><th>Completed</th><th>Completion %</th><th>Output</th><th>Pictures</th><th>Link</th><th>Issue</th><th>Hours</th><th>Remark</th><th>Actions</th></tr></thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr key={i}>
                    <td>{t.revert ? fmtDate(t.assigned_date || t.deadline) : fmtDate(t.assigned_date || t.deadline)}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.description}</div>
                    </td>
                    <td>{t.revert?.completed_flag ? "Yes" : "No"}</td>
                    <td>{t.revert?.completion_percent ?? 0}%</td>
                    <td style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.revert?.output_text || "—"}</td>
                    <td>
                      {((t.revert?.image_urls?.length || 0) + (t.revert?.attachments?.length || 0)) || "—"}
                      {t.revert?.tl_status && t.revert.tl_status !== "skipped" ? (
                        <div style={{ fontSize: 10, color: t.revert.tl_status === "approved" ? "#16a34a" : t.revert.tl_status === "rejected" ? "#dc2626" : "#f59e0b" }}>
                          TL: {t.revert.tl_status}
                        </div>
                      ) : null}
                    </td>
                    <td>{t.revert?.task_link ? <a href={t.revert.task_link} target="_blank" rel="noreferrer">Open</a> : "—"}</td>
                    <td style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.revert?.issue_text || "—"}</td>
                    <td>{t.revert?.hours_taken ?? "—"}</td>
                    <td style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.revert?.remarks || t.revert?.employee_notes || "—"}</td>
                    <td>{t.status === "pending" && <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => { setWorkModal(t); setWorkForm((current) => ({ ...current, task_name: t.title })); }}>Submit Work</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {workModal && (
        <Modal title={`Submit Work: ${workModal.title}`} onClose={() => setWorkModal(null)}
          footer={<><button className="btn-ghost" onClick={() => setWorkModal(null)}>Cancel</button><button className="btn-primary" onClick={() => submitWork(workModal.id)}>Submit</button></>}>
          <div className="form-row">
            <div className="form-group"><label className="label">Date</label><input className="input" value={new Date().toISOString().slice(0, 10)} disabled /></div>
            <div className="form-group"><label className="label">Name of Task</label><select className="input" value={workForm.task_name} onChange={(e) => setWorkForm((form) => ({ ...form, task_name: e.target.value }))}><option value={workModal.title}>{workModal.title}</option>{tasks.map((task) => <option key={task.id} value={task.title}>{task.title}</option>)}</select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Completed or Not</label><select className="input" value={workForm.completed_flag ? "yes" : "no"} onChange={(e) => setWorkForm((form) => ({ ...form, completed_flag: e.target.value === "yes" }))}><option value="no">No</option><option value="yes">Yes</option></select></div>
            <div className="form-group"><label className="label">Completion %</label><input className="input" type="number" min="0" max="100" value={workForm.completion_percent} onChange={(e) => setWorkForm((form) => ({ ...form, completion_percent: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Hours Taken</label><input className="input" type="number" min="0" step="0.5" value={workForm.hours_taken} onChange={(e) => setWorkForm((form) => ({ ...form, hours_taken: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="label">Output</label><textarea className="input" rows={3} value={workForm.output_text} onChange={(e) => setWorkForm((form) => ({ ...form, output_text: e.target.value }))} /></div>
          <div className="form-row">
            <div className="form-group"><label className="label">Link of Task</label><input className="input" value={workForm.task_link} onChange={(e) => setWorkForm((form) => ({ ...form, task_link: e.target.value }))} /></div>
            <div className="form-group"><label className="label">Issue</label><input className="input" value={workForm.issue_text} onChange={(e) => setWorkForm((form) => ({ ...form, issue_text: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="label">Remark</label><textarea className="input" rows={3} value={workForm.remarks} onChange={(e) => setWorkForm((form) => ({ ...form, remarks: e.target.value }))} /></div>
          <div className="form-group"><label className="label">Notes</label><textarea className="input" rows={3} value={workForm.notes} onChange={(e) => setWorkForm((form) => ({ ...form, notes: e.target.value }))} /></div>
          <div className="form-row">
            <div className="form-group"><label className="label">Output File</label><input type="file" className="input" onChange={(e) => setWorkForm((form) => ({ ...form, attached_file: e.target.files?.[0] || null }))} /></div>
            <div className="form-group"><label className="label">Picture 1</label><input type="file" accept="image/*" className="input" onChange={(e) => setWorkForm((form) => ({ ...form, picture_1: e.target.files?.[0] || null }))} /></div>
            <div className="form-group"><label className="label">Picture 2</label><input type="file" accept="image/*" className="input" onChange={(e) => setWorkForm((form) => ({ ...form, picture_2: e.target.files?.[0] || null }))} /></div>
            <div className="form-group"><label className="label">Picture 3</label><input type="file" accept="image/*" className="input" onChange={(e) => setWorkForm((form) => ({ ...form, picture_3: e.target.files?.[0] || null }))} /></div>
          </div>
          <div className="form-group">
            <label className="label">Other Attachments (PDF / video / image / doc — up to 50MB each)</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf"
              className="input"
              onChange={(e) => setWorkForm((form) => ({ ...form, attachments: Array.from(e.target.files || []) }))}
            />
            {workForm.attachments?.length ? (
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                Selected: {workForm.attachments.map((file) => file.name).join(", ")}
              </div>
            ) : null}
          </div>
        </Modal>
      )}
      {toastNode}
    </div>
  );
}
