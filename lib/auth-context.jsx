"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getToken, setToken, removeToken } from "@/lib/api";
import { ROLE_COLORS } from "@/lib/constants";

const AuthContext = createContext(null);
const STORAGE_KEY_USER = "hrms_user";

function saveUser(data) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data));
}
function loadUser() {
  if (typeof window !== "undefined") {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_USER)); } catch { return null; }
  }
  return null;
}
function clearUser() {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY_USER);
}

// Build the user object from a backend response (login or /auth/me).
function buildUserData(data, credentialsIdentifier) {
  const isSuperuser = data.is_superuser === true || data.role === "admin";
  const role = isSuperuser ? "admin" : (data.role || "employee");
  const fallbackIdentity = credentialsIdentifier || data.email || "";

  return {
    id:           data.id,
    username:     data.username || fallbackIdentity,
    first_name:   data.first_name || data.full_name?.split(" ")[0] || fallbackIdentity,
    last_name:    data.last_name  || data.full_name?.split(" ").slice(1).join(" ") || "",
    email:        data.email || "",
    emp_id:       data.emp_id,
    department:   data.department,
    role,
    is_superuser: isSuperuser,
    is_hr:        data.is_hr  || role === "hr"  || isSuperuser,
    is_accounts:  data.is_accounts || role === "accounts",
    is_tl:        data.is_tl || role === "tl",
    is_hod:       data.is_hod || role === "hod",
    profile_pic:  data.profile_pic,
    self_service_access: data.self_service_access || {},
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("employee");
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On mount: ALWAYS verify with backend to get fresh role data.
  // This ensures admin role is correctly detected even if cached data is stale.
  useEffect(() => {
    const restore = async () => {
      const t = getToken();
      if (!t) { setLoading(false); return; }

      // Always call /auth/me to get fresh data from backend
      try {
        const data = await apiFetch("/auth/me");
        const userData = buildUserData(data, "");
        setUser(userData);
        setRole(userData.role);
        setIsAuthed(true);
        saveUser(userData);
      } catch {
        // Token invalid/expired — clear everything
        removeToken();
        clearUser();
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (credentials) => {
    const loginData = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
      headers: { "Content-Type": "application/json" },
    });
    setToken(loginData.access_token);

    const meData = await apiFetch("/auth/me").catch(() => loginData);
    const userData = buildUserData(meData, credentials.identifier || credentials.username || "");
    setUser(userData);
    setRole(userData.role);
    setIsAuthed(true);
    saveUser(userData);

    router.push("/dashboard");
    return loginData;
  }, [router]);

  const logout = useCallback(() => {
    apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    removeToken();
    clearUser();
    setIsAuthed(false);
    setUser(null);
    setRole("employee");
    router.push("/login");
  }, [router]);

  // Called after profile update so the sidebar reflects new name immediately
  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch("/auth/me");
      const userData = buildUserData(data, user?.username || "");
      setUser(userData);
      setRole(userData.role);
      saveUser(userData);
    } catch {}
  }, [user]);

  const accent = (ROLE_COLORS[role] || ROLE_COLORS.employee).accent;

  return (
    <AuthContext.Provider value={{ user, role, isAuthed, loading, login, logout, accent, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
