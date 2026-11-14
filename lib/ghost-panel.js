import { removeToken, setToken } from "@/lib/api";

// Which full panel a ghost session is using ("admin" | "hr" | "accounts").
// UI hint only: what the panel can do is decided by the backend token.
export const GHOST_ROLE_KEY = "hrms_ghost_role";

export const GHOST_PANEL_ROLES = [
  { role: "admin", label: "Admin" },
  { role: "hr", label: "HR" },
  { role: "accounts", label: "Accounts" },
];

export function getGhostPanelRole() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(GHOST_ROLE_KEY) || null;
  } catch {
    return null;
  }
}

export function clearGhostPanel() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GHOST_ROLE_KEY);
  } catch {}
}

// Open (or switch to) the full Admin / HR / Accounts dashboard from a ghost session.
export async function openGhostPanel(role) {
  const res = await fetch("/api/ghost/act-as", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || data.detail || "Could not open panel");
  }
  setToken(data.access_token);
  try {
    localStorage.setItem(GHOST_ROLE_KEY, role);
    localStorage.removeItem("hrms_user");
  } catch {}
  window.location.assign("/dashboard");
}

// End the ghost session, including any full panel opened from it.
export async function exitGhost() {
  await fetch("/api/ghost-logout", { method: "POST" }).catch(() => {});
  if (getGhostPanelRole()) {
    removeToken();
    try {
      localStorage.removeItem("hrms_user");
    } catch {}
  }
  clearGhostPanel();
}
