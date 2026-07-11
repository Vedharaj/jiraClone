package com.example.jira.dto;

public class DeleteTimeLogRequest {
    private String userId;
    private boolean confirmed;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public boolean isConfirmed() { return confirmed; }
    public void setConfirmed(boolean confirmed) { this.confirmed = confirmed; }
}
