package com.example.jira.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Notification entity for task dependency resolution
 * Notifies assignees when their tasks' dependencies are completed
 */
@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;

    // Notification details
    private String title;
    private String message;
    private String type; // e.g., "DEPENDENCIES_RESOLVED", "TASK_ASSIGNED", "TASK_COMPLETED"
    private String eventKey;

    // References
    private String userId;
    private String assigneeId; // Who should receive this notification
    private String taskId; // The task that can now be worked on
    private String projectId;
    private String blockedByTaskId; // The task that was just completed

    // Status
    private boolean read;
    private String status; // "UNREAD" or "READ"

    // Metadata
    private Instant createdAt;
    private Instant readAt;

    public Notification() {
        this.createdAt = Instant.now();
        this.status = "UNREAD";
    }

    public Notification(String title, String message, String type, String assigneeId, String taskId, String blockedByTaskId) {
        this();
        this.title = title;
        this.message = message;
        this.type = type;
        this.assigneeId = assigneeId;
        this.userId = assigneeId;
        this.taskId = taskId;
        this.blockedByTaskId = blockedByTaskId;
    }

    public Notification(String userId, String title, String message, String type, String taskId, String projectId, String eventKey) {
        this();
        this.userId = userId;
        this.assigneeId = userId;
        this.title = title;
        this.message = message;
        this.type = type;
        this.taskId = taskId;
        this.projectId = projectId;
        this.eventKey = eventKey;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getEventKey() {
        return eventKey;
    }

    public void setEventKey(String eventKey) {
        this.eventKey = eventKey;
    }

    public String getUserId() {
        return userId != null ? userId : assigneeId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
        this.assigneeId = userId;
    }

    public String getAssigneeId() {
        return assigneeId;
    }

    public void setAssigneeId(String assigneeId) {
        this.assigneeId = assigneeId;
        if (this.userId == null) {
            this.userId = assigneeId;
        }
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getBlockedByTaskId() {
        return blockedByTaskId;
    }

    public void setBlockedByTaskId(String blockedByTaskId) {
        this.blockedByTaskId = blockedByTaskId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
        this.read = "READ".equals(status);
    }

    public boolean isRead() {
        return read || "READ".equals(status);
    }

    public void setRead(boolean read) {
        this.read = read;
        this.status = read ? "READ" : "UNREAD";
        this.readAt = read ? Instant.now() : null;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public void setReadAt(Instant readAt) {
        this.readAt = readAt;
    }

    /**
     * Mark this notification as read
     */
    public void markAsRead() {
        this.read = true;
        this.status = "READ";
        this.readAt = Instant.now();
    }

    public void markAsUnread() {
        this.read = false;
        this.status = "UNREAD";
        this.readAt = null;
    }

    /**
     * Check if notification is unread
     */
    public boolean isUnread() {
        return !isRead();
    }
}
