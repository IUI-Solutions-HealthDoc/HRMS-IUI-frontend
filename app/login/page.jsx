"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import AppLogo from "@/components/AppLogo";
import PasswordInput from "@/components/ui/PasswordInput";

export default function LoginPage() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ghostMode, setGhostMode] = useState(false);
  const [ghostPassphrase, setGhostPassphrase] = useState("");
  const [ghostLoading, setGhostLoading] = useState(false);
  const [ghostAttempts, setGhostAttempts] = useState(0);
  const [ghostErr, setGhostErr] = useState("");
  const [clickCount, setClickCount] = useState(0);
  const clickTimer = useRef(null);
  const router = useRouter();
  const { login } = useAuth();

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (err) {
      const timer = setTimeout(() => setErr(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [err]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (isLocked) {
      setErr("Account locked due to 5 failed login attempts. Please try again after 5 minutes.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await login(form);
      setFailedAttempts(0);
    } catch (e) {
      setErr(e.message || "Invalid username or password");
      const nextCount = failedAttempts + 1;
      setFailedAttempts(nextCount);
      if (nextCount >= 5) {
        setIsLocked(true);
        setErr("Account temporarily locked due to 5 failed attempts. Please try again in 5 minutes.");
        setTimeout(() => {
          setIsLocked(false);
          setFailedAttempts(0);
        }, 5 * 60 * 1000);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleLogoClick = () => {
    setClickCount(prev => {
      const next = prev + 1;
      clearTimeout(clickTimer.current);
      if (next >= 3) {
        setGhostMode(true);
        setGhostErr("");
        return 0;
      }
      clickTimer.current = setTimeout(() => setClickCount(0), 1500);
      return next;
    });
  };

  async function handleGhostLogin() {
    if (!ghostPassphrase) return;
    setGhostLoading(true);
    setGhostErr("");
    try {
      const res = await fetch("/api/ghost-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase: ghostPassphrase }),
      });
      if (res.ok) {
        router.push("/ghost/dashboard");
      } else {
        const payload = await res.json().catch(() => ({}));
        setGhostErr(payload.error || "Invalid passphrase");
        const next = ghostAttempts + 1;
        if (next >= 3) {
          setGhostMode(false);
          setGhostAttempts(0);
          setGhostErr("");
        } else {
          setGhostAttempts(next);
        }
        setGhostPassphrase("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setGhostLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--login-bg)", padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div
          className="slide-up"
          style={{
            padding: 1,
            borderRadius: 16,
            background: "linear-gradient(135deg, rgba(124,58,237,0.5) 0%, rgba(6,182,212,0.4) 100%)",
            boxShadow: "0 0 40px rgba(124,58,237,0.2), 0 0 80px rgba(6,182,212,0.1)",
          }}
        >
          <div
            className="card"
            style={{
              padding: "48px 40px",
              background: "var(--login-card)",
              borderRadius: 15,
              border: "none",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                <div
                  onClick={handleLogoClick}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  <AppLogo size={62} showText={false} />
                </div>
              </div>
              <h1 className="syne" style={{ fontSize: 30, fontWeight: 800, color: "var(--text)" }}>IUI Solutions</h1>
              <p style={{ color: "var(--text-2)", fontSize: 13, marginTop: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Enterprise HR Mission Control</p>
            </div>

            <form onSubmit={handleSubmit}>
              {err && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.18)",
                    border: "1px solid #ef4444",
                    borderRadius: 10,
                    padding: "12px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#f87171",
                    marginBottom: 20,
                    textAlign: "center",
                    boxShadow: "0 0 20px rgba(239,68,68,0.25)"
                  }}
                >
                  ⚠️ {err}
                </div>
              )}
              <div className="form-group">
                <label className="label">Username or Email</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-2)", pointerEvents: "none" }}><UserRound size={16} /></span>
                  <input
                    className="input" placeholder="Enter username or email" value={form.identifier}
                    onChange={(e) => setForm((f) => ({ ...f, identifier: e.target.value }))}
                    autoComplete="username"
                    name="username"
                    style={{ paddingLeft: 40 }}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Password</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-2)", pointerEvents: "none", zIndex: "var(--z-layer-base)" }}><LockKeyhole size={16} /></span>
                  <PasswordInput
                    placeholder="••••••••" value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="current-password"
                    name="password"
                    inputStyle={{ paddingLeft: 40 }}
                    required
                  />
                </div>
                <div style={{ marginTop: 8, textAlign: "right" }}>
                  <Link
                    href="/reset-password"
                    style={{ color: "var(--accent-2)", fontSize: 13, fontWeight: 600, textDecoration: "none", letterSpacing: "0.02em" }}
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                className="btn-primary" type="submit" disabled={loading}
                style={{ width: "100%", justifyContent: "center", padding: "14px 20px", fontSize: 15, marginTop: 4 }}
              >
                {loading ? "Signing in…" : <><span>Sign In</span><ArrowRight size={16} /></>}
              </button>
            </form>

            {/* Ghost Admin Access Panel */}
            {ghostMode && (
              <div style={{
                marginTop: 16,
                padding: "18px 20px",
                borderRadius: 12,
                background: "rgba(124,58,237,0.04)",
                border: "1px solid rgba(124,58,237,0.18)",
                boxShadow: "0 0 24px rgba(124,58,237,0.08)",
                animation: "slideUp 0.22s cubic-bezier(0.16,1,0.3,1)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 14, opacity: 0.5 }}>◈</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "rgba(124,58,237,0.6)",
                    fontFamily: "Rajdhani, Outfit, sans-serif",
                  }}>
                    SYSTEM ACCESS
                  </span>
                </div>
                <input
                  type="password"
                  placeholder="System passphrase"
                  autoComplete="off"
                  autoFocus
                  value={ghostPassphrase}
                  onChange={(e) => setGhostPassphrase(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGhostLogin()}
                  className="input"
                  style={{ marginBottom: 10 }}
                />
                {ghostErr ? (
                  <div
                    style={{
                      marginBottom: 10,
                      fontSize: 12,
                      color: "#fca5a5",
                    }}
                  >
                    {ghostErr}
                  </div>
                ) : null}
                <button
                  type="button"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    background: "rgba(124,58,237,0.12)",
                    border: "1px solid rgba(124,58,237,0.25)",
                    color: "rgba(124,58,237,0.8)",
                    padding: "10px 16px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    transition: "all 0.15s",
                  }}
                  onClick={handleGhostLogin}
                  disabled={ghostLoading}
                >
                  {ghostLoading ? "Accessing…" : "Enter"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
