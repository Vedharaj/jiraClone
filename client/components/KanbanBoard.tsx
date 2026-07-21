"use client";

import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import KanbanColumn from "./KanbanColumn";
import { createPortal } from "react-dom";
import KanbanCard from "./KanbanCard";
import IssueModel from "./IssueModel";
import EditIssueModel from "./EditIssueModel";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { Issue } from "@/types/issues";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

import { useToast } from "@/lib/ToastContext";
import { PageSkeleton } from "@/components/ui/loader-components";

import { pageCache } from "@/lib/pageCache";

const STATUS_COLUMNS = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE", title: "Done" },
];

const KanbanBoard = () => {
  const { user, selectedProject } = useAuth();
  const searchParams = useSearchParams();
  const toast = useToast();

  const isMember = React.useMemo(() => {
    if (!selectedProject || !user) return false;
    return selectedProject.ownerId === user.id || selectedProject.memberIds?.includes(user.id);
  }, [selectedProject, user]);
  const searchQuery = searchParams.get("search")?.toLowerCase() || "";

  const cacheKeyIssues = `board_issues_${selectedProject?.id || ""}`;
  const cacheKeySprints = `board_sprints_${selectedProject?.id || ""}`;

  const [issues, setIssues] = useState<Issue[]>(() => {
    if (typeof window !== "undefined" && selectedProject?.id) {
      return pageCache.get(cacheKeyIssues) || [];
    }
    return [];
  });
  const [sprints, setSprints] = useState<any[]>(() => {
    if (typeof window !== "undefined" && selectedProject?.id) {
      return pageCache.get(cacheKeySprints) || [];
    }
    return [];
  });
  const [selectedSprintFilter, setSelectedSprintFilter] = useState<string>("active");
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [blockedWarning, setBlockedWarning] = useState<{ issue: Issue; blockers: Issue[] } | null>(null);

  const [loading, setLoading] = useState(() => {
    if (!selectedProject?.id) return false;
    const hasCache = !!pageCache.get(cacheKeyIssues) && !!pageCache.get(cacheKeySprints);
    return !hasCache;
  });

  // ✅ FIX: stable mount flag for portal
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  /* =====================
     Fetch issues & sprints
  ===================== */
  const fetchIssues = async () => {
    if (!selectedProject?.id || !isMember) return;
    const cacheKey = `board_issues_${selectedProject.id}`;
    const hasCache = !!pageCache.get(cacheKey);

    try {
      if (!hasCache) setLoading(true);
      const res = await axiosInstance.get(
        `/api/issues/project/${selectedProject.id}`
      );
      const all: Issue[] = (res.data || []) as Issue[];
      const byId = new Map(all.map((i: Issue) => [i.id, i]));
      const annotated = all.map((i: Issue) => ({ ...i, parentTitle: i.parentTaskId ? (byId.get(i.parentTaskId) as Issue | undefined)?.title || null : null }));
      setIssues(annotated);
      pageCache.set(cacheKey, annotated);
    } catch (err) {
      console.error("Failed to load issues", err);
      toast.error("Failed to load issues");
    } finally {
      if (!hasCache) setLoading(false);
    }
  };

  const fetchSprints = async () => {
    if (!selectedProject?.id || !isMember) return;
    const cacheKey = `board_sprints_${selectedProject.id}`;
    const hasCache = !!pageCache.get(cacheKey);

    try {
      if (!hasCache) setLoading(true);
      const res = await axiosInstance.get(`/api/sprints/project/${selectedProject.id}`);
      const data = res.data || [];
      setSprints(data);
      pageCache.set(cacheKey, data);
    } catch (err) {
      console.error("Failed to load sprints", err);
      toast.error("Failed to load sprints");
    } finally {
      if (!hasCache) setLoading(false);
    }
  };

  useEffect(() => {
    if (isMember && selectedProject?.id) {
      const cachedIssues = pageCache.get(`board_issues_${selectedProject.id}`);
      const cachedSprints = pageCache.get(`board_sprints_${selectedProject.id}`);
      if (cachedIssues && cachedSprints) {
        setIssues(cachedIssues);
        setSprints(cachedSprints);
        setLoading(false);
      } else {
        setIssues([]);
        setSprints([]);
        setLoading(true);
      }
      fetchIssues();
      fetchSprints();
    } else {
      setIssues([]);
      setSprints([]);
      setLoading(false);
    }
  }, [selectedProject?.id, isMember]);

  // Listen for external updates (issue/subtask changes) and refresh board
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent;
        const detail = ce?.detail || {};
        // If the event contains the created/updated issue, apply it locally
        if (detail.issue) {
          const eventProjectId = detail.projectId ?? detail.issue.projectId;
          // ensure this event is for the currently selected project
          if (selectedProject?.id && String(eventProjectId) !== String(selectedProject.id)) {
            return;
          }
          const updated: Issue = detail.issue;
          setIssues((prev) => {
            const exists = prev.some((i) => i.id === updated.id);
            // attempt to resolve parent title from current list
            const parentTitle = updated.parentTaskId ? prev.find((p) => p.id === updated.parentTaskId)?.title || null : null;
            const annotated = { ...updated, parentTitle } as Issue & { parentTitle?: string | null };
            if (exists) return prev.map((i) => (i.id === annotated.id ? annotated : i));
            // insert new subtask into list
            return [...prev, annotated];
          });
          return;
        }
      } catch (err) {
        // fall through to full refetch
      }
      fetchIssues();
      fetchSprints();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("issues:changed", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("issues:changed", handler);
      }
    };
  }, [selectedProject?.id, isMember]);

  /* =====================
     Drag handlers
  ===================== */
  const onDragStart = (event: DragStartEvent) => {
    const issue = issues.find((i) => i.id === event.active.id);
    setActiveIssue(issue || null);
  };

  const updateIssueStatus = async (issue: Issue, newStatus: string) => {
    if (issue.status === newStatus) return;

    const blockers = (issue.dependencyIds || [])
      .map((id) => issues.find((candidate) => candidate.id === id))
      .filter((candidate): candidate is Issue => Boolean(candidate && candidate.status !== "DONE"));

    if (newStatus === "IN_PROGRESS" && blockers.length > 0) {
      setBlockedWarning({ issue, blockers });
      return;
    }

    try {
      const res = await axiosInstance.get(
        `/api/validation/${issue.id}/can-transition/${newStatus}`
      );

      if (res.data && res.data.valid === false) {
        toast.error(
          res.data.message ||
            `This issue cannot move to ${newStatus.replace("_", " ")}.`
        );
        return;
      }
    } catch (err) {
      console.error("Failed to validate status transition", err);
      toast.error("Unable to validate issue movement. Please try again.");
      return;
    }

    const updatedIssue = {
      ...issue,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    try {
      // Optimistic update
      setIssues((prev) =>
        prev.map((i) => (i.id === issue.id ? updatedIssue : i))
      );

      await axiosInstance.put(`/api/issues/${issue.id}`, {
        title: updatedIssue.title,
        description: updatedIssue.description,
        type: updatedIssue.type,
        priority: updatedIssue.priority,
        status: updatedIssue.status,
        projectId: updatedIssue.projectId,
        reporterId: updatedIssue.reporterId,
        assigneeId: updatedIssue.assigneeId,
        sprintId: updatedIssue.sprintId ?? null,
        order: updatedIssue.order ?? 0,
        comments: updatedIssue.comments ?? [],
        updatedAt: updatedIssue.updatedAt,
      });
    } catch (err) {
      console.error("Failed to update issue", err);
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? issue : i)));
      toast.error("Unable to move issue. Changes have been reverted.");
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over) return;
    const issue = issues.find((candidate) => candidate.id === active.id);
    const overIssue = issues.find((candidate) => candidate.id === over.id);
    const newStatus = STATUS_COLUMNS.some((column) => column.id === over.id)
      ? String(over.id)
      : overIssue?.status;
    if (issue && newStatus) await updateIssueStatus(issue, newStatus);
  };

  const handleDeleteIssue = async (issue: Issue) => {
    // Check if parent task has active subtasks
    const hasSubtasks = issues.some((candidate) => candidate.parentTaskId === issue.id);
    if (hasSubtasks) {
      toast.error("Cannot delete parent task with active subtasks. Delete all subtasks first.");
      return;
    }

    if (!confirm(`Are you sure you want to delete task "${issue.title}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.delete(`/api/issues/${issue.id}`);
      toast.success(`Task "${issue.title}" deleted successfully.`);
      fetchIssues();
    } catch (err: any) {
      console.error("Failed to delete issue", err);
      const msg = err.response?.data?.message || err.message || "Failed to delete task.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const activeSprint = React.useMemo(() => sprints.find((s) => s.status === "ACTIVE"), [sprints]);

  const filteredIssues = React.useMemo(() => {
    return issues.filter((issue) => {
      if (selectedSprintFilter === "active") {
        return activeSprint ? issue.sprintId === activeSprint.id : false;
      }
      if (selectedSprintFilter === "backlog") {
        const activePlannedIds = sprints
          .filter((s) => s.status === "ACTIVE" || s.status === "PLANNED")
          .map((s) => s.id);
        if (!issue.sprintId) return true;
        if (activePlannedIds.includes(issue.sprintId)) return false;
        return issue.status !== "DONE";
      }
      if (selectedSprintFilter === "all") {
        return true;
      }
      return issue.sprintId === selectedSprintFilter;
    });
  }, [issues, sprints, activeSprint, selectedSprintFilter]);

  if (!selectedProject) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
        Select a project to view the board
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
        You are not a member of this project.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 scrollbar-container">
      {/* Board Filters bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#DFE1E6]">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase text-[#626F86] tracking-wide">Sprint Filter:</label>
          <select
            className="h-9 rounded-md border border-[#DFE1E6] bg-white px-3 text-sm text-[#172B4D] focus:border-[#0C66E4] focus:outline-none font-medium"
            value={selectedSprintFilter}
            onChange={(e) => setSelectedSprintFilter(e.target.value)}
          >
            <option value="active">Active Sprint {activeSprint ? `(${activeSprint.name})` : "(None)"}</option>
            <option value="backlog">Backlog Issues</option>
            <option value="all">All Sprints & Issues</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>
        </div>

        {selectedSprintFilter === "active" && !activeSprint && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            No active sprint. Please start a sprint in the Backlog or Sprints page.
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto custom-scrollbar-x">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          {loading ? (
            <PageSkeleton />
          ) : (
            <div className="flex h-full gap-4 pb-4 min-w-max">
              {STATUS_COLUMNS.map((column) => {
                const columnIssues = filteredIssues
                  .filter((i) => {
                    const normalizedStatus = i.status === "OPEN" ? "TODO" : i.status;
                    return normalizedStatus === column.id;
                  })
                  .filter(
                    (issue) =>
                      issue?.title?.toLowerCase().includes(searchQuery) ||
                      issue?.key?.toLowerCase().includes(searchQuery)
                  )
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

                return (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    issues={columnIssues}
                    allIssues={issues}
                    onIssueClick={setSelectedIssue}
                    onStart={(issue: Issue) => updateIssueStatus(issue, "IN_PROGRESS")}
                    onDelete={handleDeleteIssue}
                    onEdit={setEditingIssue}
                  />
                );
              })}
            </div>
          )}

      {/* Issue Modal */}
      <IssueModel
        issue={selectedIssue}
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />

      {/* Edit Issue Modal */}
      <EditIssueModel
        issue={editingIssue}
        isOpen={!!editingIssue}
        onClose={() => setEditingIssue(null)}
      />

      <Dialog open={!!blockedWarning} onOpenChange={(open) => !open && setBlockedWarning(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" /></div>
            <DialogTitle>Task is blocked</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-[#42526E]">
            <p>{blockedWarning?.issue.key || blockedWarning?.issue.title} cannot move to In Progress until these tasks are done:</p>
            <div className="mt-3 space-y-2">{blockedWarning?.blockers.map((blocker) => <div key={blocker.id} className="rounded-md border bg-[#F7F8F9] px-3 py-2"><span className="font-semibold text-[#0C66E4]">{blocker.key || blocker.id}</span><span className="ml-2">{blocker.title}</span></div>)}</div>
          </div>
          <DialogFooter><Button onClick={() => setBlockedWarning(null)}>Got it</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ FIXED: stable DragOverlay portal */}
      {isMounted &&
        !loading &&
        createPortal(
          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: "0.5" } },
              }),
            }}
          >
            {activeIssue ? (
              <KanbanCard issue={activeIssue} isOverlay />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  </div>
  );
};

export default KanbanBoard;
