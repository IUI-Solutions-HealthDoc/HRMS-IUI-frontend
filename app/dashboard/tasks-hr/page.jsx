"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getToken, apiUrl } from "@/lib/api";
import Loader from "@/components/ui/Loader";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/hooks/useToast";

export default function TasksHRPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showToast, toastNode] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/tasks/all");
      setTasks(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function downloadReport() {
    try {
      const res = await fetch(apiUrl(`/exports/tasks/`), { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Task_Report.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) { showToast(e.message, "error"); }
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>All Tasks</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>View task assignments and review notes across departments.</p>
        </div>
        <button className="btn-ghost" onClick={downloadReport}>⬇ Download Report</button>
      </div>
      <div className="card">
        {loading ? <Loader /> : tasks.length === 0 ? <EmptyState icon="📋" title="No tasks found" /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Task</th><th>Assigned By</th><th>Assigned To</th><th>Department</th><th>Status</th><th>Employee Notes</th></tr></thead>
              <tbody>{tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{task.assigned_by_name || "—"}</td>
                  <td>{task.assigned_to_name || "—"}</td>
                  <td>{task.department || "—"}</td>
                  <td><StatusBadge status={task.revert?.hod_status || task.status} /></td>
                  <td style={{ maxWidth: 240 }}>{task.revert?.employee_notes || "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {toastNode}
    </div>
  );
}
