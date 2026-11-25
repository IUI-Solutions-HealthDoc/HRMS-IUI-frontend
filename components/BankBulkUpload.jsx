"use client";

import { useState } from "react";
import { apiFetch, getToken, apiUrl } from "@/lib/api";
import Modal from "@/components/ui/Modal";

// HR / Accounts / Admin: fill bank details for many employees from one sheet.
// Blank cells keep what is already saved, so HR and Accounts can each fill part of it.
export default function BankBulkUpload({ onDone, showToast }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function downloadSheet() {
    try {
      const token = getToken();
      const res = await fetch(apiUrl("/payroll/bank-details/template"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "bank_details.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast(error.message || "Download failed", "error");
    }
  }

  async function upload() {
    if (!file) {
      showToast("Choose the filled .xlsx sheet first", "error");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await apiFetch("/payroll/bank-details/import", { method: "POST", body });
      setResult(res);
      showToast(res.message || "Bank details uploaded", res.errors?.length ? "warn" : "success");
      await onDone?.();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setFile(null);
    setResult(null);
  }

  return (
    <>
      <button className="btn-ghost" type="button" onClick={() => setOpen(true)}>🏦 Bulk bank details</button>
      {open ? (
        <Modal
          title="Bulk bank details"
          onClose={close}
          footer={
            <>
              <button className="btn-ghost" onClick={close}>Close</button>
              <button className="btn-primary" disabled={!file || busy} onClick={upload}>{busy ? "Uploading..." : "Upload"}</button>
            </>
          }
        >
          <ol style={{ margin: "0 0 14px 18px", padding: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
            <li>Download the sheet. It lists every active employee with the bank details saved now.</li>
            <li>Fill or correct the columns. Leave a cell blank to keep what is saved.</li>
            <li>Upload it. Empty fields are filled at once. Changes to a saved value go for review like a normal edit.</li>
          </ol>
          <button className="btn-ghost" type="button" onClick={downloadSheet} style={{ marginBottom: 14 }}>⬇ Download sheet</button>
          <div className="form-group">
            <label className="label">Filled sheet (.xlsx)</label>
            <input className="input" type="file" accept=".xlsx" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }} />
          </div>
          {result ? (
            <div className="card" style={{ padding: 12, fontSize: 13 }}>
              <div style={{ fontWeight: 600, marginBottom: result.errors?.length ? 8 : 0 }}>{result.message}</div>
              {result.errors?.length ? (
                <div style={{ maxHeight: 180, overflow: "auto", color: "#dc2626" }}>
                  {result.errors.map((err, i) => (
                    <div key={i}>Row {err.row} ({err.emp_id}): {err.message}</div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
