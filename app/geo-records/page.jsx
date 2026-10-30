
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { apiFetch, backendAssetUrl, getToken } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import Loader from "@/components/ui/Loader";

function todayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatTime(value) {
  if (!value) return "—";
  const time = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (time) {
    const date = new Date();
    date.setHours(Number(time[1]), Number(time[2]), 0, 0);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function distanceLabel(value) {
  if (value == null) return "—";
  return value >= 1000
    ? `${(value / 1000).toFixed(1)} km`
    : `${Math.round(value)} m`;
}

function accuracyLabel(value) {
  return value == null ? "—" : `${Math.round(value)} m`;
}

function normalizeRecords(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function GeoRecordsPage() {
  const [day, setDay] = useState(todayString);
  const [department, setDepartment] = useState("");
  const [needsReview, setNeedsReview] = useState(false);
  const [data, setData] = useState({
    total: 0,
    inside_radius: 0,
    needs_review: 0,
    records: [],
  });
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showToast, toastNode] = useToast();

  const loadRecords = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      const params = new URLSearchParams({ day });
      if (department) params.set("department", department);
      if (needsReview) params.set("needs_review", "true");

      const result = await apiFetch(
        `/attendance/geo-logs?${params.toString()}`
      );

      setData({
        total: result?.total ?? normalizeRecords(result).length,
        inside_radius: result?.inside_radius ?? 0,
        needs_review: result?.needs_review ?? 0,
        records: normalizeRecords(result),
      });
    } catch (error) {
      if (!silent) {
        showToast(error.message || "Could not load geo login records", "error");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [day, department, needsReview, showToast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (!previewPhoto) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setPreviewPhoto(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewPhoto]);

  const departments = useMemo(
    () => [...new Set(data.records.map((r) => r.department).filter(Boolean))].sort(),
    [data.records]
  );
  const selectedPhotos = selectedRecord
    ? selectedRecord.geo_photos?.length
      ? selectedRecord.geo_photos
      : [
          selectedRecord.selfie && { url: selectedRecord.selfie, punch_type: "check_in" },
          selectedRecord.selfie_out && { url: selectedRecord.selfie_out, punch_type: "check_out" },
        ].filter(Boolean)
    : [];

  async function markReviewed(record) {
    setReviewingId(record.id);

    try {
      // This endpoint has no trailing slash. Use the existing API proxy
      // directly so apiFetch does not append one to the POST URL.
      const token = getToken();
      const response = await fetch(
        `/api/proxy/attendance/geo-logs/${record.id}/review`,
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        }
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || result.message || "Review failed");
      }

      showToast("Record marked as reviewed");
      setSelectedRecord(null);
      await loadRecords({ silent: true });
    } catch (error) {
      showToast(error.message || "Could not review record", "error");
    } finally {
      setReviewingId(null);
    }
  }

  function openMap(record) {
    if (record.latitude == null || record.longitude == null) {
      showToast("Location coordinates are unavailable", "error");
      return;
    }

    const url = `https://www.google.com/maps?q=${encodeURIComponent(
      `${record.latitude},${record.longitude}`
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="syne" style={{ fontSize: 28, fontWeight: 800 }}>
          Geo Login Records
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 4 }}>
          Review employee attendance captured with GPS location and photo.
          Entries outside the office radius or with weak GPS accuracy need attention.
        </p>
      </div>

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Geo logins
          </div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>
            {data.total}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Inside office radius
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#059669" }}>
            {data.inside_radius}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Needs review
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#c2410c" }}>
            {data.needs_review}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "end",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
            Date
            <input
              className="input"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
            Department
            <select
              className="input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">All departments</option>
              {departments.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              minHeight: 42,
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={needsReview}
              onChange={(e) => setNeedsReview(e.target.checked)}
            />
            Needs review only
          </label>

          <button
            className="btn-primary"
            onClick={() => loadRecords()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh records"}
          </button>
        </div>
      </div>

      <div className="card">
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>
            Attendance — {day}
          </h2>
        </div>

        {loading ? (
          <Loader />
        ) : data.records.length === 0 ? (
          <div style={{ padding: 36, textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📍</div>
            <div style={{ fontWeight: 700, color: "var(--text)" }}>
              No geo login records found
            </div>
            <div style={{ fontSize: 13, marginTop: 5 }}>
              Try another date or change the filters.
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Distance</th>
                  <th>Accuracy</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>
                        {record.name || record.emp_id || "Unknown"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {record.emp_id || "—"}
                        {record.department ? ` · ${record.department}` : ""}
                      </div>
                    </td>
                    <td>{formatTime(record.check_in)}</td>
                    <td>{formatTime(record.check_out)}</td>
                    <td>{distanceLabel(record.distance_m)}</td>
                    <td>{accuracyLabel(record.accuracy_m)}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 9px",
                          borderRadius: 20,
                          fontSize: 11,
                          background: record.inside_radius
                            ? "rgba(16,185,129,.12)"
                            : "rgba(249,115,22,.12)",
                          color: record.inside_radius ? "#059669" : "#c2410c",
                        }}
                      >
                        {record.inside_radius ? "Inside radius" : "Outside / unknown"}
                      </span>
                      {record.needs_review && (
                        <div style={{ fontSize: 11, color: "#c2410c", marginTop: 5 }}>
                          Needs review
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-ghost"
                        style={{ padding: "5px 8px", fontSize: 12 }}
                        onClick={() => setSelectedRecord(record)}
                      >
                        View details
                      </button>
                      {record.needs_review && (
                        <button
                          className="btn-primary"
                          style={{ padding: "5px 8px", fontSize: 12, marginTop: 5 }}
                          disabled={reviewingId === record.id}
                          onClick={() => markReviewed(record)}
                        >
                          {reviewingId === record.id ? "Saving..." : "Mark reviewed"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRecord && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedRecord(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15,23,42,.55)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="geo-record-title"
            className="card"
            style={{
              width: "min(620px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 id="geo-record-title" className="syne" style={{ fontSize: 20 }}>
                  {selectedRecord.name || selectedRecord.emp_id}
                </h2>
                <p style={{ color: "var(--muted)", fontSize: 12 }}>
                  {selectedRecord.emp_id} · {selectedRecord.department || "No department"}
                </p>
              </div>
              <button className="btn-ghost" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                margin: "20px 0",
              }}
            >
              {[
                ["Date", selectedRecord.date || day],
                ["Check-in", formatTime(selectedRecord.check_in)],
                ["Check-out", formatTime(selectedRecord.check_out)],
                ["Distance", distanceLabel(selectedRecord.distance_m)],
                ["GPS accuracy", accuracyLabel(selectedRecord.accuracy_m)],
                ["Status", selectedRecord.status || "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: 12, background: "var(--surface, rgba(148,163,184,.10))", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
              <button className="btn-ghost" onClick={() => openMap(selectedRecord)}>
                View location on map
              </button>
              {selectedRecord.latitude != null && selectedRecord.longitude != null && (
                <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>
                  {selectedRecord.latitude}, {selectedRecord.longitude}
                </span>
              )}
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Geotagged photos ({selectedPhotos.length})
              </div>
              {selectedPhotos.length ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {selectedPhotos.map((photo, index) => (
                    <figure key={photo.id || `${photo.url}-${index}`} style={{ margin: 0 }}>
                      <button
                        type="button"
                        onClick={() => setPreviewPhoto({
                          url: backendAssetUrl(photo.url),
                          alt: `Geotagged ${photo.punch_type?.replace("_", " ") || "attendance"} photo ${index + 1}`,
                        })}
                        aria-label={`View ${photo.punch_type?.replace("_", " ") || "attendance"} photo ${index + 1} enlarged`}
                        style={{ display: "block", width: "100%", padding: 0, border: 0, background: "transparent", cursor: "zoom-in" }}
                      >
                        <img
                          src={backendAssetUrl(photo.url)}
                          alt={`Geotagged ${photo.punch_type?.replace("_", " ") || "attendance"} photo ${index + 1}`}
                          style={{ display: "block", width: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 10, border: "1px solid var(--border)" }}
                        />
                      </button>
                      <figcaption style={{ marginTop: 6, color: "var(--muted)", fontSize: 11 }}>
                        {photo.punch_type?.replace("_", " ") || "Attendance"} photo
                        {photo.latitude != null && photo.longitude != null
                          ? ` · ${photo.latitude}, ${photo.longitude}`
                          : ""}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 28, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 10, color: "var(--muted)", fontSize: 12 }}>
                  No photo available
                </div>
              )}
            </div>

            {selectedRecord.needs_review && (
              <button
                className="btn-primary"
                style={{ marginTop: 20 }}
                disabled={reviewingId === selectedRecord.id}
                onClick={() => markReviewed(selectedRecord)}
              >
                {reviewingId === selectedRecord.id ? "Saving..." : "Mark as reviewed"}
              </button>
            )}
          </section>
        </div>
      )}

      {previewPhoto && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreviewPhoto(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "rgba(0,0,0,.88)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Enlarged geotagged photo"
            style={{
              position: "relative",
              display: "grid",
              placeItems: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setPreviewPhoto(null)}
              aria-label="Close enlarged photo"
              style={{
                position: "fixed",
                top: "max(16px, env(safe-area-inset-top))",
                right: "max(16px, env(safe-area-inset-right))",
                zIndex: 1,
                width: 42,
                height: 42,
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                color: "#fff",
                background: "rgba(30,41,59,.96)",
                border: "1px solid rgba(255,255,255,.55)",
                boxShadow: "0 2px 12px rgba(0,0,0,.55)",
              }}
            >
              <X size={20} />
            </button>
            <img
              src={previewPhoto.url}
              alt={previewPhoto.alt}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: 8,
              }}
            />
          </section>
        </div>
      )}

      {toastNode}
    </div>
  );
}
