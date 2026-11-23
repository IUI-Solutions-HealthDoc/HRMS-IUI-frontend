"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, apiUrl, getToken } from "@/lib/api";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;
const STATUS_TEXT = {
  missing: { label: "Not uploaded", color: "#b45309" },
  pending_review: { label: "Uploaded, waiting for HR review", color: "#b45309" },
  approved: { label: "Uploaded and verified", color: "#047857" },
};

/**
 * Bank account proof (passbook front page or cancelled cheque) for one employee.
 * Stored in the employee's document vault under the "passbook" slot, so it also
 * shows up on the Documents page and in the Accounts passbook audit.
 */
export default function BankProofField({ empId, canUpload = false, showToast, onChanged }) {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    if (!empId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/documents/${empId}`);
      setMeta(data?.docs?.passbook || null);
    } catch {
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [empId]);

  useEffect(() => { load(); }, [load]);

  async function upload(file) {
    if (!file) return;
    const name = (file.name || "").toLowerCase();
    if (!/\.(pdf|jpe?g|png|webp)$/.test(name)) {
      showToast?.("Upload a PDF (or a JPG/PNG photo) of the passbook front page or cancelled cheque", "error");
      return;
    }
    if (file.size > MAX_BYTES) {
      showToast?.("File must be 10 MB or smaller", "error");
      return;
    }
    const body = new FormData();
    body.append("file", file);
    setBusy(true);
    try {
      const res = await apiFetch(`/documents/${empId}/upload/passbook`, { method: "POST", body, headers: {} });
      showToast?.(res?.message || "Bank proof uploaded");
      await load();
      onChanged?.();
    } catch (error) {
      showToast?.(error.message, "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function view() {
    if (!meta?.url) return;
    const preview = window.open("", "_blank");
    try {
      const clean = String(meta.url).replace(/^\/api\/proxy/, "");
      const res = await apiFetch(`${clean}${clean.includes("?") ? "&" : "?"}as_url=1`).catch(() => null);
      if (res?.url && /^https?:/i.test(res.url)) {
        if (preview) { try { preview.opener = null; } catch {} preview.location.replace(res.url); }
        else window.open(res.url, "_blank", "noopener");
        return;
      }
      const token = getToken();
      const response = await fetch(apiUrl(clean), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error("Unable to open the bank proof");
      const objectUrl = URL.createObjectURL(await response.blob());
      if (preview) preview.location.replace(objectUrl); else window.open(objectUrl, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      if (preview && !preview.closed) preview.close();
      showToast?.(error.message, "error");
    }
  }

  const status = STATUS_TEXT[meta?.status || "missing"] || STATUS_TEXT.missing;

  return (
    <div style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div>
          <div className="label" style={{ marginBottom: 2 }}>Account proof (passbook front page or cancelled cheque)</div>
          <div style={{ fontSize: 12, color: loading ? "var(--muted)" : status.color }}>
            {loading ? "Checking…" : meta?.has_file ? `${status.label}${meta.file_name ? ` · ${meta.file_name}` : ""}` : status.label}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {meta?.has_file ? (
            <button type="button" className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={view}>View</button>
          ) : null}
          {canUpload ? (
            <button type="button" className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? "Uploading…" : meta?.has_file ? "Replace" : "Upload PDF"}
            </button>
          ) : null}
        </div>
      </div>
      {canUpload ? (
        <>
          <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: "none" }} onChange={(e) => upload(e.target.files?.[0])} />
          <div style={{ fontSize: 11, color: "var(--muted)" }}>PDF preferred; JPG/PNG photos are accepted too. Max 10 MB. Uploads are saved straight away.</div>
        </>
      ) : null}
    </div>
  );
}
