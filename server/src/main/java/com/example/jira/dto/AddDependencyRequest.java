package com.example.jira.dto;

public class AddDependencyRequest {
    private String taskId;
    private String dependencyTaskId;

    public AddDependencyRequest() {}

    public AddDependencyRequest(String taskId, String dependencyTaskId) {
        this.taskId = taskId;
        this.dependencyTaskId = dependencyTaskId;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getDependencyTaskId() {
        return dependencyTaskId;
    }

    public void setDependencyTaskId(String dependencyTaskId) {
        this.dependencyTaskId = dependencyTaskId;
    }
}
