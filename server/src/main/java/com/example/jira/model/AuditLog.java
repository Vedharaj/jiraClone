package com.example.jira.model;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Document(collection = "audit_logs")
public class AuditLog {
    @Id
    private ObjectId id;
    private String entityType;
    private String entityId;
    private String action;
    private String userId;
    private Instant timestamp;
    private Map<String, Object> oldValue;
    private Map<String, Object> newValue;

    public AuditLog() {}

    public AuditLog(String entityType, String entityId, String action, String userId,
                    Map<String, Object> oldValue, Map<String, Object> newValue) {
        this.entityType = entityType;
        this.entityId = entityId;
        this.action = action;
        this.userId = userId;
        this.timestamp = Instant.now();
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    public String getId() { return id != null ? id.toHexString() : null; }
    public String getEntityType() { return entityType; }
    public String getEntityId() { return entityId; }
    public String getAction() { return action; }
    public String getUserId() { return userId; }
    public Instant getTimestamp() { return timestamp; }
    public Map<String, Object> getOldValue() { return oldValue; }
    public Map<String, Object> getNewValue() { return newValue; }
}
