package com.example.jira.dto;



public class CreateSubtaskRequest {
    private String title;
    private String description;
    private String type;
    private String priority;
    private String assigneeId;
    private String parentTaskId;
    private int order;

    public CreateSubtaskRequest() {}

    public CreateSubtaskRequest(String title, String description, String type, String priority,
                                String assigneeId, String parentTaskId, int order) {
        this.title = title;
        this.description = description;
        this.type = type;
        this.priority = priority;
        this.assigneeId = assigneeId;
        this.parentTaskId = parentTaskId;
        this.order = order;
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getAssigneeId() { return assigneeId; }
    public void setAssigneeId(String assigneeId) { this.assigneeId = assigneeId; }

    public String getParentTaskId() { return parentTaskId; }
    public void setParentTaskId(String parentTaskId) { this.parentTaskId = parentTaskId; }

    public int getOrder() { return order; }
    public void setOrder(int order) { this.order = order; }
}
