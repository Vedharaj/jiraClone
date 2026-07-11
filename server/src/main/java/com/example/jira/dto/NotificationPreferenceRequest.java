package com.example.jira.dto;

public class NotificationPreferenceRequest {
    private boolean emailNotificationsEnabled;

    public boolean isEmailNotificationsEnabled() {
        return emailNotificationsEnabled;
    }

    public void setEmailNotificationsEnabled(boolean emailNotificationsEnabled) {
        this.emailNotificationsEnabled = emailNotificationsEnabled;
    }
}
