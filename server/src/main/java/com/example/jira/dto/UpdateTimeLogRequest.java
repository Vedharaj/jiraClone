package com.example.jira.dto;

import java.time.LocalDate;

public class UpdateTimeLogRequest {
    private String userId;
    private LocalDate date;
    private double durationHours;
    private String description;
    private boolean confirmed;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public double getDurationHours() { return durationHours; }
    public void setDurationHours(double durationHours) { this.durationHours = durationHours; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isConfirmed() { return confirmed; }
    public void setConfirmed(boolean confirmed) { this.confirmed = confirmed; }
}
