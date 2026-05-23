"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, ShieldEllipsis } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import AppLogo from "@/components/AppLogo";
import Sidebar from "@/components/Sidebar";
import TopbarNotifications from "@/components/TopbarNotifications";
import Loader from "@/components/ui/Loader";

export default function DashboardLayout({ children }) {
  const { isAuthed, loading, role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthed) {
      router.replace("/login");
    }
  }, [isAuthed, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader />
      </div>
    );
  }

  if (!isAuthed) return null;

  return (
    <div className="app-container">
      {sidebarOpen ? <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} /> : null}

      <Sidebar sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <div className="dashboard-topbar">
          <div className="dashboard-topbar__leading">
            <button className="menu-trigger" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Menu size={18} />
            </button>
            <div className="dashboard-topbar__brand">
              <AppLogo compact size={40} />
            </div>
          </div>

          <div className="dashboard-topbar__actions">
            <TopbarNotifications role={role} />
            <span className="role-pill">
              <ShieldEllipsis size={14} />
              {role.toUpperCase()} PORTAL
            </span>
          </div>
        </div>

        <div className="dashboard-body">
          {children}
        </div>
      </main>
    </div>
  );
}
