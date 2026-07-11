"use client";

import React from "react";
import { FolderOpen, Inbox, FileWarning, RefreshCw, AlertOctagon, HelpCircle, BellOff, Users } from "lucide-react";
import { Button } from "./button";

export type EmptyStateType = "tasks" | "projects" | "sprints" | "notifications" | "attachments" | "members" | "default";

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const config: Record<EmptyStateType, { icon: React.ReactNode; title: string; description: string }> = {
  tasks: {
    icon: <Inbox className="mx-auto h-12 w-12 text-[#626F86] stroke-[1.5]" />,
    title: "No tasks found",
    description: "Break down your work into tasks, bugs, or stories to get started.",
  },
  projects: {
    icon: <FolderOpen className="mx-auto h-12 w-12 text-[#626F86] stroke-[1.5]" />,
    title: "No projects yet",
    description: "Create your first project to organize your team and track work items.",
  },
  sprints: {
    icon: <FolderOpen className="mx-auto h-12 w-12 text-[#626F86] stroke-[1.5]" />,
    title: "No sprints available",
    description: "Sprints help teams manage tasks in cycles. Create a new sprint to get started.",
  },
  notifications: {
    icon: <BellOff className="mx-auto h-12 w-12 text-[#626F86] stroke-[1.5]" />,
    title: "All caught up!",
    description: "No new activity or blocking tasks require your attention right now.",
  },
  attachments: {
    icon: <FileWarning className="mx-auto h-12 w-12 text-[#626F86] stroke-[1.5]" />,
    title: "No attachments yet",
    description: "Upload PDFs, PNGs, JPEGs, or Word documents up to 10MB.",
  },
  members: {
    icon: <Users className="mx-auto h-12 w-12 text-[#626F86] stroke-[1.5]" />,
    title: "No team members",
    description: "Invite other project members to collaborate on this project.",
  },
  default: {
    icon: <HelpCircle className="mx-auto h-12 w-12 text-[#626F86] stroke-[1.5]" />,
    title: "No data available",
    description: "There is nothing to display here at the moment.",
  },
};

export const EmptyState = ({ type = "default", title, description, action }: EmptyStateProps) => {
  const currentConfig = config[type];
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#DFE1E6] bg-[#F7F8F9] rounded-lg min-h-[220px]">
      {currentConfig.icon}
      <h3 className="mt-4 text-base font-semibold text-[#172B4D]">
        {title || currentConfig.title}
      </h3>
      <p className="mt-2 text-sm text-[#626F86] max-w-sm">
        {description || currentConfig.description}
      </p>
      {action && (
        <Button 
          onClick={action.onClick}
          className="mt-5 bg-[#0052CC] text-white hover:bg-[#0747A6] font-medium"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const ErrorState = ({ 
  title = "Something went wrong", 
  message = "An error occurred while loading this section. Please check your network connection and try again.", 
  onRetry,
  isRetrying = false
}: ErrorStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-red-200 bg-red-50/50 rounded-lg min-h-[220px] max-w-lg mx-auto">
      <AlertOctagon className="h-12 w-12 text-red-500 stroke-[1.5]" />
      <h3 className="mt-4 text-base font-semibold text-[#172B4D]">
        {title}
      </h3>
      <p className="mt-2 text-sm text-red-700/80">
        {message}
      </p>
      {onRetry && (
        <Button 
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-5 bg-red-600 text-white hover:bg-red-700 font-medium flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
          {isRetrying ? "Retrying..." : "Try Again"}
        </Button>
      )}
    </div>
  );
};
