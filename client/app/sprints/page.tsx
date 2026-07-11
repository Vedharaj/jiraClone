"use client";

import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import {
  ChevronRight,
  Plus,
  Play,
  CheckCircle,
  Calendar,
  AlertTriangle,
  Edit2,
  Trash2,
  ListTodo,
  TrendingUp,
  Clock,
  Compass,
  Loader2,
} from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TableSkeleton } from "@/components/ui/loader-components";
import { EmptyState, ErrorState } from "@/components/ui/feedback-states";
import { useToast } from "@/lib/ToastContext";

import { pageCache } from "@/lib/pageCache";

export default function SprintsPage() {
  const { selectedProject, user } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const cacheKeySprints = `sprints_list_${selectedProject?.id || ""}`;
  const cacheKeyStats = `sprints_stats_${selectedProject?.id || ""}`;

  const [sprints, setSprints] = useState<any[]>(() => {
    if (typeof window !== "undefined" && selectedProject?.id) {
      return pageCache.get(cacheKeySprints) || [];
    }
    return [];
  });
  const [sprintStats, setSprintStats] = useState<Record<string, any>>(() => {
    if (typeof window !== "undefined" && selectedProject?.id) {
      return pageCache.get(cacheKeyStats) || {};
    }
    return {};
  });
  const [loading, setLoading] = useState(() => {
    if (!selectedProject?.id) return false;
    const hasCache = !!pageCache.get(cacheKeySprints) && !!pageCache.get(cacheKeyStats);
    return !hasCache;
  });
  const [error, setError] = useState<string | null>(null);

  // Dialog States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState<any>(null);

  // Forms State
  const [sprintForm, setSprintForm] = useState({ name: "", goal: "" });
  const [editForm, setEditForm] = useState({ id: "", name: "", goal: "", startDate: "", endDate: "" });
  const [startForm, setStartForm] = useState({ id: "", name: "", goal: "", startDate: "", endDate: "" });

  // Operation Loading States
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [deletingMap, setDeletingMap] = useState<Record<string, boolean>>({});

  const fetchSprints = async () => {
    if (!selectedProject?.id) return;
    const cacheKeySprints = `sprints_list_${selectedProject.id}`;
    const cacheKeyStats = `sprints_stats_${selectedProject.id}`;
    const hasCache = !!pageCache.get(cacheKeySprints) && !!pageCache.get(cacheKeyStats);

    try {
      if (!hasCache) setLoading(true);
      setError(null);
      const res = await axiosInstance.get(`/api/sprints/project/${selectedProject.id}`);
      const sprintsData = res.data || [];
      setSprints(sprintsData);
      pageCache.set(cacheKeySprints, sprintsData);

      // Fetch statistics for each sprint
      const statsMap: Record<string, any> = {};
      await Promise.all(
        sprintsData.map(async (sprint: any) => {
          try {
            const statsRes = await axiosInstance.get(`/api/sprints/${sprint.id}/statistics`);
            statsMap[sprint.id] = statsRes.data;
          } catch (err) {
            console.error(`Failed to load stats for sprint ${sprint.id}`, err);
          }
        })
      );
      setSprintStats(statsMap);
      pageCache.set(cacheKeyStats, statsMap);
    } catch (err: any) {
      console.error("Failed to load sprints", err);
      setError("Unable to load sprints. Please check your network connection.");
    } finally {
      if (!hasCache) setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject?.id) {
      const cachedSprints = pageCache.get(`sprints_list_${selectedProject.id}`);
      const cachedStats = pageCache.get(`sprints_stats_${selectedProject.id}`);
      if (cachedSprints && cachedStats) {
        setSprints(cachedSprints);
        setSprintStats(cachedStats);
        setLoading(false);
      } else {
        setSprints([]);
        setSprintStats({});
        setLoading(true);
      }
      fetchSprints();
    } else {
      setSprints([]);
      setSprintStats({});
      setLoading(false);
    }
  }, [selectedProject?.id]);

  // Group sprints by status
  const activeSprint = useMemo(() => sprints.find((s) => s.status === "ACTIVE"), [sprints]);
  const plannedSprints = useMemo(() => sprints.filter((s) => s.status === "PLANNED"), [sprints]);
  const completedSprints = useMemo(() => sprints.filter((s) => s.status === "COMPLETED"), [sprints]);

  // Create Planned Sprint
  const handleCreateSprint = async () => {
    if (!selectedProject) return;
    try {
      setCreating(true);
      setError(null);
      const name = sprintForm.name.trim() || `Sprint ${sprints.length + 1}`;
      await axiosInstance.post("/api/sprints", {
        name,
        projectId: selectedProject.id,
        goal: sprintForm.goal.trim() || "Delivery of priority features.",
      });
      showSuccessToast("Sprint created successfully");
      setSprintForm({ name: "", goal: "" });
      setCreateModalOpen(false);
      fetchSprints();
    } catch (err: any) {
      console.error(err);
      showErrorToast(err.response?.data?.message || "Failed to create sprint.");
    } finally {
      setCreating(false);
    }
  };

  // Complete Sprint
  const handleCompleteSprint = async (sprintId: string) => {
    try {
      await axiosInstance.put(`/api/sprints/${sprintId}/complete`);
      showSuccessToast("Sprint completed successfully");
      fetchSprints();
    } catch (err: any) {
      console.error(err);
      showErrorToast(err.response?.data?.message || "Failed to complete sprint.");
    }
  };

  // Edit Sprint
  const openEditModal = (sprint: any) => {
    setEditForm({
      id: sprint.id,
      name: sprint.name,
      goal: sprint.goal || "",
      startDate: sprint.startDate ? sprint.startDate.substring(0, 10) : "",
      endDate: sprint.endDate ? sprint.endDate.substring(0, 10) : "",
    });
    setEditModalOpen(true);
  };

  const handleEditSprint = async () => {
    try {
      const body = {
        name: editForm.name,
        goal: editForm.goal,
        startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : null,
        endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : null,
      };
      await axiosInstance.put(`/api/sprints/${editForm.id}`, body);
      setEditModalOpen(false);
      fetchSprints();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update sprint details.");
    }
  };

  // Start Sprint
  const openStartModal = (sprint: any) => {
    setStartForm({
      id: sprint.id,
      name: sprint.name,
      goal: sprint.goal || "",
      startDate: new Date().toISOString().substring(0, 10),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    });
    setStartModalOpen(true);
  };

  const handleStartSprint = async () => {
    try {
      setStarting(true);
      setError(null);
      const bodyUpdate = {
        name: startForm.name,
        goal: startForm.goal,
        startDate: new Date(startForm.startDate).toISOString(),
        endDate: new Date(startForm.endDate).toISOString(),
      };
      await axiosInstance.put(`/api/sprints/${startForm.id}`, bodyUpdate);
      await axiosInstance.put(`/api/sprints/${startForm.id}/start`);
      showSuccessToast("Sprint started successfully");
      setStartModalOpen(false);
      fetchSprints();
    } catch (err: any) {
      console.error(err);
      showErrorToast(err.response?.data?.message || "Failed to start sprint.");
    } finally {
      setStarting(false);
    }
  };

  // Delete Sprint
  const handleDeleteSprint = async (sprintId: string) => {
    try {
      setDeletingMap((prev) => ({ ...prev, [sprintId]: true }));
      setError(null);
      await axiosInstance.delete(`/api/sprints/${sprintId}`);
      showSuccessToast("Sprint deleted successfully");
      setSprints((prev) => prev.filter((s: any) => s.id !== sprintId));
    } catch (err: any) {
      console.error(err);
      showErrorToast(err.response?.data?.message || "Failed to delete sprint.");
    } finally {
      setDeletingMap((prev) => ({ ...prev, [sprintId]: false }));
    }
  };

  if (!selectedProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F8F9] text-sm text-[#626F86]">
        Select a project to manage sprints.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F9] p-4 sm:p-6 lg:p-8 scrollbar-container">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Breadcrumb / Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#626F86]">
              <span>Projects</span>
              <ChevronRight className="h-3 w-3" />
              <span>{selectedProject.name}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#0C66E4] font-medium">Sprints</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-[#172B4D]">Sprint Management</h1>
            <p className="mt-1 text-sm text-[#626F86]">
              Plan work cycles, track completion, and analyze sprint statistics.
            </p>
          </div>
          <Button
            className="bg-[#0C66E4] text-white hover:bg-[#0055CC] font-semibold"
            onClick={() => setCreateModalOpen(true)}
            disabled={loading}
          >
            <Plus className="mr-2 h-4 w-4" /> Create Sprint
          </Button>
        </header>

        {error ? (
          <ErrorState onRetry={fetchSprints} isRetrying={loading} message={error} />
        ) : loading && sprints.length === 0 ? (
          <TableSkeleton rows={4} cols={4} />
        ) : (
          <div className="space-y-8">
            {/* =====================
               ACTIVE SPRINT
               ===================== */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-[#626F86] uppercase tracking-wider">Active Sprint</h2>
              {activeSprint ? (
                <SprintCard
                  sprint={activeSprint}
                  stats={sprintStats[activeSprint.id]}
                  onStart={() => openStartModal(activeSprint)}
                  onComplete={() => handleCompleteSprint(activeSprint.id)}
                  onEdit={() => openEditModal(activeSprint)}
                  isDeleting={deletingMap[activeSprint.id]}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-[#B6C2CF] bg-white p-8 text-center">
                  <Compass className="mx-auto h-8 w-8 text-[#B6C2CF] mb-2" />
                  <p className="font-semibold text-[#172B4D]">No active sprint</p>
                  <p className="text-xs text-[#626F86] mt-1 mb-4">
                    Start a planned sprint from below to begin tracking work cycles.
                  </p>
                </div>
              )}
            </section>

            {/* =====================
               PLANNED SPRINTS
               ===================== */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-[#626F86] uppercase tracking-wider">
                Planned Sprints ({plannedSprints.length})
              </h2>
              {plannedSprints.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#B6C2CF] bg-white p-8 text-center">
                  <ListTodo className="mx-auto h-8 w-8 text-[#B6C2CF] mb-2" />
                  <p className="font-semibold text-[#172B4D]">No planned sprints</p>
                  <p className="text-xs text-[#626F86] mt-1">
                    Create a new planned sprint to begin planning upcoming tasks.
                  </p>
                </div>
              ) : (
                <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar-x hide-scrollbar">
                  {plannedSprints.map((sprint) => (
                    <div key={sprint.id} className="w-[280px] sm:w-[420px] shrink-0">
                      <SprintCard
                        sprint={sprint}
                        stats={sprintStats[sprint.id]}
                        onStart={() => openStartModal(sprint)}
                        onEdit={() => openEditModal(sprint)}
                        onDelete={() => {
                          setSprintToDelete(sprint);
                          setDeleteDialogOpen(true);
                        }}
                        isDeleting={deletingMap[sprint.id]}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* =====================
               COMPLETED SPRINTS
               ===================== */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-[#626F86] uppercase tracking-wider">
                Completed Sprints ({completedSprints.length})
              </h2>
              {completedSprints.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#B6C2CF] bg-white p-6 text-center text-xs text-[#626F86]">
                  No completed sprints yet.
                </div>
              ) : (
                <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar-x hide-scrollbar">
                  {completedSprints.map((sprint) => (
                    <div key={sprint.id} className="w-[280px] sm:w-[420px] shrink-0">
                      <SprintCard
                        sprint={sprint}
                        stats={sprintStats[sprint.id]}
                        onDelete={() => {
                          setSprintToDelete(sprint);
                          setDeleteDialogOpen(true);
                        }}
                        isDeleting={deletingMap[sprint.id]}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* =====================
         MODALS & DIALOGS
         ===================== */}

      {/* Create Sprint Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Sprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-bold uppercase text-[#626F86] mb-1 block">Sprint Name</label>
              <Input
                placeholder="e.g. Sprint 1"
                value={sprintForm.name}
                onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-[#626F86] mb-1 block">Sprint Goal</label>
              <Textarea
                placeholder="What is the objective of this sprint?"
                value={sprintForm.goal}
                onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)} disabled={creating}>Cancel</Button>
            <Button className="bg-[#0C66E4] text-white hover:bg-[#0055CC] flex items-center gap-2" onClick={handleCreateSprint} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sprint Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sprint: {editForm.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-bold uppercase text-[#626F86] mb-1 block">Sprint Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-[#626F86] mb-1 block">Sprint Goal</label>
              <Textarea
                value={editForm.goal}
                onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-[#626F86] mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-[#626F86] mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#0C66E4] text-white hover:bg-[#0055CC]" onClick={handleEditSprint}>
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Sprint Modal */}
      <Dialog open={startModalOpen} onOpenChange={setStartModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Sprint: {startForm.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-bold uppercase text-[#626F86] mb-1 block">Sprint Name</label>
              <Input
                value={startForm.name}
                onChange={(e) => setStartForm({ ...startForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-[#626F86] mb-1 block">Sprint Goal</label>
              <Textarea
                value={startForm.goal}
                placeholder="What is the sprint goal?"
                onChange={(e) => setStartForm({ ...startForm, goal: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-[#626F86] mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={startForm.startDate}
                  onChange={(e) => setStartForm({ ...startForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-[#626F86] mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={startForm.endDate}
                  onChange={(e) => setStartForm({ ...startForm, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStartModalOpen(false)} disabled={starting}>Cancel</Button>
            <Button className="bg-[#0C66E4] text-white hover:bg-[#0055CC] flex items-center gap-2" onClick={handleStartSprint} disabled={starting}>
              {starting && <Loader2 className="h-4 w-4 animate-spin" />}
              Start Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Sprint Dialog is removed and handled inline via card delete buttons */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Sprint"
        description={
          <span>
            Are you sure you want to delete the sprint <strong>{sprintToDelete?.name}</strong>? 
            All issues inside this sprint will be returned to the Backlog. This action cannot be undone.
          </span>
        }
        confirmText="Delete Sprint"
        cancelText="Cancel"
        loading={sprintToDelete ? deletingMap[sprintToDelete.id] : false}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSprintToDelete(null);
        }}
        onConfirm={async () => {
          if (sprintToDelete) {
            await handleDeleteSprint(sprintToDelete.id);
            setDeleteDialogOpen(false);
            setSprintToDelete(null);
          }
        }}
        variant="destructive"
      />
    </div>
  );
}

// Sprint Card component inside page file for quick access
function SprintCard({
  sprint,
  stats,
  onStart,
  onComplete,
  onEdit,
  onDelete,
  isDeleting = false,
}: {
  sprint: any;
  stats?: any;
  onStart?: () => void;
  onComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}) {
  const badgeColors = {
    PLANNED: "bg-gray-100 text-gray-800 border-gray-200",
    ACTIVE: "bg-sky-50 text-sky-700 border-sky-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const badgeClass = badgeColors[sprint.status as keyof typeof badgeColors] || "bg-gray-100 text-gray-800";

  return (
    <Card
      className={`border-[#DFE1E6] bg-white shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-200 ${
        isDeleting ? "opacity-50 pointer-events-none animate-pulse" : ""
      }`}
    >
      <CardHeader className="pb-3 border-b border-[#F4F5F7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold text-[#172B4D]">{sprint.name}</CardTitle>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badgeClass}`}>
              {sprint.status}
            </span>
          </div>
          {sprint.goal && <p className="text-xs text-[#626F86] mt-1.5 leading-snug">Goal: {sprint.goal}</p>}
        </div>

        {((sprint.status !== "COMPLETED" && (onStart || onComplete || onEdit)) || onDelete) && (
          <div className="flex items-center gap-1.5">
            {sprint.status === "PLANNED" && onStart && (
              <Button
                size="sm"
                className="bg-[#0C66E4] hover:bg-[#0055CC] text-white font-semibold flex items-center gap-1"
                onClick={onStart}
                disabled={isDeleting}
              >
                <Play className="h-3 w-3" /> Start
              </Button>
            )}
            {sprint.status === "ACTIVE" && onComplete && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                onClick={onComplete}
                disabled={isDeleting}
              >
                <CheckCircle className="h-3.5 w-3.5" /> Complete
              </Button>
            )}
            {sprint.status === "PLANNED" && onEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-[#626F86]"
                onClick={onEdit}
                disabled={isDeleting}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-600 hover:bg-red-50 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Sprints Details */}
        <div className="flex items-center justify-between text-xs text-[#626F86]">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : "No start date"} -{" "}
            {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : "No end date"}
          </span>
          {sprint.status === "COMPLETED" && (
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              Read Only
            </span>
          )}
        </div>

        {/* Dashboard Statistics mini-grid */}
        {stats ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <StatBlock label="Issues" value={stats.totalIssues} />
              <StatBlock label="Completed" value={stats.completedIssues} status="success" />
              <StatBlock label="Remaining" value={stats.remainingIssues} status="warning" />
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-[#626F86]">
                <span>Completion Percentage</span>
                <span>{Math.round(stats.completionPercentage)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#DFE1E6] overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${stats.completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-[#626F86] italic">
            No statistics available for this sprint.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBlock({ label, value, status }: { label: string; value: number; status?: "success" | "warning" }) {
  const colorClasses = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    default: "bg-[#FAFBFC] text-[#172B4D] border-[#DFE1E6]",
  };

  const colorStyle = colorClasses[status as keyof typeof colorClasses] || colorClasses.default;

  return (
    <div className={`p-2.5 rounded-lg border text-center ${colorStyle}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#626F86] opacity-90">{label}</p>
      <p className="text-lg font-bold mt-1 leading-none">{value}</p>
    </div>
  );
}
