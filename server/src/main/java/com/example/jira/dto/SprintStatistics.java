package com.example.jira.dto;

public class SprintStatistics {
    private int totalIssues;
    private int completedIssues;
    private int remainingIssues;
    private double completionPercentage;

    public SprintStatistics() {}

    public SprintStatistics(int totalIssues, int completedIssues, int remainingIssues, double completionPercentage) {
        this.totalIssues = totalIssues;
        this.completedIssues = completedIssues;
        this.remainingIssues = remainingIssues;
        this.completionPercentage = completionPercentage;
    }

    public int getTotalIssues() { return totalIssues; }
    public void setTotalIssues(int totalIssues) { this.totalIssues = totalIssues; }

    public int getCompletedIssues() { return completedIssues; }
    public void setCompletedIssues(int completedIssues) { this.completedIssues = completedIssues; }

    public int getRemainingIssues() { return remainingIssues; }
    public void setRemainingIssues(int remainingIssues) { this.remainingIssues = remainingIssues; }

    public double getCompletionPercentage() { return completionPercentage; }
    public void setCompletionPercentage(double completionPercentage) { this.completionPercentage = completionPercentage; }
}
