"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCw,
  CheckCircle2,
  ChevronRight,
  Circle,
  GitBranch,
  Link2,
  Plus,
  Trash2,
  UserRound,
  Paperclip,
  File,
  FileText,
  Image,
} from "lucide-react";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { Issue, NotificationItem, User } from "@/types/issues";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { UploadLoader, ButtonLoader } from "./ui/loader-components";
import { useToast } from "@/lib/ToastContext";

const apiBaseUrl =
  axiosInstance.defaults.baseURL?.replace(/\/$/, "") || "http://localhost:8080";

const resolveImageUrl = (url?: string) => {
  if (!url) return "/placeholder.svg";
  if (url.startsWith("http")) return url;
  return `${apiBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
};

interface IssueModelProps {
  issue: Issue | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  IN_PROGRESS: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  DONE: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
};

function StatusBadge({ status = "TODO" }: { status?: string }) {
  return (
    <Badge className={`border-0 text-[10px] font-semibold ${statusStyles[status] || statusStyles.TODO}`}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

function IssueRow({ task, action, members }: { task: Issue; action?: React.ReactNode; members?: User[] }) {
  const assigneeName = React.useMemo(() => {
    if (!task.assigneeId) return "";
    const member = members?.find((m) => m.id === task.assigneeId);
    return member ? member.name : task.assigneeId;
  }, [task.assigneeId, members]);

  return (
    <div className="group flex items-center gap-3 rounded-md border border-[#DFE1E6] bg-white px-3 py-2.5 hover:bg-[#F7F8F9]">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#DEEBFF] text-[#0C66E4]">
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button className="text-xs font-semibold text-[#0C66E4] hover:underline">{task.title}</button>
          <StatusBadge status={task.status} />
        </div>
        <p className="mt-0.5 truncate text-sm text-[#172B4D]">{task.type} • {task.priority}</p>
      </div>
      {task.assigneeId && (
        <div className="hidden items-center gap-1.5 text-xs text-[#626F86] sm:flex">
          <Avatar className="h-6 w-6">
            <AvatarFallback>{assigneeName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="max-w-28 truncate">{assigneeName}</span>
        </div>
      )}
      {action}
    </div>
  );
}

export default function IssueModel({ issue, isOpen, onClose }: IssueModelProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [localIssue, setLocalIssue] = useState<Issue | null>(null);
  const [parent, setParent] = useState<Issue | null>(null);
  const [subtasks, setSubtasks] = useState<Issue[]>([]);
  const [blockedBy, setBlockedBy] = useState<Issue[]>([]);
  const [blocking, setBlocking] = useState<Issue[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Issue[]>([]);
  const [activity, setActivity] = useState<NotificationItem[]>([]);
  const [assignee, setAssignee] = useState<User | null>(null);
  const [projectMembers, setProjectMembers] = useState<User[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [commentAuthorNames, setCommentAuthorNames] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskAssignee, setSubtaskAssignee] = useState("");
  const [dependencyId, setDependencyId] = useState("");
  const [commentText, setCommentText] = useState("");

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!localIssue) return;
    setSaving(true);
    try {
      if (newAssigneeId === "" || newAssigneeId === "unassigned") {
        const res = await axiosInstance.put(`/api/issues/${localIssue.id}/unassign?actorId=${user?.id || ""}`);
        setLocalIssue(res.data);
        setAssignee(null);
      } else {
        const res = await axiosInstance.put(`/api/issues/${localIssue.id}/assign?assigneeId=${newAssigneeId}&actorId=${user?.id || ""}`);
        setLocalIssue(res.data);
        const userRes = await axiosInstance.get(`/api/users/${newAssigneeId}`).catch(() => ({ data: null }));
        setAssignee(userRes.data);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("issues:changed", { detail: { projectId: localIssue.projectId, issueId: localIssue.id } }));
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSprintChange = async (newSprintId: string) => {
    if (!localIssue) return;
    setSaving(true);
    try {
      if (newSprintId === "" || newSprintId === "backlog") {
        if (localIssue.sprintId) {
          const res = await axiosInstance.delete(`/api/sprints/${localIssue.sprintId}/issues/${localIssue.id}`);
          setLocalIssue(res.data);
        }
      } else {
        const res = await axiosInstance.put(`/api/sprints/${newSprintId}/issues/${localIssue.id}`);
        setLocalIssue(res.data);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("issues:changed", { detail: { projectId: localIssue.projectId, issueId: localIssue.id } }));
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const loadRelations = async (current: Issue) => {
    const [subtaskRes, blockedByRes, blockingRes, projectRes, parentRes, activityRes] = await Promise.all([
      axiosInstance.get(`/api/subtasks/parent/${current.id}`),
      axiosInstance.get(`/api/dependencies/${current.id}`),
      axiosInstance.get(`/api/dependencies/${current.id}/blocking`),
      current.projectId ? axiosInstance.get(`/api/issues/project/${current.projectId}`) : Promise.resolve({ data: [] }),
      current.parentTaskId ? axiosInstance.get(`/api/issues/${current.parentTaskId}`) : Promise.resolve({ data: null }),
      axiosInstance.get(`/api/notifications/task/${current.id}`).catch(() => ({ data: [] })),
    ]);
    setSubtasks(subtaskRes.data || []);
    setBlockedBy(blockedByRes.data || []);
    setBlocking(blockingRes.data || []);
    setAvailableTasks(projectRes.data || []);
    setParent(parentRes.data || null);
    setActivity(activityRes.data || []);
  };

  const fetchAttachments = async (issueId: string) => {
    if (!user?.id) return;
    try {
      const res = await axiosInstance.get(`/api/issues/${issueId}/attachments?userId=${user.id}`);
      setAttachments(res.data || []);
    } catch (err) {
      console.error("Failed to fetch attachments", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !localIssue || !user?.id) return;

    setAttachmentError(null);

    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError("File size must be 10MB or smaller.");
      return;
    }

    const allowedExts = ["pdf", "png", "jpg", "jpeg", "docx"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !allowedExts.includes(ext)) {
      setAttachmentError("Unsupported file format. Allowed formats: PDF, PNG, JPG/JPEG, DOCX.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setUploadProgress(0);
    try {
      await axiosInstance.post(`/api/issues/${localIssue.id}/attachments?userId=${user.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded)
          );
          setUploadProgress(percentCompleted);
        },
      });
      await fetchAttachments(localIssue.id);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("File uploaded successfully.");
    } catch (err: any) {
      setAttachmentError(getApiErrorMessage(err));
      toast.error("File upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachmentId: string, originalFileName: string) => {
    if (!user?.id) return;
    setDownloading(true);
    try {
      const res = await axiosInstance.get(`/api/attachments/${attachmentId}/download?userId=${user.id}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", originalFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Attachment downloaded successfully.");
    } catch (err: any) {
      toast.error("Failed to download attachment.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!localIssue || !user?.id) return;
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    setSaving(true);
    setAttachmentError(null);
    try {
      await axiosInstance.delete(`/api/attachments/${attachmentId}?userId=${user.id}`);
      await fetchAttachments(localIssue.id);
      toast.success("Attachment deleted successfully.");
    } catch (err: any) {
      setAttachmentError(getApiErrorMessage(err));
      toast.error("Failed to delete attachment.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !issue?.id) return;
    let active = true;
    const load = async () => {
      setInitialLoading(true);
      try {
        const { data } = await axiosInstance.get(`/api/issues/${issue.id}`);
        if (!active) return;
        setLocalIssue(data);
        await loadRelations(data);
        await fetchAttachments(data.id);
        if (data.assigneeId) {
          const userRes = await axiosInstance.get(`/api/users/${data.assigneeId}`).catch(() => ({ data: null }));
          if (active) setAssignee(userRes.data);
        } else {
          setAssignee(null);
        }
        if (data.projectId) {
          const projectRes = await axiosInstance.get(`/api/projects/${data.projectId}`).catch(() => ({ data: null }));
          if (active && projectRes.data) {
            setProjectName(projectRes.data.name || "");
          }
          const membersRes = await axiosInstance.get(`/api/projects/${data.projectId}/members`).catch(() => ({ data: [] }));
          const members = membersRes.data || [];
          if (active) setProjectMembers(members);
          const sprintsRes = await axiosInstance.get(`/api/sprints/project/${data.projectId}`).catch(() => ({ data: [] }));
          if (active) setSprints(sprintsRes.data || []);

          // Resolve comment authors
          if (active && data.comments && data.comments.length > 0) {
            const commentUserIds = data.comments
              .map((c: string) => {
                const colonIndex = c.indexOf(":");
                return colonIndex !== -1 ? c.substring(0, colonIndex).trim() : null;
              })
              .filter((id: any): id is string => !!id);

            const uniqueIds = Array.from(new Set(commentUserIds)) as string[];
            const missingIds = uniqueIds.filter((id) => !members.some((m: any) => m.id === id));
            
            if (missingIds.length > 0) {
              const fetchedUsersMap: Record<string, string> = {};
              await Promise.all(
                missingIds.map(async (id) => {
                  try {
                    const userRes = await axiosInstance.get(`/api/users/${id}`);
                    if (userRes.data && userRes.data.name) {
                      fetchedUsersMap[id] = userRes.data.name;
                    }
                  } catch (e) {
                    console.error("Failed to fetch comment user", id, e);
                  }
                })
              );
              setCommentAuthorNames(fetchedUsersMap);
            }
          }
        }
      } finally {
        if (active) setInitialLoading(false);
      }
    };
    load().catch((error) => console.error("Failed to load issue details", error));
    return () => { active = false; };
  }, [isOpen, issue?.id]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (!localIssue || detail.issueId !== localIssue.id) return;
      setLocalIssue((current) => current ? { ...current, comments: detail.comments || current.comments } : current);
    };
    window.addEventListener("comments:changed", handler);
    return () => window.removeEventListener("comments:changed", handler);
  }, [localIssue?.id]);

  const completedSubtasks = subtasks.filter((task) => task.status === "DONE").length;
  const progress = subtasks.length ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;
  const incompleteBlockers = blockedBy.filter((task) => task.status !== "DONE");
  const dependencyOptions = useMemo(() => {
    const linked = new Set(blockedBy.map((task) => task.id));
    return availableTasks.filter((task) => task.id !== localIssue?.id && task.id !== localIssue?.parentTaskId && !linked.has(task.id));
  }, [availableTasks, blockedBy, localIssue]);

  const createSubtask = async () => {
    if (!localIssue || !subtaskTitle.trim()) return;
    setSaving(true);
    try {
      const res = await axiosInstance.post("/api/subtasks", {
        title: subtaskTitle.trim(), description: "", type: "TASK", priority: "MEDIUM",
        assigneeId: subtaskAssignee || null, parentTaskId: localIssue.id, order: subtasks.length,
      });
      const created = res.data;
      await loadRelations(localIssue);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("issues:changed", { detail: { projectId: localIssue.projectId, issue: created } }));
      setSubtaskTitle("");
      setSubtaskAssignee("");
      setSubtaskDialogOpen(false);
    } finally { setSaving(false); }
  };

  const completeSubtask = async (subtaskId: string) => {
    if (!localIssue) return;
    setSaving(true);
    try {
      const res = await axiosInstance.get(`/api/issues/${subtaskId}`);
      const data = res.data || {};
      await axiosInstance.put(`/api/issues/${subtaskId}`, {
        ...data,
        status: "DONE",
        updatedAt: new Date().toISOString(),
      });
      await loadRelations(localIssue);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("issues:changed", { detail: { projectId: localIssue.projectId, issueId: localIssue.id } }));
    } catch (err) {
      console.error("Failed to complete subtask", err);
    } finally {
      setSaving(false);
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    if (!localIssue) return;
    if (!confirm("Delete this subtask?")) return;
    setSaving(true);
    try {
      await axiosInstance.delete(`/api/issues/${subtaskId}`);
      await loadRelations(localIssue);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("issues:changed", { detail: { projectId: localIssue.projectId, issueId: localIssue.id } }));
    } catch (err) {
      console.error("Failed to delete subtask", err);
    } finally {
      setSaving(false);
    }
  };

  const uncompleteSubtask = async (subtaskId: string) => {
    if (!localIssue) return;
    setSaving(true);
    try {
      const res = await axiosInstance.get(`/api/issues/${subtaskId}`);
      const data = res.data || {};
      await axiosInstance.put(`/api/issues/${subtaskId}`, {
        ...data,
        status: "TODO",
        updatedAt: new Date().toISOString(),
      });
      await loadRelations(localIssue);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("issues:changed", { detail: { projectId: localIssue.projectId, issueId: localIssue.id } }));
    } catch (err) {
      console.error("Failed to uncomplete subtask", err);
    } finally {
      setSaving(false);
    }
  };

  const getApiErrorMessage = (error: any) => {
    if (!error) return "An unknown error occurred.";
    
    const response = error?.response;
    if (response?.data) {
      const data = response.data;
      // Handle direct message property (most common)
      if (data.message && typeof data.message === 'string') {
        return data.message;
      }
      // Handle stringified response
      if (typeof data === 'string') {
        return data;
      }
      // Handle error array
      if (Array.isArray(data.errors) && data.errors[0]?.message) {
        return data.errors[0].message;
      }
    }
    
    // Fallback to error message
    if (error?.message && error.message !== 'Request failed with status code 400') {
      return error.message;
    }
    
    // Final fallback with status code
    if (response?.status) {
      return `Request failed with status code ${response.status}. Please try again.`;
    }
    
    return "An error occurred.";
  };

  const addDependency = async () => {
    if (!localIssue || !dependencyId) return;
    setSaving(true);
    try {
      await axiosInstance.post("/api/dependencies", { taskId: localIssue.id, dependencyTaskId: dependencyId });
      await loadRelations(localIssue);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("issues:changed", { detail: { projectId: localIssue.projectId, issueId: localIssue.id } }));
      setDependencyId("");
      setDependencyDialogOpen(false);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err));
      console.error("Failed to add dependency", err);
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!localIssue || !commentText.trim()) return;
    setSaving(true);
    try {
      const res = await axiosInstance.post(`/api/issues/${localIssue.id}/comments`, {
        userId: user?.id || "user",
        comment: commentText.trim(),
      });
      setLocalIssue(res.data);
      setCommentText("");
    } catch (err: any) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeDependency = async (dependencyTaskId: string) => {
    if (!localIssue) return;
    setSaving(true);
    try {
      await axiosInstance.delete("/api/dependencies", { data: { taskId: localIssue.id, dependencyTaskId } });
      await loadRelations(localIssue);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("issues:changed", { detail: { projectId: localIssue.projectId, issueId: localIssue.id } }));
      }
    } catch (err: any) {
      const message = getApiErrorMessage(err);
      toast.error(message);
      console.error("Failed to remove dependency", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex flex-col h-[92vh] max-h-[92vh] max-w-6xl gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:max-w-6xl" showCloseButton>
        <DialogHeader className="border-b border-[#DFE1E6] px-5 py-4 pr-14">
          <div className="flex items-center gap-2 text-xs text-[#626F86]">
            <span>{projectName || "Project"}</span><ChevronRight className="h-3 w-3" />
            <span className="font-semibold text-[#0C66E4]">{localIssue?.key || localIssue?.title || "Loading…"}</span>
          </div>
          <DialogTitle className="mt-2 text-xl leading-7 text-[#172B4D] sm:text-2xl">{localIssue?.title || "Loading issue details…"}</DialogTitle>
        </DialogHeader>

        {initialLoading || !localIssue ? (
          <div className="flex h-96 items-center justify-center text-sm text-[#626F86]">Loading issue details...</div>
        ) : (
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px] hide-scrollbar">
            <main className="space-y-7 p-5 sm:p-7 pb-24 lg:h-full lg:overflow-y-auto custom-scrollbar-y">
                {incompleteBlockers.length > 0 && (
                  <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div><p className="font-semibold">This task is blocked</p><p className="mt-1 text-amber-800">Complete {incompleteBlockers.map((t) => t.title).join(", ")} before starting this work.</p></div>
                  </div>
                )}

              <section>
                <h3 className="mb-3 text-sm font-semibold text-[#172B4D]">Description</h3>
                <p className="text-sm leading-6 text-[#42526E]">{localIssue.description || "No description has been added."}</p>
              </section>

              {parent && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-[#172B4D]">Parent task</h3>
                    <button className="flex w-full items-center gap-3 rounded-lg border border-[#DFE1E6] bg-[#F7F8F9] p-3 text-left hover:border-[#0C66E4]">
                      <GitBranch className="h-4 w-4 text-[#0C66E4]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0C66E4]">{parent.key || "PARENT"}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-[#172B4D]">{parent.title}</span>
                      <StatusBadge status={parent.status} /><ChevronRight className="h-4 w-4 text-[#626F86]" />
                    </button>
                </section>
              )}

              {!localIssue.isSubtask && (
                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div><h3 className="text-sm font-semibold text-[#172B4D]">Subtasks</h3><p className="mt-0.5 text-xs text-[#626F86]">{completedSubtasks} of {subtasks.length} completed</p></div>
                    <Button size="sm" variant="outline" onClick={() => setSubtaskDialogOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Add subtask</Button>
                  </div>
                    {subtasks.length > 0 && <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#DFE1E6]"><div className="h-full rounded-full bg-[#22A06B] transition-all" style={{ width: `${progress}%` }} /></div>}
                    <div className="space-y-2">{subtasks.length ? subtasks.map((task) => (
                      <IssueRow
                        key={task.id}
                        task={task}
                        members={projectMembers}
                        action={<div className="flex items-center gap-2">{task.status === "DONE" ? <Button size="icon" variant="ghost" aria-label={`Mark ${task.title} incomplete`} disabled={saving} onClick={() => uncompleteSubtask(task.id)}><RotateCw className="h-4 w-4 text-yellow-600" /></Button> : <Button size="icon" variant="ghost" aria-label={`Complete ${task.title}`} disabled={saving} onClick={() => completeSubtask(task.id)}><CheckCircle2 className="h-4 w-4 text-green-600" /></Button>}<Button size="icon" variant="ghost" aria-label={`Delete ${task.title}`} disabled={saving} onClick={() => deleteSubtask(task.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button></div>}
                      />
                    )) : <EmptyState text="Break this task into smaller pieces of work." />}</div>
                </section>
              )}

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div><h3 className="text-sm font-semibold text-[#172B4D]">Dependencies</h3><p className="mt-0.5 text-xs text-[#626F86]">Work that controls when this task can start.</p></div>
                  <Button size="sm" variant="outline" onClick={() => setDependencyDialogOpen(true)}><Link2 className="mr-1.5 h-4 w-4" />Add dependency</Button>
                </div>
                <DependencyGroup icon={<ArrowDownLeft className="h-4 w-4" />} label="Blocked by" tasks={blockedBy} members={projectMembers} action={(task) => <Button aria-label={`Remove ${task.key || task.title}`} size="icon" variant="ghost" className="h-8 w-8 opacity-60 hover:opacity-100" disabled={saving} onClick={() => removeDependency(task.id)}><Trash2 className="h-4 w-4" /></Button>} />
                <DependencyGroup icon={<ArrowUpRight className="h-4 w-4" />} label="Blocking" tasks={blocking} members={projectMembers} />
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-[#626F86]" />
                    <h3 className="text-sm font-semibold text-[#172B4D]">Attachments</h3>
                    <span className="rounded-full bg-[#DCDFE4] px-1.5 py-0.5 text-[10px]">
                      {attachments.length} / 2
                    </span>
                  </div>
                  {!localIssue.isSubtask && (
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading || saving || downloading || attachments.length >= 2}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || saving || downloading || attachments.length >= 2}
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Upload
                      </Button>
                    </div>
                  )}
                </div>

                {uploading && (
                  <div className="mb-3">
                    <UploadLoader progress={uploadProgress} />
                  </div>
                )}

                {attachmentError && (
                  <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    {attachmentError}
                  </div>
                )}

                {localIssue.isSubtask ? (
                  <p className="text-xs text-[#626F86] italic">Subtasks cannot upload attachments.</p>
                ) : attachments.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between rounded-lg border border-[#DFE1E6] bg-white p-3 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <AttachmentIcon fileType={att.fileType} />
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => handleDownload(att.id, att.originalFileName)}
                              disabled={uploading || saving || downloading}
                              className="text-sm font-semibold text-[#0C66E4] hover:underline truncate block w-full text-left disabled:pointer-events-none disabled:opacity-50"
                            >
                              {att.originalFileName}
                            </button>
                            <p className="text-[10px] text-[#626F86] mt-0.5">
                              {formatBytes(att.fileSize)} • {new Date(att.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:bg-red-50 shrink-0 ml-2"
                          disabled={uploading || saving || downloading}
                          onClick={() => handleDeleteAttachment(att.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#626F86]">No attachments yet.</p>
                )}
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-[#626F86]" /><h3 className="text-sm font-semibold text-[#172B4D]">Comments</h3></div>
                <div className="space-y-3">
                  {(localIssue.comments || []).length ? (localIssue.comments || []).map((comment, index) => {
                    const colonIndex = comment.indexOf(":");
                    if (colonIndex !== -1) {
                      const commentUserId = comment.substring(0, colonIndex).trim();
                      const commentText = comment.substring(colonIndex + 1).trim();
                      const member = projectMembers.find((m) => m.id === commentUserId);
                      let userName = commentUserId;
                      if (member) {
                        userName = member.name;
                      } else if (commentAuthorNames[commentUserId]) {
                        userName = commentAuthorNames[commentUserId];
                      } else if (user && user.id === commentUserId) {
                        userName = user.name || commentUserId;
                      }
                      return (
                        <div key={`${comment}-${index}`} className="rounded-md border border-[#DFE1E6] bg-white px-3 py-2 text-sm text-[#42526E]">
                          <span className="font-semibold text-[#172B4D] mr-2">{userName}:</span>
                          {commentText}
                        </div>
                      );
                    }
                    return (
                      <div key={`${comment}-${index}`} className="rounded-md border border-[#DFE1E6] bg-white px-3 py-2 text-sm text-[#42526E]">
                        {comment}
                      </div>
                    );
                  }) : <p className="text-sm text-[#626F86]">No comments yet.</p>}
                  <div className="flex gap-2">
                    <Input value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add a comment" />
                    <Button disabled={!commentText.trim() || saving} onClick={addComment}>Send</Button>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-[#626F86]" /><h3 className="text-sm font-semibold text-[#172B4D]">Activity</h3></div>
                <div className="space-y-3">{activity.length ? activity.map((item) => <div key={item.id} className="flex gap-3 text-sm"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0C66E4]" /><div><p className="text-[#172B4D]">{item.message}</p><p className="mt-1 text-xs text-[#626F86]">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Recently"}</p></div></div>) : <p className="text-sm text-[#626F86]">No dependency activity yet.</p>}</div>
              </section>
            </main>

            <aside className="border-t border-[#DFE1E6] bg-[#F7F8F9] p-5 lg:border-l lg:border-t-0 lg:h-full lg:overflow-y-auto custom-scrollbar-y">
              <div className="space-y-6">
                <Detail label="Status"><StatusBadge status={localIssue.status} /></Detail>
                <Detail label="Assignee">
                  <div className="space-y-2">
                    <select
                      className="h-9 w-full rounded-md border border-[#DFE1E6] bg-white px-2 py-1 text-sm text-[#172B4D] focus:border-[#0C66E4] focus:outline-none"
                      value={localIssue.assigneeId || "unassigned"}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
                      disabled={saving}
                    >
                      <option value="unassigned">Unassigned</option>
                      {projectMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>
                    {assignee && (
                      <div className="flex items-center gap-2 rounded border border-[#DFE1E6] bg-white p-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={resolveImageUrl(assignee.avatar)} />
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {assignee.name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#172B4D] truncate">{assignee.name}</p>
                          <p className="text-[10px] text-[#6B778C] truncate">{assignee.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Detail>
                <Detail label="Priority"><span className="text-sm text-[#172B4D]">{localIssue.priority || "Medium"}</span></Detail>
                <Detail label="Sprint">
                  <select
                    className="h-9 w-full rounded-md border border-[#DFE1E6] bg-white px-2 py-1 text-sm text-[#172B4D] focus:border-[#0C66E4] focus:outline-none"
                    value={localIssue.sprintId || "backlog"}
                    onChange={(e) => handleSprintChange(e.target.value)}
                    disabled={saving}
                  >
                    <option value="backlog">Backlog</option>
                    {sprints.map((sprint) => (
                      <option key={sprint.id} value={sprint.id}>
                        {sprint.name} ({sprint.status})
                      </option>
                    ))}
                  </select>
                </Detail>
                {!localIssue.isSubtask && <div className="rounded-lg border border-[#DFE1E6] bg-white p-4"><div className="flex items-center justify-between text-sm"><span className="font-semibold text-[#172B4D]">Subtask progress</span><span className="font-semibold text-[#22A06B]">{completedSubtasks}/{subtasks.length}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#DFE1E6]"><div className="h-full bg-[#22A06B]" style={{ width: `${progress}%` }} /></div></div>}
                <div className="rounded-lg border border-[#DFE1E6] bg-white p-4 text-xs text-[#626F86]"><p className="font-semibold text-[#172B4D]">Dependency summary</p><p className="mt-2">{blockedBy.length} blocking this task</p><p className="mt-1">{blocking.length} tasks waiting on this</p></div>
              </div>
            </aside>
          </div>
        )}
      </DialogContent>

      <Dialog open={subtaskDialogOpen} onOpenChange={setSubtaskDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create subtask</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Summary</label>
              <Textarea value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="What needs to be done?" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Assignee</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm focus:border-[#0C66E4] focus:outline-none"
                value={subtaskAssignee}
                onChange={(e) => setSubtaskAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {projectMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-[#626F86]">Project and sprint are inherited from {localIssue?.key || "the parent task"}.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSubtaskDialogOpen(false)}>Cancel</Button>
            <ButtonLoader 
              className="bg-[#0C66E4] text-white hover:bg-[#0055CC]" 
              loading={saving} 
              disabled={!subtaskTitle.trim()} 
              onClick={createSubtask}
            >
              Create
            </ButtonLoader>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dependencyDialogOpen} onOpenChange={setDependencyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Add dependency</DialogTitle></DialogHeader>
          <div className="py-2"><label className="mb-1.5 block text-sm font-medium">This task is blocked by</label><select className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm" value={dependencyId} onChange={(event) => setDependencyId(event.target.value)}><option value="">Select a task</option>{dependencyOptions.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select><p className="mt-2 text-xs text-[#626F86]">Circular dependencies are rejected automatically.</p></div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDependencyDialogOpen(false)}>Cancel</Button>
            <ButtonLoader 
              className="bg-[#0C66E4] text-white hover:bg-[#0055CC]" 
              loading={saving} 
              disabled={!dependencyId} 
              onClick={addDependency}
            >
              Add dependency
            </ButtonLoader>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#626F86]">{label}</p>{children}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-[#B6C2CF] bg-[#F7F8F9] p-5 text-center text-sm text-[#626F86]"><Circle className="mx-auto mb-2 h-5 w-5" />{text}</div>;
}

function DependencyGroup({ icon, label, tasks, action, members }: { icon: React.ReactNode; label: string; tasks: Issue[]; action?: (task: Issue) => React.ReactNode; members?: User[] }) {
  return <div className="mb-4 last:mb-0"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#626F86]">{icon}{label}<span className="rounded-full bg-[#DCDFE4] px-1.5 py-0.5 text-[10px]">{tasks.length}</span></div><div className="space-y-2">{tasks.length ? tasks.map((task) => <IssueRow key={task.id} task={task} members={members} action={action?.(task)} />) : <p className="rounded-md bg-[#F7F8F9] px-3 py-2 text-xs text-[#626F86]">No linked tasks.</p>}</div></div>;
}

function AttachmentIcon({ fileType }: { fileType: string }) {
  if (fileType.startsWith("image/")) {
    return <Image className="h-5 w-5 text-blue-500 shrink-0" />;
  }
  if (fileType.includes("pdf")) {
    return <FileText className="h-5 w-5 text-red-500 shrink-0" />;
  }
  if (fileType.includes("word") || fileType.includes("document") || fileType.includes("docx")) {
    return <FileText className="h-5 w-5 text-indigo-500 shrink-0" />;
  }
  return <File className="h-5 w-5 text-gray-500 shrink-0" />;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
