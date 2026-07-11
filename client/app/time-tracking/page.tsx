"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { CalendarDays, Clock3, Edit3, Plus, Timer, Trash2 } from "lucide-react";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { Issue } from "@/types/issues";
import { TimeLog, TimeLogInput } from "@/types/timeTracking";
import TimeLogConfirmDialog from "@/components/TimeLogConfirmDialog";
import TimeLogFormDialog from "@/components/TimeLogFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { TableSkeleton } from "@/components/ui/loader-components";
import { EmptyState, ErrorState } from "@/components/ui/feedback-states";

type PendingAction =
  | { mode: "update"; log: TimeLog; input: TimeLogInput }
  | { mode: "delete"; log: TimeLog };

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) return error.response?.data?.message || error.message;
  return "Something went wrong while managing the work log.";
}

import { pageCache } from "@/lib/pageCache";

export default function TimeTrackingPage() {
  const { user, selectedProject } = useAuth();
  const cacheKeyTasks = `timetracking_tasks_${selectedProject?.id || ""}`;

  const [tasks, setTasks] = useState<Issue[]>(() => {
    if (typeof window !== "undefined" && selectedProject?.id) {
      return pageCache.get(cacheKeyTasks) || [];
    }
    return [];
  });
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [taskHours, setTaskHours] = useState(0);
  const [sprintHours, setSprintHours] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) || null, [tasks, selectedTaskId]);

  const isMember = useMemo(() => {
    if (!selectedProject || !user) return false;
    return selectedProject.ownerId === user.id || selectedProject.memberIds?.includes(user.id);
  }, [selectedProject, user]);

  useEffect(() => {
    if (!selectedProject?.id || !isMember) {
      setTasks([]);
      setSelectedTaskId("");
      return;
    }
    const cachedTasks = pageCache.get(`timetracking_tasks_${selectedProject.id}`);
    if (cachedTasks) {
      setTasks(cachedTasks);
      setSelectedTaskId((current) => cachedTasks.some((task: Issue) => task.id === current) ? current : cachedTasks[0]?.id || "");
    }
    axiosInstance.get(`/api/issues/project/${selectedProject.id}`)
      .then(({ data }) => {
        const nextTasks = data || [];
        setTasks(nextTasks);
        pageCache.set(`timetracking_tasks_${selectedProject.id}`, nextTasks);
        setSelectedTaskId((current) => nextTasks.some((task: Issue) => task.id === current) ? current : nextTasks[0]?.id || "");
      })
      .catch((requestError) => setError(errorMessage(requestError)));
  }, [selectedProject?.id, isMember]);

  const loadLogs = async () => {
    if (!selectedTask) {
      setLogs([]); setTaskHours(0); setSprintHours(0); return;
    }
    const cacheKeyLogs = `timetracking_logs_${selectedTask.id}`;
    const cacheKeyTaskHours = `timetracking_taskHours_${selectedTask.id}`;
    const cacheKeySprintHours = `timetracking_sprintHours_${selectedTask.id}`;
    const hasCache = !!pageCache.get(cacheKeyLogs);

    try {
      if (!hasCache) setLoading(true);
      setError("");
      const [logsRes, taskTotalRes, sprintTotalRes] = await Promise.all([
        axiosInstance.get(`/api/time-logs/task/${selectedTask.id}`),
        axiosInstance.get(`/api/time-logs/task/${selectedTask.id}/total`),
        selectedTask.sprintId ? axiosInstance.get(`/api/time-logs/sprint/${selectedTask.sprintId}/total`) : Promise.resolve({ data: { totalHours: 0 } }),
      ]);
      const nextLogs = logsRes.data || [];
      const nextTaskHours = taskTotalRes.data?.totalHours || 0;
      const nextSprintHours = sprintTotalRes.data?.totalHours || 0;

      setLogs(nextLogs);
      setTaskHours(nextTaskHours);
      setSprintHours(nextSprintHours);

      pageCache.set(cacheKeyLogs, nextLogs);
      pageCache.set(cacheKeyTaskHours, nextTaskHours);
      pageCache.set(cacheKeySprintHours, nextSprintHours);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      if (!hasCache) setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTask) {
      const cachedLogs = pageCache.get(`timetracking_logs_${selectedTask.id}`);
      const cachedTaskHours = pageCache.get(`timetracking_taskHours_${selectedTask.id}`);
      const cachedSprintHours = pageCache.get(`timetracking_sprintHours_${selectedTask.id}`);
      if (cachedLogs !== undefined) {
        setLogs(cachedLogs);
        setTaskHours(cachedTaskHours || 0);
        setSprintHours(cachedSprintHours || 0);
        setLoading(false);
      } else {
        setLogs([]);
        setTaskHours(0);
        setSprintHours(0);
        setLoading(true);
      }
    } else {
      setLogs([]);
      setTaskHours(0);
      setSprintHours(0);
      setLoading(false);
    }
    loadLogs();
  }, [selectedTaskId, selectedTask?.sprintId]);

  const createLog = async (input: TimeLogInput) => {
    if (!selectedTask || !user) return;
    setSaving(true); setError("");
    try {
      await axiosInstance.post("/api/time-logs", { taskId: selectedTask.id, userId: user.id, ...input });
      setFormOpen(false);
      await loadLogs();
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSaving(false); }
  };

  const reviewEdit = (input: TimeLogInput) => {
    if (!editingLog) return;
    setFormOpen(false);
    setPendingAction({ mode: "update", log: editingLog, input });
  };

  const confirmAction = async () => {
    if (!pendingAction || !user) return;
    setSaving(true); setError("");
    try {
      if (pendingAction.mode === "update") {
        await axiosInstance.put(`/api/time-logs/${pendingAction.log.id}`, { userId: user.id, confirmed: true, ...pendingAction.input });
      } else {
        await axiosInstance.delete(`/api/time-logs/${pendingAction.log.id}`, { data: { userId: user.id, confirmed: true } });
      }
      setPendingAction(null);
      setEditingLog(null);
      await loadLogs();
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSaving(false); }
  };

  if (!selectedProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F8F9] text-sm text-[#626F86]">
        Select a project to view time tracking.
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F8F9] text-sm text-[#626F86]">
        You are not a member of this project.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F9] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><p className="text-sm text-[#626F86]">Projects / {selectedProject?.name || "No project selected"}</p><h1 className="mt-1 text-2xl font-semibold text-[#172B4D]">Time tracking</h1><p className="mt-1 text-sm text-[#626F86]">Log work and review task and sprint totals.</p></div>
          <Button className="bg-[#0C66E4] text-white hover:bg-[#0055CC]" disabled={!selectedTask || !user} onClick={() => { setEditingLog(null); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />Log work</Button>
        </header>

        {error && !loading && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{error}</span>
            <button className="font-semibold" onClick={() => setError("")}>Dismiss</button>
          </div>
        )}

        <Card className="gap-4 py-5">
          <CardContent>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#626F86]">Task</label>
            <select className="h-10 w-full rounded-md border border-[#B6C2CF] bg-white px-3 text-sm text-[#172B4D] focus:border-[#0C66E4] sm:max-w-xl" value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}>
              {!tasks.length && <option value="">No tasks in this project</option>}
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.key || task.id} - {task.title}</option>)}
            </select>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard icon={<Clock3 className="h-5 w-5" />} label="Task hours" value={taskHours} detail={selectedTask?.key || "Select a task"} />
          <SummaryCard icon={<Timer className="h-5 w-5" />} label="Sprint hours" value={sprintHours} detail={selectedTask?.sprintId ? "Current task sprint" : "Task is not assigned to a sprint"} />
        </div>

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-5"><CardTitle className="text-base text-[#172B4D]">Work logs</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4">
                <TableSkeleton rows={4} cols={5} />
              </div>
            ) : error ? (
              <div className="p-6">
                <ErrorState 
                  message={error} 
                  onRetry={loadLogs} 
                  isRetrying={loading} 
                />
              </div>
            ) : !logs.length ? (
              <EmptyState 
                type="default" 
                title="No work logged yet" 
                description="Add the first work log for this task."
                action={selectedTask && user ? {
                  label: "Log work",
                  onClick: () => { setEditingLog(null); setFormOpen(true); }
                } : undefined}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[600px] md:min-w-full">
                  <TableHeader><TableRow className="bg-[#F7F8F9]"><TableHead className="px-5">Date</TableHead><TableHead>User</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Hours</TableHead><TableHead className="px-5 text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>{logs.map((log) => <TableRow key={log.id}><TableCell className="px-5"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#626F86]" />{new Date(`${log.date}T00:00:00`).toLocaleDateString()}</span></TableCell><TableCell><Badge variant="secondary">{log.userId === user?.id ? "You" : log.userId}</Badge></TableCell><TableCell className="max-w-md whitespace-normal text-[#42526E]">{log.description || "No description"}</TableCell><TableCell className="text-right font-semibold text-[#172B4D]">{log.durationHours}h</TableCell><TableCell className="px-5"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label="Edit work log" onClick={() => { setEditingLog(log); setFormOpen(true); }}><Edit3 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700" aria-label="Delete work log" onClick={() => setPendingAction({ mode: "delete", log })}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}</TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TimeLogFormDialog open={formOpen} log={editingLog} saving={saving} onOpenChange={(open) => { setFormOpen(open); if (!open && !pendingAction) setEditingLog(null); }} onSubmit={editingLog ? reviewEdit : createLog} />
      <TimeLogConfirmDialog open={!!pendingAction} mode={pendingAction?.mode || "update"} loading={saving} onCancel={() => setPendingAction(null)} onConfirm={confirmAction} />
    </div>
  );
}

function SummaryCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return <Card className="gap-3 py-5"><CardContent><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#DEEBFF] text-[#0C66E4]">{icon}</div><div><p className="text-xs font-bold uppercase tracking-wide text-[#626F86]">{label}</p><p className="mt-1 text-2xl font-semibold text-[#172B4D]">{value}h</p></div></div><p className="mt-3 text-xs text-[#626F86]">{detail}</p></CardContent></Card>;
}
