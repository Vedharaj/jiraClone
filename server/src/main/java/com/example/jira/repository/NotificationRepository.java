package com.example.jira.repository;

import com.example.jira.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    /**
     * Find all notifications for a specific assignee
     */
    List<Notification> findByAssigneeId(String assigneeId);

    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    /**
     * Find unread notifications for a specific assignee
     */
    List<Notification> findByAssigneeIdAndStatus(String assigneeId, String status);

    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(String userId);

    /**
     * Find all notifications for a specific task
     */
    List<Notification> findByTaskId(String taskId);

    /**
     * Find notifications about a specific blocked task
     */
    List<Notification> findByBlockedByTaskId(String blockedByTaskId);

    /**
     * Count unread notifications for an assignee
     */
    long countByAssigneeIdAndStatus(String assigneeId, String status);

    long countByUserIdAndReadFalse(String userId);

    boolean existsByEventKeyAndUserId(String eventKey, String userId);
}
