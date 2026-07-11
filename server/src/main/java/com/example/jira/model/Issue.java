package com.example.jira.model;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "issues")
public class Issue {

    @Id
    private ObjectId id;

    private String key;
    private String title;
    private String description;
    private String type;        
    private String status;      
    private String priority;    
    private String projectId;
    private String sprintId;
    private String reporterId;
    private String assigneeId;
    private String parentTaskId;
    private Boolean isSubtask;
    private List<String> subTaskIds;
    private List<String> dependencyIds;
    private List<String> blockedTaskIds;
    private int order;
    private Instant dueDate;

    private List<String> comments;

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    public Issue() {
    }

    public Issue(String key, String title, String description, String type, String status, String priority,
            String projectId, String sprintId, String reporterId, String assigneeId, String parentTaskId, Boolean isSubtask,
            List<String> subTaskIds, List<String> dependencyIds, List<String> blockedTaskIds, int order,
            List<String> comments) {
        this.key = key;
        this.title = title;
        this.description = description;
        this.type = type;
        this.status = status;
        this.priority = priority;
        this.projectId = projectId;
        this.sprintId = sprintId;
        this.reporterId = reporterId;
        this.assigneeId = assigneeId;
        this.parentTaskId = parentTaskId;
        this.isSubtask = isSubtask;
        this.subTaskIds = subTaskIds;
        this.dependencyIds = dependencyIds;
        this.blockedTaskIds = blockedTaskIds;
        this.order = order;
        this.comments = comments;
    }

    public String getId() {
        return id != null ? id.toHexString() : null;
    }

    public ObjectId getObjectId() {
        return id;
    }

    public void setId(ObjectId id) {
        this.id = id;
    }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getSprintId() { return sprintId; }
    public void setSprintId(String sprintId) { this.sprintId = sprintId; }

    public String getReporterId() { return reporterId; }
    public void setReporterId(String reporterId) { this.reporterId = reporterId; }

    public String getAssigneeId() { return assigneeId; }
    public void setAssigneeId(String assigneeId) { this.assigneeId = assigneeId; }

    public String getParentTaskId() { return parentTaskId; }
    public void setParentTaskId(String parentTaskId) { this.parentTaskId = parentTaskId; }

    public Boolean getIsSubtask() { return isSubtask; }
    public void setIsSubtask(Boolean isSubtask) { this.isSubtask = isSubtask; }

    public List<String> getSubTaskIds() { return subTaskIds; }
    public void setSubTaskIds(List<String> subTaskIds) { this.subTaskIds = subTaskIds; }

    public List<String> getDependencyIds() { return dependencyIds; }
    public void setDependencyIds(List<String> dependencyIds) { this.dependencyIds = dependencyIds; }

    public List<String> getBlockedTaskIds() { return blockedTaskIds; }
    public void setBlockedTaskIds(List<String> blockedTaskIds) { this.blockedTaskIds = blockedTaskIds; }

    public int getOrder() { return order; }
    public void setOrder(int order) { this.order = order; }

    public Instant getDueDate() { return dueDate; }
    public void setDueDate(Instant dueDate) { this.dueDate = dueDate; }

    public List<String> getComments() { return comments; }
    public void setComments(List<String> comments) { this.comments = comments; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
