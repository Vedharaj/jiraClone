package com.example.jira.dto;

import java.util.List;

public class DependencyResponse {
    private String taskId;
    private String title;
    private String status;
    private List<String> dependencyIds;
    private List<String> blockedTaskIds;
    private int dependenciesCount;
    private int blockedCount;

    public DependencyResponse() {}

    public DependencyResponse(String taskId, String title, String status,
                            List<String> dependencyIds, List<String> blockedTaskIds) {
        this.taskId = taskId;
        this.title = title;
        this.status = status;
        this.dependencyIds = dependencyIds;
        this.blockedTaskIds = blockedTaskIds;
        this.dependenciesCount = dependencyIds != null ? dependencyIds.size() : 0;
        this.blockedCount = blockedTaskIds != null ? blockedTaskIds.size() : 0;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<String> getDependencyIds() {
        return dependencyIds;
    }

    public void setDependencyIds(List<String> dependencyIds) {
        this.dependencyIds = dependencyIds;
        this.dependenciesCount = dependencyIds != null ? dependencyIds.size() : 0;
    }

    public List<String> getBlockedTaskIds() {
        return blockedTaskIds;
    }

    public void setBlockedTaskIds(List<String> blockedTaskIds) {
        this.blockedTaskIds = blockedTaskIds;
        this.blockedCount = blockedTaskIds != null ? blockedTaskIds.size() : 0;
    }

    public int getDependenciesCount() {
        return dependenciesCount;
    }

    public void setDependenciesCount(int dependenciesCount) {
        this.dependenciesCount = dependenciesCount;
    }

    public int getBlockedCount() {
        return blockedCount;
    }

    public void setBlockedCount(int blockedCount) {
        this.blockedCount = blockedCount;
    }
}
