package com.example.jira.dto;

import java.time.LocalDate;

public class CreateTimeLogRequest {
    private String taskId;
    private String userId;
    private LocalDate date;
    private double durationHours;
    private String description;

    public String getTaskId() { return taskId; }
    public void setTaskId(String taskId) { this.taskId = taskId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public double getDurationHours() { return durationHours; }
    public void setDurationHours(double durationHours) { this.durationHours = durationHours; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
