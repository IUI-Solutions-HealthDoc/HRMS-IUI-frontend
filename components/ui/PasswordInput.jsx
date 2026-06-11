"use client";

import { useState, useEffect } from "react";

/**
 * Password input with eye icon toggle for show/hide.
 * Drop-in replacement for <input type="password" ... />.
 * Uses type="text" with WebkitTextSecurity to prevent Chrome autofill.
 */
export default function PasswordInput({ className = "input", style, ...props }) {
  const [visible, setVisible] = useState(false);
  const [isFirefox, setIsFirefox] = useState(false);

  useEffect(() => {
    setIsFirefox(navigator.userAgent.toLowerCase().includes("firefox"));
  }, []);

  const { inputStyle, autoComplete, name, ...inputProps } = props;

  // ONLY allow standard password type for current-password (login screen)
  const isCurrentPassword = autoComplete === "current-password";

  const inputType = isCurrentPassword
    ? (visible ? "text" : "password")
    : (isFirefox ? (visible ? "text" : "password") : "text");

  const textSecurity = (isCurrentPassword || isFirefox)
    ? undefined
    : (visible ? "none" : "disc");

  return (
    <div style={{ position: "relative", ...style }}>
      <input
        {...inputProps}
        autoComplete={autoComplete ?? "new-password"}
        name={name ?? "password_no_autofill"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={className}
        type={inputType}
        style={{
          paddingRight: 42,
          width: "100%",
          WebkitTextSecurity: textSecurity,
          ...(inputStyle || {})
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          fontSize: 18,
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
      >
        {visible ? (
          /* Eye-off icon (hide) */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          /* Eye icon (show) */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
