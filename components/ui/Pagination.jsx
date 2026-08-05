"use client";

import React from "react";

export default function Pagination({ currentPage = 1, totalItems = 0, pageSize = 10, onPageChange }) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      style={{
        display: "flex",
        justify: "space-between",
        alignItems: "center",
        marginTop: 18,
        paddingTop: 14,
        borderTop: "1px solid var(--border)",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13, color: "var(--muted)" }}>
        Showing <strong style={{ color: "var(--text)" }}>{startIdx}</strong> to <strong style={{ color: "var(--text)" }}>{endIdx}</strong> of <strong style={{ color: "var(--text)" }}>{totalItems}</strong> entries
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          type="button"
          className="btn-ghost"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{ padding: "6px 14px", fontSize: 13, cursor: currentPage <= 1 ? "not-allowed" : "pointer" }}
        >
          ← Previous
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, padding: "0 8px", color: "var(--text)" }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          className="btn-ghost"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{ padding: "6px 14px", fontSize: 13, cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
