package com.example.jira.dto;

import java.util.List;

public class UpdateSubtaskRequest {
    private String title;
    private String description;
    private String status;
    private String priority;
    private String assigneeId;
    private int order;
    private List<String> comments;

    public UpdateSubtaskRequest() {}

    public UpdateSubtaskRequest(String title, String description, String status, String priority,
                                String assigneeId, int order, List<String> comments) {
        this.title = title;
        this.description = description;
        this.status = status;
        this.priority = priority;
        this.assigneeId = assigneeId;
        this.order = order;
        this.comments = comments;
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getAssigneeId() { return assigneeId; }
    public void setAssigneeId(String assigneeId) { this.assigneeId = assigneeId; }

    public int getOrder() { return order; }
    public void setOrder(int order) { this.order = order; }

    public List<String> getComments() { return comments; }
    public void setComments(List<String> comments) { this.comments = comments; }
}
