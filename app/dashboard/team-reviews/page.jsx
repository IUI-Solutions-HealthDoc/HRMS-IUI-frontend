"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/formatters";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";

function AttachmentChip({ attachment }) {
  const palette = {
    image: { bg: "rgba(99,102,241,0.12)", color: "#4338ca" },
    video: { bg: "rgba(236,72,153,0.12)", color: "#be185d" },
    pdf: { bg: "rgba(239,68,68,0.12)", color: "#b91c1c" },
    doc: { bg: "rgba(14,165,233,0.14)", color: "#0369a1" },
    other: { bg: "rgba(100,116,139,0.16)", color: "#475569" },
  }[attachment.kind] || { bg: "rgba(100,116,139,0.16)", color: "#475569" };
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 10px", borderRadius: 999,
        background: palette.bg, color: palette.color,
        fontSize: 11, fontWeight: 600, textDecoration: "none",
        marginRight: 6, marginBottom: 6,
      }}
    >
      <span style={{ textTransform: "uppercase", fontSize: 10 }}>{attachment.kind}</span>
      <span>{attachment.name || "attachment"}</span>
    </a>
  );
}

export default function TeamReviewsPage() {
  const [team, setTeam] = useState({ members: [], pending_reviews: [], team_size: 0, team_limit: 50 });
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionNote, setActionNote] = useState("");
  const [showToast, toastNode] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/tasks/tl/team");
      setTeam(data || { members: [], pending_reviews: [] });
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  async function decide(revertId, decision, note = "") {
    try {
      const formData = new FormData();
      formData.append("decision", decision);
      if (note) formData.append("note", note);
      await apiFetch(`/tasks/${revertId}/tl-review`, { method: "POST", body: formData, headers: {} });
      showToast(decision === "approve" ? "Forwarded to HOD" : "Returned to employee");
      setActionTarget(null);
      setActionNote("");
      load();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-header">
        <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Team Reviews</h1>
        <p style={{ color: "var(--muted)", marginTop: 4 }}>Review your team's task submissions before they reach the HOD.</p>
      </div>

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ "--accent": "#14b8a6" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{team.team_size} / {team.team_limit}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Team members (max {team.team_limit})</div>
        </div>
        <div className="stat-card" style={{ "--accent": "#f59e0b" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📥</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{team.pending_reviews.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Pending reviews</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Submissions awaiting your review</h2>
        </div>
        {team.pending_reviews.length === 0 ? (
          <EmptyState icon="✅" title="All clear" sub="Your team has no submissions waiting." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Task</th>
                  <th>Completion</th>
                  <th>Output / Link</th>
                  <th>Attachments</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.pending_reviews.map((item) => (
                  <tr key={item.revert_id}>
                    <td><b>{item.assigned_to_name}</b><div style={{ fontSize: 12, color: "var(--muted)" }}>{item.emp_id}</div></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", maxWidth: 240, whiteSpace: "normal" }}>{item.description}</div>
                    </td>
                    <td>{item.completion_percent}%{item.completed_flag ? " ✓" : ""}</td>
                    <td>
                      <div style={{ maxWidth: 220, whiteSpace: "normal" }}>{item.output_text || "—"}</div>
                      {item.task_link ? <a href={item.task_link} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Open link</a> : null}
                    </td>
                    <td>
                      <div>
                        {(item.image_urls || []).map((url, index) => (
                          <AttachmentChip key={`img-${index}`} attachment={{ url, name: `Screenshot ${index + 1}`, kind: "image" }} />
                        ))}
                        {(item.attachments || []).map((att, index) => (
                          <AttachmentChip key={`att-${index}`} attachment={att} />
                        ))}
                        {(!item.image_urls?.length && !item.attachments?.length) ? <span style={{ fontSize: 12, color: "var(--muted)" }}>—</span> : null}
                      </div>
                    </td>
                    <td>{fmtDate(item.assigned_date)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => decide(item.revert_id, "approve")}>Forward to HOD</button>
                        <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setActionTarget(item.revert_id)}>Send Back</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>My Team</h2>
        </div>
        {team.members.length === 0 ? (
          <EmptyState icon="🪪" title="No team members assigned" sub="HR or HOD will set you as their Team Lead." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Employee</th><th>Department</th></tr></thead>
              <tbody>
                {team.members.map((member) => (
                  <tr key={member.emp_id}>
                    <td><b>{member.name}</b><div style={{ fontSize: 12, color: "var(--muted)" }}>{member.emp_id}</div></td>
                    <td>{member.department || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {actionTarget ? (
        <Modal
          title="Send submission back"
          onClose={() => { setActionTarget(null); setActionNote(""); }}
          footer={
            <>
              <button className="btn-ghost" onClick={() => { setActionTarget(null); setActionNote(""); }}>Cancel</button>
              <button className="btn-primary" disabled={!actionNote.trim()} onClick={() => decide(actionTarget, "reject", actionNote)}>Send Back</button>
            </>
          }
        >
          <div className="form-group">
            <label className="label">Note to employee</label>
            <textarea className="input" rows={4} value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder="Explain what to fix before re-submitting." />
          </div>
        </Modal>
      ) : null}

      {toastNode}
    </div>
  );
}
