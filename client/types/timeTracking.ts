export interface TimeLog {
  id: string;
  taskId: string;
  userId: string;
  date: string;
  durationHours: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeLogInput {
  date: string;
  durationHours: number;
  description: string;
}

export interface TimeSummary {
  scope: "TASK" | "SPRINT";
  scopeId: string;
  totalHours: number;
}
