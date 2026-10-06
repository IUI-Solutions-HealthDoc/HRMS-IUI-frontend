"use client";

import { useState } from "react";
import { apiFetch, getToken } from "@/lib/api";
import Modal from "@/components/ui/Modal";

// Admin / HR: download the import template and bulk-add employees from it.
export default function EmployeeBulkImport({ onDone, showToast }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [validated, setValidated] = useState(false);

  async function downloadTemplate() {
    try {
      const token = getToken();
      const res = await fetch("/api/proxy/employees/import-template", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Template download failed");
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "employee_import_template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast(error.message || "Template download failed", "error");
    }
  }

  function reset() {
    setOpen(false);
    setFile(null);
    setResult(null);
    setValidated(false);
  }

  async function run(dryRun) {
    if (!file) {
      showToast("Choose the filled .xlsx template first", "error");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await apiFetch(`/employees/bulk-import?dry_run=${dryRun ? "true" : "false"}`, { method: "POST", body });
      setResult(res);
      if (dryRun) {
        setValidated(Boolean(res.success));
        if (res.success) showToast(`File is valid: ${res.total} employee(s) ready to import`);
      } else if (res.created > 0) {
        showToast(`${res.created} employee(s) added`);
        await onDone?.();
        if (res.success) reset();
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn-ghost" onClick={downloadTemplate}>⬇ Import Template</button>
      <button className="btn-ghost" onClick={() => setOpen(true)}>⬆ Bulk Add Employees</button>
      {open ? (
        <Modal
          title="Bulk Add Employees"
          onClose={reset}
          footer={
            <>
              <button className="btn-ghost" onClick={reset} disabled={busy}>Close</button>
              <button className="btn-ghost" onClick={() => run(true)} disabled={busy || !file}>{busy ? "Working..." : "Validate"}</button>
              <button className="btn-primary" onClick={() => run(false)} disabled={busy || !file || !validated}>Import</button>
            </>
          }
        >
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
            Download the template, fill it from row 2 (columns marked Required must be filled), then upload it here.
            Click Validate first; Import is enabled once the whole file passes.
          </p>
          <input
            className="input"
            type="file"
            accept=".xlsx"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); setValidated(false); }}
          />
          {result && result.errors?.length ? (
            <div className="table-wrap" style={{ marginTop: 12, maxHeight: 260, overflowY: "auto" }}>
              <table>
                <thead><tr><th>Row</th><th>Field</th><th>Problem</th></tr></thead>
                <tbody>
                  {result.errors.map((err, i) => (
                    <tr key={i}><td>{err.row}</td><td>{err.field || "—"}</td><td>{err.message}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {result && result.success && validated ? (
            <div style={{ marginTop: 12, fontSize: 13 }}>✓ {result.total} employee(s) validated. Click Import to add them.</div>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
