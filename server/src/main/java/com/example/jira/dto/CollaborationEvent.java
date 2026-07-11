package com.example.jira.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class CollaborationEvent {
    private String eventId = UUID.randomUUID().toString();
    private String type;
    private String projectId;
    private String taskId;
    private String actorId;
    private Instant createdAt = Instant.now();
    private Map<String, Object> payload;

    public CollaborationEvent() {}

    public CollaborationEvent(String type, String projectId, String taskId, String actorId, Map<String, Object> payload) {
        this.type = type;
        this.projectId = projectId;
        this.taskId = taskId;
        this.actorId = actorId;
        this.payload = payload;
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getTaskId() { return taskId; }
    public void setTaskId(String taskId) { this.taskId = taskId; }

    public String getActorId() { return actorId; }
    public void setActorId(String actorId) { this.actorId = actorId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Map<String, Object> getPayload() { return payload; }
    public void setPayload(Map<String, Object> payload) { this.payload = payload; }
}
