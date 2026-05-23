"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

import { apiFetch } from "@/lib/api";

export default function TopbarNotifications({ role }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef(null);

  async function loadNotifications() {
    try {
      const data = await apiFetch("/notifications");
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(Number(data?.unread_count || 0));
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (role === "accounts") return undefined;
    loadNotifications();
    const timer = setInterval(loadNotifications, 45000);
    return () => clearInterval(timer);
  }, [role]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function markRead(notification) {
    if (typeof notification?.id !== "number") return;
    try {
      await apiFetch(`/notifications/${notification.id}/read`, { method: "POST" });
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item))
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch {}
  }

  async function markAllRead() {
    try {
      await apiFetch("/notifications/read-all", { method: "POST" });
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {}
  }

  if (role === "accounts") return null;

  return (
    <div className="topbar-notifications" ref={rootRef}>
      <button
        type="button"
        className="notification-trigger"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) loadNotifications();
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="notification-panel">
          <div className="notification-panel__header">
            <div>
              <div className="notification-panel__title">Notifications</div>
              <div className="notification-panel__subtitle">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </div>
            </div>
            <button
              type="button"
              className="notification-mark-all"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck size={15} />
              Mark all read
            </button>
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">No notifications yet.</div>
            ) : (
              notifications.map((item) => (
                <button
                  key={String(item.id)}
                  type="button"
                  className={`notification-item${item.is_read ? " is-read" : ""}`}
                  onClick={() => markRead(item)}
                >
                  <span className="notification-item__dot" style={{ background: item.is_read ? "var(--border)" : "var(--accent)" }} />
                  <span className="notification-item__content">
                    <span className="notification-item__message">{item.message}</span>
                    <span className="notification-item__time">{item.time || "Now"}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
