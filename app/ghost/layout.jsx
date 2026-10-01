"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Eye, Users, BarChart3, Calendar, FileText, Menu, X } from "lucide-react";
import AppLogo from "@/components/AppLogo";

export default function GhostLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isGhostSession, setIsGhostSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
    <div className="ghost-layout">
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="ghost-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Ghost Sidebar Drawer */}
      <aside className={`ghost-sidebar ${sidebarOpen ? "ghost-sidebar--open" : ""}`}>
        {/* Logo & Branding */}
        <div style={{ padding: 20, borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AppLogo size={32} showText={false} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Ghost Shell</h2>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="ghost-sidebar-close"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
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
              color: "rgba(124,58,237,0.5)",
              flexShrink: 0,
            }}>
              ◈
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                System Observer
              </div>
              <div style={{
                fontSize: 10,
                color: "rgba(71,85,105,0.7)",
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                READ · WRITE · NO TRACE
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
          <NavLink href="/ghost/dashboard" icon={<Eye size={16} />} label="Overview" onClick={() => setSidebarOpen(false)} />
          <NavLink href="/ghost/employees" icon={<Users size={16} />} label="Employees" onClick={() => setSidebarOpen(false)} />
          <NavLink href="/ghost/attendance" icon={<FileText size={16} />} label="Attendance" onClick={() => setSidebarOpen(false)} />
          <NavLink href="/ghost/payroll" icon={<BarChart3 size={16} />} label="Payroll" onClick={() => setSidebarOpen(false)} />
          <NavLink href="/ghost/leave" icon={<Calendar size={16} />} label="Leave" onClick={() => setSidebarOpen(false)} />
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
              color: "rgba(239,68,68,0.85)",
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
      </aside>

      {/* Main Content Area */}
      <div className="ghost-main">
        {/* Header Topbar */}
        <header className="ghost-topbar">
          <div className="ghost-topbar-leading">
            <button
              onClick={() => setSidebarOpen(true)}
              className="ghost-menu-trigger"
              aria-label="Open Ghost navigation"
            >
              <Menu size={18} />
            </button>
            <div className="ghost-topbar-title">
              ◈ Ghost Admin Mode <span className="ghost-topbar-subtitle">— Full System Visibility</span>
            </div>
          </div>
          <div className="ghost-active-pill">
            SESSION ACTIVE
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="ghost-content-wrap">
          <div className="ghost-content-card">
            {children}
          </div>
        </main>
      </div>

      {/* Ghost Mode HUD Badge - Fixed bottom-left */}
      <div className="ghost-hud-badge" style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 13px",
        borderRadius: 999,
        background: "rgba(8, 11, 16, 0.88)",
        border: "1px solid rgba(124,58,237,0.25)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 0 16px rgba(124,58,237,0.12)",
        opacity: 0.8,
        pointerEvents: "none",
        animation: "ghostPulse 4s infinite ease-in-out",
      }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "rgba(124,58,237,0.6)",
          boxShadow: "0 0 6px rgba(124,58,237,0.5)",
          animation: "pulse 3s infinite",
        }} />
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(124,58,237,0.7)",
          fontFamily: "Rajdhani, Outfit, sans-serif",
        }}>
          GHOST MODE
        </span>
      </div>
    </div>
  );
}

function NavLink({ href, icon, label, onClick }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        gap: 12,
        textDecoration: "none",
        color: isActive ? "rgba(124,58,237,0.95)" : "var(--text-2)",
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
      <span style={{ display: "flex", alignItems: "center", opacity: 0.8 }}>{icon}</span>
      {label}
    </Link>
  );
}
