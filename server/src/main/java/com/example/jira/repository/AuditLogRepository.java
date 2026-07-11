package com.example.jira.repository;

import com.example.jira.model.AuditLog;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, ObjectId> {
    List<AuditLog> findTop5ByEntityTypeAndEntityIdOrderByTimestampDesc(String entityType, String entityId);
}
