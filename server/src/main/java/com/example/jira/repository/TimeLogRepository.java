package com.example.jira.repository;

import com.example.jira.model.TimeLog;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TimeLogRepository extends MongoRepository<TimeLog, ObjectId> {
    List<TimeLog> findByTaskIdOrderByDateDescCreatedAtDesc(String taskId);
    List<TimeLog> findByTaskIdIn(List<String> taskIds);
}
