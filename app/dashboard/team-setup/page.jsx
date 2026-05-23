"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";

export default function TeamSetupPage() {
  const { role } = useAuth();
  const canAssignTl = role === "hod";
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingEmpId, setSavingEmpId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [showToast, toastNode] = useToast();

  const tlOptions = useMemo(
    () => team.filter((member) => member.is_tl),
    [team]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await apiFetch("/employees/team/manage");
        setTeam(Array.isArray(rows) ? rows : []);
        setDrafts(
          Object.fromEntries(
            (Array.isArray(rows) ? rows : []).map((member) => [
              member.emp_id,
              {
                system_no: member.system_no || "",
                is_night_shift: !!member.is_night_shift,
                tl_user_id: member.tl_user_id ? String(member.tl_user_id) : "",
              },
            ])
          )
        );
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  const setDraft = (empId, patch) => {
    setDrafts((current) => ({
      ...current,
      [empId]: { ...(current[empId] || {}), ...patch },
    }));
  };

  async function saveMember(empId) {
    const draft = drafts[empId] || {};
    setSavingEmpId(empId);
    try {
      await apiFetch(`/employees/team/manage/${empId}`, {
        method: "PUT",
        body: JSON.stringify({
          system_no: (draft.system_no || "").trim() || null,
          is_night_shift: !!draft.is_night_shift,
          ...(canAssignTl ? { tl_user_id: draft.tl_user_id ? Number(draft.tl_user_id) : null } : {}),
        }),
      });
      setTeam((current) =>
        current.map((member) =>
          member.emp_id === empId
            ? {
                ...member,
                system_no: (draft.system_no || "").trim() || null,
                is_night_shift: !!draft.is_night_shift,
                tl_user_id: canAssignTl ? (draft.tl_user_id ? Number(draft.tl_user_id) : null) : member.tl_user_id,
                tl_emp_id:
                  canAssignTl && draft.tl_user_id
                    ? tlOptions.find((option) => String(option.user_id || option.id) === String(draft.tl_user_id))?.emp_id || null
                    : canAssignTl
                      ? null
                      : member.tl_emp_id,
              }
            : member
        )
      );
      showToast("Team member updated");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSavingEmpId("");
    }
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Team Setup</h1>
        <p style={{ color: "var(--muted)", marginTop: 4 }}>
          Assign system numbers, mark day or night shift, and maintain HOD → TL → Employee reporting.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 16, color: "var(--muted)", fontSize: 13 }}>
        HOD can assign TLs and set system numbers for the department. TL can update system numbers and night shift status for their direct reports.
      </div>

      <div className="card">
        {loading ? <Loader /> : team.length === 0 ? (
          <EmptyState icon="🖥" title="No team members found" sub="Once employees are assigned to your department or TL scope, they will appear here." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Current Hierarchy</th>
                  <th>System No.</th>
                  <th>Shift</th>
                  {canAssignTl ? <th>Assign TL</th> : null}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.map((member) => {
                  const draft = drafts[member.emp_id] || {};
                  return (
                    <tr key={member.emp_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{member.first_name} {member.last_name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{member.emp_id}</div>
                      </td>
                      <td>{member.department || "—"}</td>
                      <td>
                        <div style={{ fontSize: 13 }}>HOD: {member.hod_emp_id || "—"}</div>
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>TL: {member.tl_emp_id || "—"}</div>
                      </td>
                      <td>
                        <input
                          className="input"
                          value={draft.system_no || ""}
                          onChange={(e) => setDraft(member.emp_id, { system_no: e.target.value })}
                          placeholder="System no."
                          style={{ minWidth: 120 }}
                        />
                      </td>
                      <td>
                        <select
                          className="input"
                          value={draft.is_night_shift ? "night" : "day"}
                          onChange={(e) => setDraft(member.emp_id, { is_night_shift: e.target.value === "night" })}
                          style={{ minWidth: 120 }}
                        >
                          <option value="day">Day Shift</option>
                          <option value="night">Night Shift</option>
                        </select>
                      </td>
                      {canAssignTl ? (
                        <td>
                          <select
                            className="input"
                            value={draft.tl_user_id || ""}
                            onChange={(e) => setDraft(member.emp_id, { tl_user_id: e.target.value })}
                            style={{ minWidth: 180 }}
                          >
                            <option value="">No TL</option>
                            {tlOptions
                              .filter((option) => option.emp_id !== member.emp_id)
                              .map((option) => (
                                <option key={option.user_id || option.id} value={option.user_id || option.id}>
                                  {option.first_name} {option.last_name} ({option.emp_id})
                                </option>
                              ))}
                          </select>
                        </td>
                      ) : null}
                      <td>
                        <button
                          className="btn-primary"
                          style={{ padding: "8px 14px", fontSize: 12 }}
                          onClick={() => saveMember(member.emp_id)}
                          disabled={savingEmpId === member.emp_id}
                        >
                          {savingEmpId === member.emp_id ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {toastNode}
    </div>
  );
}
