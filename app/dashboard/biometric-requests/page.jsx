"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/useToast";
import Loader from "@/components/ui/Loader";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";

export default function BiometricRequestsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalityFilter, setModalityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 12;
  const [showToast, toastNode] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/devices/enrollment-requests?limit=500");
      setRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (e) {
      showToast(e.message || "Failed to load biometric requests", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateEnrollmentRequest(requestId, status) {
    let notes;
    if (status === "failed" || status === "cancelled") {
      const input = prompt("Add a note for this status (optional):", "");
      if (input === null) return;
      notes = input;
    }

    try {
      await apiFetch(`/api/devices/enrollment-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, notes }),
      });
      showToast(`Enrollment request marked ${status}.`);
      await load();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function clearEnrollmentRequests({ onlyOpen = false, includeCompleted = false } = {}) {
    const modeLabel = onlyOpen
      ? "open requests"
      : includeCompleted
      ? "all request history"
      : "non-completed requests";
    if (!confirm(`Clear ${modeLabel} for all employees? This action removes rows from the table.`)) return;

    try {
      const query = new URLSearchParams();
      if (onlyOpen) query.set("only_open", "true");
      if (includeCompleted) query.set("include_completed", "true");
      const suffix = query.toString() ? `?${query.toString()}` : "";

      const result = await apiFetch(`/api/devices/enrollment-requests/${suffix}`, {
        method: "DELETE",
      });
      showToast(result?.message || "Enrollment requests cleared.");
      await load();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function modalityLabel(modality) {
    if (modality === "fingerprint") return "Fingerprint";
    if (modality === "face") return "Face";
    return modality || "Unknown";
  }

  function statusBadgeStyle(status) {
    if (status === "completed") return { background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" };
    if (status === "failed") return { background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" };
    if (status === "cancelled") return { background: "rgba(100, 116, 139, 0.15)", color: "#94a3b8", border: "1px solid rgba(100, 116, 139, 0.3)" };
    if (status === "sent") return { background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", border: "1px solid rgba(59, 130, 246, 0.3)" };
    return { background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)" };
  }

  const counts = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => ["queued", "sent"].includes(r.status)).length;
    const completed = requests.filter((r) => r.status === "completed").length;
    const failed = requests.filter((r) => r.status === "failed").length;
    const cancelled = requests.filter((r) => r.status === "cancelled").length;
    return { total, pending, completed, failed, cancelled };
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter === "pending") {
        if (!["queued", "sent"].includes(r.status)) return false;
      } else if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }

      if (modalityFilter !== "all" && r.modality !== modalityFilter) {
        return false;
      }

      if (!q) return true;
      return (
        String(r.employee_name || "").toLowerCase().includes(q) ||
        String(r.employee_emp_id || "").toLowerCase().includes(q) ||
        String(r.device_sn || "").toLowerCase().includes(q) ||
        String(r.modality || "").toLowerCase().includes(q) ||
        String(r.requested_by || "").toLowerCase().includes(q)
      );
    });
  }, [requests, search, statusFilter, modalityFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ marginBottom: 6 }}>
            <Link
              href="/dashboard/staff"
              className="btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                fontSize: 12,
                textDecoration: "none",
                color: "var(--muted)",
              }}
            >
              <span>←</span>
              <span>Back to Staff</span>
            </Link>
          </div>
          <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>Biometric Enrollment Requests</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {counts.pending} pending request{counts.pending === 1 ? "" : "s"} across connected devices · {counts.total} total tracked
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={load}>
            Refresh
          </button>
          {isAdmin && (
            <>
              <button
                className="btn-ghost"
                style={{ padding: "8px 14px", fontSize: 13 }}
                onClick={() => clearEnrollmentRequests({ onlyOpen: true })}
              >
                Clear Open
              </button>
              <button
                className="btn-ghost"
                style={{ padding: "8px 14px", fontSize: 13 }}
                onClick={() => clearEnrollmentRequests()}
              >
                Clear Non-Completed
              </button>
              <button
                className="btn-danger"
                style={{ padding: "8px 14px", fontSize: 13 }}
                onClick={() => clearEnrollmentRequests({ includeCompleted: true })}
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 18 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <input
              className="input"
              placeholder="🔍 Search by employee name, emp ID, or device serial…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Modality:
            </span>
            {["all", "fingerprint", "face"].map((mod) => (
              <button
                key={mod}
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setModalityFilter(mod);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 8,
                  fontWeight: 600,
                  background: modalityFilter === mod ? "var(--hover-bg)" : "transparent",
                  color: modalityFilter === mod ? "var(--text)" : "var(--muted)",
                  border: modalityFilter === mod ? "1px solid var(--accent)" : "1px solid transparent",
                }}
              >
                {mod === "all" ? "All" : mod === "fingerprint" ? "👆 Fingerprint" : "👤 Face"}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          {[
            { id: "all", label: "All Requests", count: counts.total },
            { id: "pending", label: "Pending", count: counts.pending },
            { id: "completed", label: "Completed", count: counts.completed },
            { id: "failed", label: "Failed", count: counts.failed },
            { id: "cancelled", label: "Cancelled", count: counts.cancelled },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={statusFilter === tab.id ? "btn-primary" : "btn-ghost"}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              style={{ padding: "6px 14px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontSize: 11,
                  background: statusFilter === tab.id ? "rgba(255,255,255,0.25)" : "var(--hover-bg)",
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}

          {(search || statusFilter !== "all" || modalityFilter !== "all") && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setModalityFilter("all");
                setCurrentPage(1);
              }}
              style={{ padding: "6px 12px", fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table & Cards */}
      <div className="card">
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>
            Biometric Requests List ({filtered.length})
          </h2>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            Showing page {safePage} of {Math.max(1, totalPages)}
          </span>
        </div>

        {loading ? (
          <Loader />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📟"
            title="No biometric requests found"
            sub={search || statusFilter !== "all" || modalityFilter !== "all" ? "No requests match the active filters." : "Queued fingerprint and face enrollments will appear here for admin tracking."}
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-wrap bio-table-desktop">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Device</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Sent</th>
                    <th>Resolved</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{request.employee_name || "—"}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{request.employee_emp_id || "—"}</div>
                      </td>
                      <td>
                        <span className="chip" style={{ fontWeight: 600 }}>
                          {request.modality === "fingerprint" ? "👆 " : "👤 "}
                          {modalityLabel(request.modality)}
                        </span>
                      </td>
                      <td>
                        <span className="chip" style={{ fontSize: 11 }}>{request.device_sn || "—"}</span>
                      </td>
                      <td>
                        <span className="badge" style={statusBadgeStyle(request.status)}>
                          {String(request.status || "").toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{formatDateTime(request.requested_at)}</div>
                        {request.requested_by && (
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>by {request.requested_by}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>{formatDateTime(request.sent_at)}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{formatDateTime(request.resolved_at)}</div>
                        {request.resolution_source && (
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{request.resolution_source}</div>
                        )}
                      </td>
                      {isAdmin && (
                        <td>
                          {["queued", "sent"].includes(request.status) ? (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button
                                className="btn-primary"
                                style={{ padding: "4px 8px", fontSize: 11 }}
                                onClick={() => updateEnrollmentRequest(request.id, "completed")}
                              >
                                Complete
                              </button>
                              <button
                                className="btn-ghost"
                                style={{ padding: "4px 8px", fontSize: 11, color: "#ef4444" }}
                                onClick={() => updateEnrollmentRequest(request.id, "failed")}
                              >
                                Fail
                              </button>
                              <button
                                className="btn-ghost"
                                style={{ padding: "4px 8px", fontSize: 11 }}
                                onClick={() => updateEnrollmentRequest(request.id, "cancelled")}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>
                              {request.notes || "Closed"}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="bio-cards-mobile">
              {paginated.map((request) => (
                <div
                  key={request.id}
                  style={{
                    padding: "14px 16px",
                    background: "var(--hover-bg, rgba(255,255,255,0.03))",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{request.employee_name || "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{request.employee_emp_id || "—"}</div>
                    </div>
                    <span className="badge" style={statusBadgeStyle(request.status)}>
                      {String(request.status || "").toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                    <span className="chip" style={{ fontWeight: 600 }}>
                      {request.modality === "fingerprint" ? "👆 " : "👤 "}
                      {modalityLabel(request.modality)}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>Device: {request.device_sn || "—"}</span>
                  </div>

                  <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 3 }}>
                    <div>Requested: <b>{formatDateTime(request.requested_at)}</b> {request.requested_by ? `(by ${request.requested_by})` : ""}</div>
                    {request.sent_at && <div>Sent: <b>{formatDateTime(request.sent_at)}</b></div>}
                    {request.resolved_at && <div>Resolved: <b>{formatDateTime(request.resolved_at)}</b></div>}
                    {request.notes && <div style={{ color: "var(--text)" }}>Note: {request.notes}</div>}
                  </div>

                  {isAdmin && ["queued", "sent"].includes(request.status) && (
                    <div style={{ display: "flex", gap: 6, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                      <button
                        className="btn-primary"
                        style={{ padding: "4px 10px", fontSize: 11 }}
                        onClick={() => updateEnrollmentRequest(request.id, "completed")}
                      >
                        Complete
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: "4px 10px", fontSize: 11, color: "#ef4444" }}
                        onClick={() => updateEnrollmentRequest(request.id, "failed")}
                      >
                        Fail
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: "4px 10px", fontSize: 11 }}
                        onClick={() => updateEnrollmentRequest(request.id, "cancelled")}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {filtered.length > 0 && (
          <div style={{ padding: "0 20px 16px" }}>
            <Pagination
              currentPage={safePage}
              totalItems={filtered.length}
              pageSize={PER_PAGE}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .bio-table-desktop {
          display: block;
        }
        .bio-cards-mobile {
          display: none;
        }
        @media (max-width: 768px) {
          .bio-table-desktop {
            display: none !important;
          }
          .bio-cards-mobile {
            display: flex !important;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
          }
        }
      `}</style>
      {toastNode}
    </div>
  );
}
