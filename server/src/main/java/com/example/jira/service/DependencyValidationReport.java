package com.example.jira.service;

import com.example.jira.model.Issue;

import java.util.List;

/**
 * Comprehensive validation report for a task's dependency status
 * Includes current state, validation results, and blockers
 */
public class DependencyValidationReport {
    private String taskId;
    private String taskTitle;
    private String currentStatus;
    private boolean canMoveToInProgress;
    private boolean canMarkAsDone;
    private List<String> inProgressBlockers;
    private List<String> doneBlockers;
    private List<Issue> blockingIssues;
    private List<Issue> dependentIssues;
    private boolean graphValid;

    public DependencyValidationReport() {
    }

    public DependencyValidationReport(String taskId, String taskTitle, String currentStatus) {
        this.taskId = taskId;
        this.taskTitle = taskTitle;
        this.currentStatus = currentStatus;
    }

    // Getters and Setters
    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getTaskTitle() {
        return taskTitle;
    }

    public void setTaskTitle(String taskTitle) {
        this.taskTitle = taskTitle;
    }

    public String getCurrentStatus() {
        return currentStatus;
    }

    public void setCurrentStatus(String currentStatus) {
        this.currentStatus = currentStatus;
    }

    public boolean isCanMoveToInProgress() {
        return canMoveToInProgress;
    }

    public void setCanMoveToInProgress(boolean canMoveToInProgress) {
        this.canMoveToInProgress = canMoveToInProgress;
    }

    public boolean isCanMarkAsDone() {
        return canMarkAsDone;
    }

    public void setCanMarkAsDone(boolean canMarkAsDone) {
        this.canMarkAsDone = canMarkAsDone;
    }

    public List<String> getInProgressBlockers() {
        return inProgressBlockers;
    }

    public void setInProgressBlockers(List<String> inProgressBlockers) {
        this.inProgressBlockers = inProgressBlockers;
    }

    public List<String> getDoneBlockers() {
        return doneBlockers;
    }

    public void setDoneBlockers(List<String> doneBlockers) {
        this.doneBlockers = doneBlockers;
    }

    public List<Issue> getBlockingIssues() {
        return blockingIssues;
    }

    public void setBlockingIssues(List<Issue> blockingIssues) {
        this.blockingIssues = blockingIssues;
    }

    public List<Issue> getDependentIssues() {
        return dependentIssues;
    }

    public void setDependentIssues(List<Issue> dependentIssues) {
        this.dependentIssues = dependentIssues;
    }

    public boolean isGraphValid() {
        return graphValid;
    }

    public void setGraphValid(boolean graphValid) {
        this.graphValid = graphValid;
    }

    /**
     * Get summary of validation status
     */
    public String getSummary() {
        StringBuilder summary = new StringBuilder();
        summary.append("Task: ").append(taskTitle).append(" [").append(taskId).append("]\n");
        summary.append("Current Status: ").append(currentStatus).append("\n");
        summary.append("Can move to IN_PROGRESS: ").append(canMoveToInProgress).append("\n");
        summary.append("Can mark as DONE: ").append(canMarkAsDone).append("\n");
        summary.append("Dependency Graph Valid: ").append(graphValid).append("\n");

        if (blockingIssues != null && !blockingIssues.isEmpty()) {
            summary.append("Blocking Issues: ").append(blockingIssues.size()).append("\n");
        }

        if (dependentIssues != null && !dependentIssues.isEmpty()) {
            summary.append("Dependent Issues: ").append(dependentIssues.size()).append("\n");
        }

        return summary.toString();
    }
}
