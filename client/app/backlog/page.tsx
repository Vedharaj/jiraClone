"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import { Issue } from "@/types/issues";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Share2,
  Calendar,
  AlertTriangle,
  Play,
  CheckCircle,
  Trash2,
  Edit2,
  Clock,
} from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TableSkeleton } from "@/components/ui/loader-components";
import { EmptyState, ErrorState } from "@/components/ui/feedback-states";

import { pageCache } from "@/lib/pageCache";

export default function BacklogPage() {
  const { selectedProject, user } = useAuth();

  const cacheKeyIssues = `backlog_issues_${selectedProject?.id || ""}`;
  const cacheKeySprints = `backlog_sprints_${selectedProject?.id || ""}`;

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
  
  const [loading, setLoading] = useState(() => {
    if (!selectedProject?.id) return false;
    const hasCache = !!pageCache.get(cacheKeyIssues) && !!pageCache.get(cacheKeySprints);
    return !hasCache;
  });
  const [error, setError] = useState<string | null>(null);

  // Sprint Creation / Edit State
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<any>(null);
  const [sprintForm, setSprintForm] = useState({ name: "", goal: "", startDate: "", endDate: "" });

  // Start Sprint State
  const [startSprintOpen, setStartSprintOpen] = useState(false);
  const [startSprintData, setStartSprintData] = useState<any>(null);
  const [startForm, setStartForm] = useState({ name: "", goal: "", startDate: "", endDate: "" });

  // Delete Sprint State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState<any>(null);

  // Drag State
  const [dragOverContainer, setDragOverContainer] = useState<string | null>(null);

  const fetchBacklogData = async () => {
    if (!selectedProject?.id) return;
    const cacheKeyIssues = `backlog_issues_${selectedProject.id}`;
    const cacheKeySprints = `backlog_sprints_${selectedProject.id}`;
    const hasCache = !!pageCache.get(cacheKeyIssues) && !!pageCache.get(cacheKeySprints);

    try {
      if (!hasCache) setLoading(true);
      setError(null);
      const [issuesRes, sprintsRes] = await Promise.all([
        axiosInstance.get(`/api/issues/project/${selectedProject.id}`),
        axiosInstance.get(`/api/sprints/project/${selectedProject.id}`),
      ]);
      const nextIssues = issuesRes.data || [];
      const nextSprints = sprintsRes.data || [];
      setIssues(nextIssues);
      setSprints(nextSprints);
      pageCache.set(cacheKeyIssues, nextIssues);
      pageCache.set(cacheKeySprints, nextSprints);
    } catch (err: any) {
      console.error("Failed to load backlog", err);
      setError("Unable to load backlog data. Please check your connection.");
    } finally {
      if (!hasCache) setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject?.id) {
      const cachedIssues = pageCache.get(`backlog_issues_${selectedProject.id}`);
      const cachedSprints = pageCache.get(`backlog_sprints_${selectedProject.id}`);
      if (cachedIssues && cachedSprints) {
        setIssues(cachedIssues);
        setSprints(cachedSprints);
        setLoading(false);
      } else {
        setIssues([]);
        setSprints([]);
        setLoading(true);
      }
      fetchBacklogData();
    } else {
      setIssues([]);
      setSprints([]);
      setLoading(false);
    }
  }, [selectedProject?.id]);

  // Sprints classification
  const activeSprint = useMemo(() => sprints.find((s) => s.status === "ACTIVE"), [sprints]);
  const plannedSprints = useMemo(() => sprints.filter((s) => s.status === "PLANNED"), [sprints]);

  // Grouping issues
  // Backlog issues: not in any active/planned sprint OR in completed sprints but status is not DONE
  const backlogIssues = useMemo(() => {
    const activePlannedIds = sprints
      .filter((s) => s.status === "ACTIVE" || s.status === "PLANNED")
      .map((s) => s.id);

    return issues.filter((issue) => {
      if (!issue.sprintId) return true;
      if (activePlannedIds.includes(issue.sprintId)) return false;
      // If it belongs to a completed sprint but is not DONE, treat as backlog
      return issue.status !== "DONE";
    });
  }, [issues, sprints]);

  const getSprintIssues = (sprintId: string) => {
    return issues.filter((i) => i.sprintId === sprintId);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData("text/plain", issueId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, containerId: string) => {
    e.preventDefault();
    setDragOverContainer(containerId);
  };

  const handleDragLeave = () => {
    setDragOverContainer(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSprintId: string | null) => {
    e.preventDefault();
    setDragOverContainer(null);
    const issueId = e.dataTransfer.getData("text/plain");
    if (!issueId) return;

    const sourceIssue = issues.find((i) => i.id === issueId);
    if (!sourceIssue) return;

    const prevSprintId = sourceIssue.sprintId;
    const targetSprintKey = targetSprintId || "backlog";
    const prevSprintKey = prevSprintId || "backlog";

    if (targetSprintKey === prevSprintKey) return;

    // Optimistic Update
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, sprintId: targetSprintId } : i))
    );

    try {
      if (targetSprintId === null) {
        // Remove from sprint
        await axiosInstance.delete(`/api/sprints/${prevSprintId}/issues/${issueId}`);
      } else {
        // Add to sprint
        await axiosInstance.put(`/api/sprints/${targetSprintId}/issues/${issueId}`);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("issues:changed", { detail: { projectId: selectedProject?.id, issueId } }));
      }
    } catch (err: any) {
      console.error("Failed to move issue", err);
      // Revert on error
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, sprintId: prevSprintId } : i))
      );
      setError(err.response?.data?.message || "Failed to move issue.");
    }
  };

  // Sprint Actions
  const handleCreateSprint = async () => {
    if (!selectedProject) return;
    try {
      const name = `Sprint ${sprints.length + 1}`;
      const res = await axiosInstance.post("/api/sprints", {
        name,
        projectId: selectedProject.id,
        goal: "Focus on core deliverables.",
      });
      setSprints((prev) => [...prev, res.data]);
      fetchBacklogData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create sprint.");
    }
  };

  const openEditSprintModal = (sprint: any) => {
    setEditingSprint(sprint);
    setSprintForm({
      name: sprint.name || "",
      goal: sprint.goal || "",
      startDate: sprint.startDate ? sprint.startDate.substring(0, 10) : "",
      endDate: sprint.endDate ? sprint.endDate.substring(0, 10) : "",
    });
    setSprintModalOpen(true);
  };

  const handleUpdateSprint = async () => {
    if (!editingSprint) return;
    try {
      const body = {
        name: sprintForm.name,
        goal: sprintForm.goal,
        startDate: sprintForm.startDate ? new Date(sprintForm.startDate).toISOString() : null,
        endDate: sprintForm.endDate ? new Date(sprintForm.endDate).toISOString() : null,
      };
      const res = await axiosInstance.put(`/api/sprints/${editingSprint.id}`, body);
      setSprints((prev) => prev.map((s) => (s.id === editingSprint.id ? res.data : s)));
      setSprintModalOpen(false);
      setEditingSprint(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update sprint details.");
    }
  };

  const confirmDeleteSprint = (sprint: any) => {
    setSprintToDelete(sprint);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteSprint = async () => {
    if (!sprintToDelete) return;
    try {
      await axiosInstance.delete(`/api/sprints/${sprintToDelete.id}`);
      setSprints((prev) => prev.filter((s) => s.id !== sprintToDelete.id));
      setDeleteConfirmOpen(false);
      setSprintToDelete(null);
      fetchBacklogData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete sprint.");
    }
  };

  const openStartSprintModal = (sprint: any) => {
    setStartSprintData(sprint);
    setStartForm({
      name: sprint.name || "",
      goal: sprint.goal || "",
      startDate: new Date().toISOString().substring(0, 10),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10), // Default 2 weeks
    });
    setStartSprintOpen(true);
  };

  const handleStartSprint = async () => {
    if (!startSprintData) return;
    try {
      // First update details if changed
      const bodyUpdate = {
        name: startForm.name,
        goal: startForm.goal,
        startDate: new Date(startForm.startDate).toISOString(),
        endDate: new Date(startForm.endDate).toISOString(),
      };
      await axiosInstance.put(`/api/sprints/${startSprintData.id}`, bodyUpdate);
      const res = await axiosInstance.put(`/api/sprints/${startSprintData.id}/start`);
      setSprints((prev) =>
        prev.map((s) => (s.id === startSprintData.id ? res.data : { ...s, status: s.id === startSprintData.id ? "ACTIVE" : s.status }))
      );
      setStartSprintOpen(false);
      setStartSprintData(null);
      fetchBacklogData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start sprint.");
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    try {
      const res = await axiosInstance.put(`/api/sprints/${sprintId}/complete`);
      setSprints((prev) => prev.map((s) => (s.id === sprintId ? res.data : s)));
      fetchBacklogData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to complete sprint.");
    }
  };



  return (
    <div className="flex flex-col min-h-screen lg:h-screen p-4 md:p-6 bg-[#F7F8F9] overflow-y-auto lg:overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-[#5E6C84]">
          <span>Projects</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium">{selectedProject?.name}</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#0052CC]">Backlog</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-[#172B4D]">Backlog</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCreateSprint} disabled={loading}>
              <Plus className="mr-1.5 h-4 w-4" /> Create Sprint
            </Button>
            <Button variant="ghost" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-visible lg:overflow-hidden">
        {error ? (
          <div className="flex-1 flex items-center justify-center bg-white border border-[#DFE1E6] rounded-xl p-8">
            <ErrorState onRetry={fetchBacklogData} isRetrying={loading} message={error} />
          </div>
        ) : loading && sprints.length === 0 ? (
          <div className="flex-1 p-2">
            <TableSkeleton rows={6} cols={4} />
          </div>
        ) : (
          <>
            {/* Left Column: Sprints List */}
            <div className="flex-1 overflow-visible lg:overflow-y-auto space-y-6 pr-0 lg:pr-2 pb-8 custom-scrollbar-y">
              {!activeSprint && plannedSprints.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#B6C2CF] bg-white p-8 text-center h-full min-h-[300px]">
              <AlertTriangle className="mx-auto h-8 w-8 text-[#B6C2CF] mb-2" />
              <p className="font-semibold text-[#172B4D]">No Sprints Available</p>
              <p className="text-xs text-[#626F86] mt-1 mb-4 max-w-xs">
                Create a planned sprint to start planning tasks.
              </p>
              {/* <Button
                variant="outline"
                size="sm"
                className="bg-[#0052CC] text-white hover:bg-[#0747A6] hover:text-white"
                onClick={handleCreateSprint}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Create Sprint
              </Button> */}
            </div>
          ) : (
            <>
              {/* =====================
                 ACTIVE SPRINT SECTION
                 ===================== */}
              {activeSprint && (
                <div
                  className={`rounded-xl border bg-white shadow-sm p-4 transition-colors ${dragOverContainer === activeSprint.id ? "border-dashed border-[#0052CC] bg-[#EAEFFF]" : "border-[#DFE1E6]"
                    }`}
                  onDragOver={(e) => handleDragOver(e, activeSprint.id)}
                  onDragEnter={(e) => handleDragEnter(e, activeSprint.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, activeSprint.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      <ChevronDown className="h-4 w-4 text-[#6B778C]" />
                      <span className="font-bold text-base text-[#172B4D]">{activeSprint.name}</span>
                      <span className="rounded bg-sky-100 text-sky-800 text-[11px] font-bold px-2 py-0.5">ACTIVE</span>
                      {activeSprint.goal && (
                        <span className="text-xs text-[#6B778C] max-w-md truncate">Goal: {activeSprint.goal}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#6B778C] flex items-center gap-1 font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        {activeSprint.startDate ? new Date(activeSprint.startDate).toLocaleDateString() : ""} -{" "}
                        {activeSprint.endDate ? new Date(activeSprint.endDate).toLocaleDateString() : ""}
                      </span>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                        onClick={() => handleCompleteSprint(activeSprint.id)}
                      >
                        <CheckCircle className="h-4 w-4" /> Complete Sprint
                      </Button>
                    </div>
                  </div>

                  {/* Sprint Issues List */}
                  <div className="space-y-1.5 min-h-[50px]">
                    {getSprintIssues(activeSprint.id).length === 0 ? (
                      <div className="text-center py-6 text-xs text-[#6B778C] border-2 border-dashed border-[#DFE1E6] rounded-lg bg-[#FAFBFC]">
                        Drag and drop issues here to add them to this active sprint.
                      </div>
                    ) : (
                      getSprintIssues(activeSprint.id).map((issue) => (
                        <BacklogItem
                          key={issue.id}
                          issue={issue}
                          onDragStart={(e) => handleDragStart(e, issue.id)}
                        />
                      ))
                    )}

                  </div>
                </div>
              )}

              {/* =====================
                 PLANNED SPRINTS SECTION
                 ===================== */}
              {plannedSprints.map((sprint) => {
                const sprintIssues = getSprintIssues(sprint.id);
                return (
                  <div
                    key={sprint.id}
                    className={`rounded-xl border bg-white shadow-sm p-4 transition-colors ${dragOverContainer === sprint.id ? "border-dashed border-[#0052CC] bg-[#EAEFFF]" : "border-[#DFE1E6]"
                      }`}
                    onDragOver={(e) => handleDragOver(e, sprint.id)}
                    onDragEnter={(e) => handleDragEnter(e, sprint.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, sprint.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-4">
                      <div className="flex items-center gap-3">
                        <ChevronDown className="h-4 w-4 text-[#6B778C]" />
                        <span className="font-bold text-base text-[#172B4D]">{sprint.name}</span>
                        <span className="rounded bg-gray-100 text-gray-700 text-[11px] font-bold px-2 py-0.5">PLANNED</span>
                        {sprint.goal && (
                          <span className="text-xs text-[#6B778C] max-w-sm truncate">Goal: {sprint.goal}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[#172B4D] hover:bg-[#F4F5F7]"
                          onClick={() => openEditSprintModal(sprint)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => confirmDeleteSprint(sprint)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#0052CC] hover:bg-[#0747A6] text-white font-semibold flex items-center gap-1.5 ml-2"
                          onClick={() => openStartSprintModal(sprint)}
                        >
                          <Play className="h-3.5 w-3.5" /> Start Sprint
                        </Button>
                      </div>
                    </div>

                    {/* Sprint Issues List */}
                    <div className="space-y-1.5 min-h-[50px]">
                      {sprintIssues.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#6B778C] border-2 border-dashed border-[#DFE1E6] rounded-lg bg-[#FAFBFC]">
                          Plan this sprint by dragging issues here.
                        </div>
                      ) : (
                        sprintIssues.map((issue) => (
                          <BacklogItem
                            key={issue.id}
                            issue={issue}
                            onDragStart={(e) => handleDragStart(e, issue.id)}
                          />
                        ))
                      )}

                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Right Column: Backlog Sidebar */}
        <div
          className={`w-full lg:w-[400px] xl:w-[480px] shrink-0 flex flex-col rounded-xl border bg-white shadow-sm p-4 transition-colors ${dragOverContainer === "backlog" ? "border-dashed border-[#0052CC] bg-[#EAEFFF]" : "border-[#DFE1E6]"
            }`}
          onDragOver={(e) => handleDragOver(e, "backlog")}
          onDragEnter={(e) => handleDragEnter(e, "backlog")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
        >
          <div className="flex items-center justify-between border-b pb-3 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-[#6B778C]" />
              <span className="font-bold text-base text-[#172B4D]">Backlog</span>
              <span className="text-xs bg-[#EBECF0] text-[#42526E] rounded px-1.5 py-0.5 ml-2 font-bold">
                {backlogIssues.length} issues
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-visible lg:overflow-y-auto space-y-1.5 pr-1 min-h-0 lg:max-h-none max-h-[400px] custom-scrollbar-y">
            {backlogIssues.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#6B778C] border-2 border-dashed border-[#DFE1E6] rounded-lg bg-[#FAFBFC]">
                Your backlog is empty. Create a task or drag tasks here.
              </div>
            ) : (
              backlogIssues.map((issue) => (
                <BacklogItem
                  key={issue.id}
                  issue={issue}
                  onDragStart={(e) => handleDragStart(e, issue.id)}
                />
              ))
            )}
          </div>

        </div>
          </>
        )}
      </div>

      {/* =====================
         MODALS & DIALOGS
         ===================== */}

      {/* Edit Sprint Dialog */}
      <Dialog open={sprintModalOpen} onOpenChange={setSprintModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sprint Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-bold uppercase text-[#6B778C] mb-1 block">Sprint Name</label>
              <Input
                value={sprintForm.name}
                onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-[#6B778C] mb-1 block">Sprint Goal</label>
              <Textarea
                value={sprintForm.goal}
                onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-[#6B778C] mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={sprintForm.startDate}
                  onChange={(e) => setSprintForm({ ...sprintForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-[#6B778C] mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={sprintForm.endDate}
                  onChange={(e) => setSprintForm({ ...sprintForm, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="cursor-pointer" onClick={() => setSprintModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#0052CC] text-white hover:bg-[#0747A6] cursor-pointer" onClick={handleUpdateSprint}>
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Sprint Dialog */}
      <Dialog open={startSprintOpen} onOpenChange={setStartSprintOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Sprint: {startSprintData?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-bold uppercase text-[#6B778C] mb-1 block">Sprint Name</label>
              <Input
                value={startForm.name}
                onChange={(e) => setStartForm({ ...startForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-[#6B778C] mb-1 block">Sprint Goal</label>
              <Textarea
                value={startForm.goal}
                placeholder="What is the goal of this sprint?"
                onChange={(e) => setStartForm({ ...startForm, goal: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-[#6B778C] mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={startForm.startDate}
                  onChange={(e) => setStartForm({ ...startForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-[#6B778C] mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={startForm.endDate}
                  onChange={(e) => setStartForm({ ...startForm, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStartSprintOpen(false)}>Cancel</Button>
            <Button className="bg-[#0052CC] text-white hover:bg-[#0747A6]" onClick={handleStartSprint}>
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Sprint Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Sprint
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#42526E] py-2">
            Are you sure you want to delete <strong>{sprintToDelete?.name}</strong>? Any tasks currently in this sprint will be returned to the Backlog.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={handleDeleteSprint}>
              Delete Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subcomponents

const BacklogItem = ({ issue, onDragStart }: { issue: Issue; onDragStart: (e: React.DragEvent) => void }) => {
  const priorityMap = {
    HIGH: "text-red-600 bg-red-50 border border-red-200",
    MEDIUM: "text-orange-600 bg-orange-50 border border-orange-200",
    LOW: "text-blue-600 bg-blue-50 border border-blue-200",
  };

  const priorityStyle =
    priorityMap[issue.priority as keyof typeof priorityMap] || "text-gray-600 bg-gray-50 border border-gray-200";

  return (
    <div
      draggable="true"
      onDragStart={onDragStart}
      className="flex items-center justify-between p-3 hover:bg-[#F4F5F7] bg-white border border-[#DFE1E6] rounded-lg cursor-grab active:cursor-grabbing group shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-4 w-4 shrink-0 rounded bg-blue-500" />
        {/* <span className="text-xs font-semibold text-[#5E6C84] select-all bg-gray-100 px-1.5 py-0.5 rounded border">
          {issue.key}
        </span> */}
        <span className="text-sm font-medium text-[#172B4D] truncate">{issue.title}</span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityStyle}`}>
          {issue.priority}
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-slate-50 text-slate-700 uppercase">
          {issue.status}
        </span>
        <Avatar className="h-6 w-6">
          <AvatarImage src={issue.assigneeId ? `/api/users/avatar/${issue.assigneeId}` : ""} />
          <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px] font-bold">
            {issue.assigneeId ? issue.assigneeId.substring(0, 2).toUpperCase() : "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
};
