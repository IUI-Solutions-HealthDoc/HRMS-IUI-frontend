"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeIndianRupee,
  BellRing,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CalendarClock,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  DoorOpen,
  FileSpreadsheet,
  Fingerprint,
  FolderKanban,
  FolderLock,
  LayoutDashboard,
  Logs,
  X,
  MessagesSquare,
  Settings2,
  ShieldCheck,
  Star,
  SunMedium,
  TrendingUp,
  UserCog,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { GHOST_PANEL_ROLES, openGhostPanel } from "@/lib/ghost-panel";
import { NAV_ITEMS } from "@/lib/constants";
import { backendAssetUrl } from "@/lib/api";
import AppLogo from "@/components/AppLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";

const ICON_MAP = {
  dashboard: LayoutDashboard,
  attendance_hr: CalendarClock,
  attendance: Clock3,
  my_leaves: CalendarCheck2,
  leaves: CalendarCheck2,
  leave_approvals: ClipboardCheck,
  staff: Users,
  biometric_requests: Fingerprint,
  departments: Building2,
  attendance_settings: Settings2,
  documents: FolderLock,
  performance: TrendingUp,
  sunday_work: SunMedium,
  resignations: DoorOpen,
  resignation: DoorOpen,
  tasks_hr: ClipboardList,
  mis: FileSpreadsheet,
  tasks: ClipboardList,
  tasks_assign: FolderKanban,
  tasks_review: Logs,
  grievances_hr: MessagesSquare,
  grievance: MessagesSquare,
  notices: BellRing,
  payslip: WalletCards,
  exports: FileSpreadsheet,
  bgv: ShieldCheck,
  policies: BookOpenText,
  profile: UserRound,
  payroll: BadgeIndianRupee,
  feedback: MessagesSquare,
  holidays: CalendarRange,
  approvals: ClipboardCheck,
  increments: BriefcaseBusiness,
  peer_ratings: Star,
  comp_off: SunMedium,
  appraisal: TrendingUp,
  team_setup: Settings2,
};

const GHOST_HIDDEN_ITEMS = new Set([]); // ghost sees the panel exactly as that role does

export default function Sidebar({ sidebarOpen, onClose }) {
  const { role, user, logout } = useAuth();
  const pathname = usePathname();

  const [switchingTo, setSwitchingTo] = useState("");
  const [switchErr, setSwitchErr] = useState("");
  const isGhost = Boolean(user?.is_ghost);

  const switchPanel = async (nextRole) => {
    if (nextRole === role || switchingTo) return;
    setSwitchingTo(nextRole);
    setSwitchErr("");
    try {
      await openGhostPanel(nextRole);
    } catch (error) {
      setSwitchErr(error.message || "Could not switch panel");
      setSwitchingTo("");
    }
  };

  const items = (NAV_ITEMS[role] || NAV_ITEMS.employee).filter((item) => {
    // Ghost works on everyone's data, not the borrowed account's own pages.
    if (isGhost && GHOST_HIDDEN_ITEMS.has(item.id)) return false;
    if (item.id === "payslip") {
      return user?.self_service_access?.can_view_my_payslip !== false;
    }
    if (item.id === "feedback") {
      return false;
    }
    return true;
  });

  const isActive = (item) => {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="sidebar-brand">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <AppLogo compact size={46} subtitle={`${role?.toUpperCase()} PORTAL`} />
          <button className="sidebar-close" onClick={onClose} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-user">
          {user?.profile_pic ? (
            <div className="sidebar-user__avatar sidebar-user__avatar--image">
              <img src={backendAssetUrl(user.profile_pic)} alt={user?.first_name || "Profile"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div className="sidebar-user__avatar">
              {(user?.first_name || user?.username || "?")[0].toUpperCase()}
            </div>
          )}
          <div style={{ overflow: "hidden" }}>
            <div className="sidebar-user__name">{[user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username}</div>
            <div className="sidebar-user__meta">{user?.emp_id || ""}</div>
          </div>
        </div>
      </div>

      {isGhost ? (
        <div className="ghost-switch">
          <div className="ghost-switch__label">◈ Ghost · open panel as</div>
          <div className="ghost-switch__roles">
            {GHOST_PANEL_ROLES.map((panel) => (
              <button
                key={panel.role}
                type="button"
                className={`ghost-switch__btn ${role === panel.role ? "active" : ""}`}
                disabled={Boolean(switchingTo)}
                onClick={() => switchPanel(panel.role)}
              >
                {switchingTo === panel.role ? "…" : panel.label}
              </button>
            ))}
          </div>
          <Link href="/ghost/dashboard" className="ghost-switch__tools" onClick={onClose}>
            ◈ Ghost tools (silent edits)
          </Link>
          {switchErr ? <div className="ghost-switch__err">{switchErr}</div> : null}
        </div>
      ) : null}

      <nav className="sidebar-nav">
        {items.map((item) => {
          const Icon = ICON_MAP[item.id] || UserCog;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-item ${isActive(item) ? "active" : ""}`}
              onClick={onClose}
            >
              <span className="nav-item__icon">
                <Icon size={18} strokeWidth={2.1} />
              </span>
              <span className="nav-item__label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <ThemeToggle />
        <button className="btn-danger" onClick={logout} style={{ width: "100%", justifyContent: "center" }}>
          <DoorOpen size={16} />
          {isGhost ? "Exit Ghost" : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
