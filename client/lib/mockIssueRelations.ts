import { Issue, NotificationItem } from "@/types/issues";

export const mockParentTask: Issue = {
  id: "task-101",
  key: "TASK-101",
  title: "Launch the customer onboarding flow",
  status: "IN_PROGRESS",
  priority: "HIGH",
  type: "STORY",
};

export const mockSubtasks: Issue[] = [
  { id: "task-102", key: "TASK-102", title: "Build account checklist", status: "DONE", assigneeId: "Maya", type: "TASK" },
  { id: "task-103", key: "TASK-103", title: "Add product tour", status: "IN_PROGRESS", assigneeId: "Noah", type: "TASK" },
  { id: "task-104", key: "TASK-104", title: "Instrument activation events", status: "TODO", assigneeId: "Ava", type: "TASK" },
];

export const mockNotifications: NotificationItem[] = [
  {
    id: "notification-1",
    title: "Task unblocked",
    message: "TASK-101 completed. TASK-205 is now unblocked.",
    type: "TASK_UNBLOCKED",
    assigneeId: "user-1",
    taskId: "task-205",
    blockedByTaskId: "task-101",
    status: "UNREAD",
    createdAt: new Date().toISOString(),
  },
];
