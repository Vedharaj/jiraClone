export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  emailNotificationsEnabled?: boolean;
}

export interface Issue {
  parentTitle?: string | null;
  id: string;
  key?: string;
  title: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  sprintId?: string | null;
  reporterId?: string;
  assigneeId?: string | null;
  parentTaskId?: string | null;
  isSubtask?: boolean;
  subTaskIds?: string[];
  dependencyIds?: string[];
  blockedTaskIds?: string[];
  order?: number;
  dueDate?: string;
  comments?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type IssueStatus = "TODO" | "IN_PROGRESS" | "DONE" | string;

export interface IssueRelations {
  parent: Issue | null;
  subtasks: Issue[];
  blockedBy: Issue[];
  blocking: Issue[];
}

export interface SubtaskProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  assigneeId: string;
  userId?: string;
  taskId: string;
  projectId?: string;
  blockedByTaskId?: string;
  status: string;
  read?: boolean;
  createdAt?: string;
  readAt?: string;
}

export interface ValidationResult {
  valid: boolean;
  code: string;
  message: string;
  blockedByIds?: string[];
  blockedCount?: number;
  blockingReason?: string;
}
