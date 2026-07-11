"use client";

import React, { useEffect, useState, useRef } from "react";
import { Bell, Check, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { NotificationItem } from "@/types/issues";
import { cn } from "@/lib/utils";

const NotificationBell = () => {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const refreshNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [countRes, listRes] = await Promise.all([
        axiosInstance.get(`/api/notifications/assignee/${user.id}/unread-count`),
        axiosInstance.get(`/api/notifications/assignee/${user.id}`),
      ]);
      setUnreadCount(countRes.data?.unreadCount ?? 0);
      setNotifications(listRes.data || []);
    } catch (error) {
      console.error("Unable to refresh notifications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshNotifications();
  }, [user]);

  useEffect(() => {
    const handler = () => refreshNotifications();
    window.addEventListener("notifications:changed", handler);
    return () => window.removeEventListener("notifications:changed", handler);
  }, [user]);

  const handleToggle = async () => {
    if (!user) return;
    setShowDropdown((prev) => !prev);
    if (!showDropdown) {
      await refreshNotifications();
    }
  };

  const markAsRead = async (id: string) => {
    await axiosInstance.put(`/api/notifications/${id}/read`);
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, status: "READ", readAt: new Date().toISOString() } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const markAsUnread = async (id: string) => {
    await axiosInstance.put(`/api/notifications/${id}/unread`);
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, status: "UNREAD", readAt: undefined } : item));
    setUnreadCount((count) => count + 1);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await axiosInstance.put(`/api/notifications/assignee/${user.id}/read-all`);
    setNotifications((current) => current.map((item) => ({ ...item, status: "READ", readAt: item.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  };

  return (
    <div ref={bellRef}>
      <Button
        variant="ghost"
        className="relative h-10 w-10 rounded-full"
        onClick={handleToggle}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 rounded-full bg-red-600 text-white px-1.5 py-0.5 text-[10px]">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {showDropdown && (
        <div className="absolute left-4 z-50 mt-4 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Notifications</p>
              {unreadCount > 0 && <button type="button" className="flex items-center gap-1 text-xs font-medium text-[#0C66E4] hover:underline" onClick={markAllAsRead}><Check className="h-3.5 w-3.5" />Mark all read</button>}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-slate-500">Loading notifications…</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "border-b px-4 py-3 last:border-b-0",
                    notification.status === "UNREAD" ? "bg-slate-50" : "bg-white",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-slate-900">{notification.title}</p>{notification.status === "UNREAD" && <span className="h-2 w-2 shrink-0 rounded-full bg-[#0C66E4]" />}</div>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p>
                      <div className="mt-2 flex items-center justify-between gap-2"><p className="text-[11px] text-slate-400">{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : "Recently"}</p>{notification.status === "UNREAD" ? <button className="text-xs font-medium text-[#0C66E4] hover:underline" onClick={() => markAsRead(notification.id)}>Mark as read</button> : <button className="text-xs font-medium text-[#0C66E4] hover:underline" onClick={() => markAsUnread(notification.id)}>Mark unread</button>}</div></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
