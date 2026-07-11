"use client";

import { useEffect, useRef } from "react";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";

const wsBaseUrl = () => {
  const base = axiosInstance.defaults.baseURL || "http://localhost:8080";
  return base.replace(/^http/, "ws").replace(/\/$/, "");
};

export function useProjectWebSocket() {
  const { user, selectedProject } = useAuth();
  const deliveredEventIds = useRef<Set<string>>(new Set());
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(1000);

  useEffect(() => {
    if (!user?.id || !selectedProject?.id || typeof window === "undefined") return;

    let socket: WebSocket | null = null;
    let closedByCleanup = false;

    const connect = () => {
      const url = `${wsBaseUrl()}/ws/collaboration?userId=${encodeURIComponent(user.id)}&projectId=${encodeURIComponent(selectedProject.id)}`;
      socket = new WebSocket(url);

      socket.onopen = () => {
        retryDelay.current = 1000;
      };

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data);
          if (!event?.type || event.type === "CONNECTED") return;
          if (event.eventId) {
            if (deliveredEventIds.current.has(event.eventId)) return;
            deliveredEventIds.current.add(event.eventId);
            if (deliveredEventIds.current.size > 300) {
              deliveredEventIds.current = new Set(Array.from(deliveredEventIds.current).slice(-200));
            }
          }

          window.dispatchEvent(new CustomEvent("collaboration:event", { detail: event }));

          if (event.type === "ACTIVE_USERS") {
            window.dispatchEvent(new CustomEvent("project:active-users", { detail: event.payload?.userIds || [] }));
          }

          if (["TASK_CREATED", "TASK_UPDATED", "TASK_STATUS_CHANGED"].includes(event.type)) {
            window.dispatchEvent(new CustomEvent("issues:changed", {
              detail: { projectId: event.projectId, issue: event.payload?.issue },
            }));
          }

          if (event.type === "COMMENT_ADDED") {
            window.dispatchEvent(new CustomEvent("comments:changed", { detail: event.payload }));
          }

          if (event.type === "NOTIFICATION_CREATED") {
            window.dispatchEvent(new CustomEvent("notifications:changed", { detail: event.payload?.notification }));
          }
        } catch (error) {
          console.error("Unable to parse collaboration event", error);
        }
      };

      socket.onclose = () => {
        if (closedByCleanup) return;
        retryTimer.current = setTimeout(connect, retryDelay.current);
        retryDelay.current = Math.min(retryDelay.current * 2, 10000);
      };
    };

    connect();

    return () => {
      closedByCleanup = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      socket?.close();
    };
  }, [user?.id, selectedProject?.id]);
}
