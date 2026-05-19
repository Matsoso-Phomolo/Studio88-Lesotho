import React, { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";

import { api } from "../api/api";

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  async function loadNotifications() {
    if (!user) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [user?.role, user?.store_id]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  async function markRead(notificationId) {
    try {
      await api.markNotificationRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="relative ml-auto">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-xl border border-white/10 bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-white/10 bg-neutral-950 p-3 text-white shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <span className="text-xs text-neutral-400">{unreadCount} unread</span>
          </div>
          <div className="grid max-h-96 gap-2 overflow-auto">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => markRead(notification.id)}
                className={`rounded-xl border p-3 text-left ${
                  notification.is_read
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold">{notification.title}</div>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-neutral-300">
                    {notification.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-300">{notification.message}</p>
              </button>
            ))}
            {notifications.length === 0 && (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-neutral-400">
                No notifications yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
