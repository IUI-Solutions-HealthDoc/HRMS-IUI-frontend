"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Eye, Users, BarChart3, Calendar, FileText } from "lucide-react";
import AppLogo from "@/components/AppLogo";

export default function GhostLayout({ children }) {
  const router = useRouter();
  const [isGhostSession, setIsGhostSession] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if ghost session is active via cookie
    const checkGhostSession = async () => {
      try {
        const res = await fetch("/api/ghost/check-session");
        if (res.ok) {
          setIsGhostSession(true);
        } else {
          router.push("/login");
        }
      } catch (error) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkGhostSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/ghost-logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
      }}>
        <div style={{
          textAlign: "center",
          color: "var(--text-2)",
        }}>
          <div style={{ marginBottom: 16, opacity: 0.5 }}>◈</div>
          <p>Initializing ghost session...</p>
        </div>
      </div>
    );
  }

  if (!isGhostSession) {
    return null;
  }

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "linear-gradient(180deg, rgba(245,247,251,0.96) 0%, rgba(241,245,249,0.98) 100%)",
    }}>
      {/* Ghost Sidebar */}
      <div style={{
        width: 280,
        flex: "0 0 280px",
        height: "100vh",
        position: "sticky",
        top: 0,
        borderRight: "1px solid rgba(148,163,184,0.18)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 100%)",
        display: "flex",
        flexDirection: "column",
        boxShadow: "18px 0 40px rgba(15,23,42,0.05)",
        zIndex: 2,
      }}>
        {/* Logo & Branding */}
        <div style={{ padding: 20, borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <AppLogo size={32} showText={false} />
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Ghost Shell</h2>
          </div>
          <div style={{
            padding: "10px 12px",
            background: "var(--surface3)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color: "rgba(124,58,237,0.4)",
            }}>
              ◈
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                System Observer
              </div>
              <div style={{
                fontSize: 10,
                color: "rgba(71,85,105,0.6)",
                letterSpacing: "0.03em",
              }}>
                READ · WRITE · NO TRACE
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
          <NavLink href="/ghost/dashboard" icon={<Eye size={16} />} label="Overview" />
          <NavLink href="/ghost/employees" icon={<Users size={16} />} label="Employees" />
          <NavLink href="/ghost/attendance" icon={<FileText size={16} />} label="Attendance" />
          <NavLink href="/ghost/payroll" icon={<BarChart3 size={16} />} label="Payroll" />
          <NavLink href="/ghost/leave" icon={<Calendar size={16} />} label="Leave" />
        </nav>

        {/* Exit Button */}
        <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "rgba(239,68,68,0.8)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.12)";
            }}
          >
            <LogOut size={14} />
            Exit Ghost
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        minWidth: 0,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
        background: "linear-gradient(180deg, rgba(255,255,255,0.68) 0%, rgba(248,250,252,0.9) 100%)",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(14px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}>
          <div style={{ fontSize: 11, color: "var(--text-2)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            ◈ Ghost Admin Mode — Full System Visibility
          </div>
          <div style={{
            fontSize: 10,
            color: "rgba(124,58,237,0.6)",
            fontFamily: "Rajdhani, sans-serif",
            letterSpacing: "0.05em",
          }}>
            SESSION ACTIVE
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: 24,
        }}>
          <div style={{
            minHeight: "100%",
            borderRadius: 24,
            border: "1px solid rgba(226,232,240,0.95)",
            background: "rgba(255,255,255,0.94)",
            boxShadow: "0 18px 48px rgba(15,23,42,0.06)",
            padding: 28,
          }}>
            {children}
          </div>
        </div>
      </div>

      {/* Ghost Mode HUD Badge - Fixed bottom-left */}
      <div style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 13px",
        borderRadius: 999,
        background: "rgba(8, 11, 16, 0.85)",
        border: "1px solid rgba(124,58,237,0.20)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 0 16px rgba(124,58,237,0.08)",
        opacity: 0.7,
        pointerEvents: "none",
        animation: "ghostPulse 4s infinite ease-in-out",
      }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "rgba(124,58,237,0.5)",
          boxShadow: "0 0 6px rgba(124,58,237,0.4)",
          animation: "pulse 3s infinite",
        }} />
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(124,58,237,0.55)",
          fontFamily: "Rajdhani, Outfit, sans-serif",
        }}>
          GHOST MODE
        </span>
      </div>
    </div>
  );
}

function NavLink({ href, icon, label }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        gap: 12,
        textDecoration: "none",
        color: isActive ? "rgba(124,58,237,0.8)" : "var(--text-2)",
        background: isActive ? "rgba(124,58,237,0.12)" : "transparent",
        border: isActive ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
        fontSize: 14,
        fontWeight: isActive ? 600 : 500,
        transition: "all 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "rgba(124,58,237,0.06)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <span style={{ display: "flex", alignItems: "center", opacity: 0.7 }}>{icon}</span>
      {label}
    </Link>
  );
}
