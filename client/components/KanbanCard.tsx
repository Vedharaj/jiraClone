"use client";

import React, { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import axiosInstance from "@/lib/Axiosinstance";
import { AlertTriangle, GitBranch, Link2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Issue } from "@/types/issues";

const apiBaseUrl =
  axiosInstance.defaults.baseURL?.replace(/\/$/, "") || "http://localhost:8080";

const resolveImageUrl = (url?: string) => {
  if (!url) return "/placeholder.svg";
  if (url.startsWith("http")) return url;
  return `${apiBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
};


interface KanbanCardProps {
  issue: Issue;
  blockers?: Issue[];
  subtasks?: Issue[];
  isOverlay?: boolean;
  onClick?: () => void;
  onStart?: (issue: Issue) => void;
  onDelete?: (issue: Issue) => void;
}

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-green-100 text-green-800",
};

const issueTypeColors: Record<string, string> = {
  BUG: "bg-red-500",
  TASK: "bg-blue-500",
  STORY: "bg-purple-500",
};

const KanbanCard = ({ issue, blockers = [], subtasks = [], isOverlay = false, onClick, onStart, onDelete }: KanbanCardProps) => {
  const [assignee, setAssignee] = useState<any>(null);

  // ❗ useSortable ONLY for real cards, not overlay
  const sortable = !isOverlay
    ? useSortable({ id: issue.id })
    : null;

  const style = sortable
    ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.4 : 1,
      }
    : undefined;
  const incompleteBlockers = blockers.filter((task) => task.status !== "DONE");
  const isBlocked = incompleteBlockers.length > 0;
  const blockerNames = incompleteBlockers.map((task) => `${task.key || task.id}: ${task.title}`).join("\n");
  const completedSubtasks = subtasks.filter((task) => task.status === "DONE").length;
  const subtaskProgress = subtasks.length ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  /* =====================
     Fetch assignee by ID
  ===================== */
  useEffect(() => {
    if (!issue?.assigneeId || isOverlay) return;

    const fetchAssignee = async () => {
      try {
        const res = await axiosInstance.get(
          `/api/users/${issue.assigneeId}`,
        );
        setAssignee(res.data);
      } catch (err) {
        console.error("Failed to load assignee", err);
      }
    };

    fetchAssignee();
  }, [issue?.assigneeId, isOverlay]);

  return (
    <div
      ref={sortable?.setNodeRef}
      style={style}
      {...sortable?.attributes}
      {...sortable?.listeners}
      onClick={(e) => {
        e.stopPropagation(); // prevents drag-click conflict
        onClick?.();
      }}
      className={`group rounded border bg-white p-3 shadow-sm transition-colors ${
        isOverlay
          ? "shadow-lg border-[#0052CC]"
          : "hover:bg-[#F4F5F7] cursor-pointer"
      }`}
    >
      {/* Title */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-[#172B4D] leading-tight flex-1">
          {issue.title}
        </p>
        {!isOverlay && (
          <Button
            size="icon"
            variant="ghost"
            title="Delete issue"
            className="h-6 w-6 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.(issue);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {/* {issue.isSubtask && issue.parentTitle && (
        <p className="text-[11px] text-[#626F86] mb-2">Parent: {issue.parentTitle}</p>
      )} */}

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {issue.isSubtask && (
          <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-1 text-[10px] font-semibold text-purple-700">
            <GitBranch className="h-3 w-3" /> {issue.parentTitle}
          </span>
        )}
        {isBlocked && (
          <span
            title={`Blocked by:\n${blockerNames}`}
            className="inline-flex cursor-help items-center gap-1 rounded bg-amber-50 px-1.5 py-1 text-[10px] font-semibold text-amber-800"
          >
            <Link2 className="h-3 w-3" /> Blocked by {incompleteBlockers.length}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`h-4 w-4 rounded ${issueTypeColors[issue.type || "TASK"] || issueTypeColors.TASK}`}
          />
          <span className="text-[11px] font-bold text-[#5E6C84]">
            {issue.key}
          </span>
        </div>

        <Badge className={`text-xs ${priorityColors[issue.priority || "MEDIUM"] || priorityColors.MEDIUM}`}>
          {issue.priority || "MEDIUM"}
        </Badge>
      </div>

      {subtasks.length > 0 && (
        <div className="mb-3" title={`${completedSubtasks} of ${subtasks.length} subtasks completed`}>
          <div className="mb-1 flex items-center justify-between text-[10px] text-[#626F86]"><span>Subtasks</span><span className="font-semibold">{completedSubtasks}/{subtasks.length}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#DFE1E6]"><div className="h-full rounded-full bg-[#22A06B]" style={{ width: `${subtaskProgress}%` }} /></div>
        </div>
      )}

      {/* Assignee */}
      {assignee && (
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={resolveImageUrl(assignee.avatar)} />
            <AvatarFallback>
              {assignee.name?.[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] text-[#626F86]">
            {assignee.name}
          </span>
        </div>
      )}

      {issue.status === "TODO" && !isOverlay && (
        <Button
          size="sm"
          variant="outline"
          disabled={isBlocked}
          title={isBlocked ? `Complete these tasks first:\n${blockerNames}` : "Move to In Progress"}
          className="mt-3 h-7 w-full text-xs"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onStart?.(issue);
          }}
        >
          {isBlocked && <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />}
          {isBlocked ? "Blocked" : "Start progress"}
        </Button>
      )}
    </div>
  );
};

export default KanbanCard;
