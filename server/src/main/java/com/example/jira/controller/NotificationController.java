package com.example.jira.controller;

import com.example.jira.model.Notification;
import com.example.jira.dto.NotificationPreferenceRequest;
import com.example.jira.dto.ApiResponse;
import com.example.jira.model.User;
import com.example.jira.repository.UserRepository;
import com.example.jira.service.NotificationService;
import org.bson.types.ObjectId;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    /**
     * Get all notifications for the current user/assignee
     * GET /api/notifications/assignee/{assigneeId}
     */
    @GetMapping("/assignee/{assigneeId}")
    public ResponseEntity<List<Notification>> getNotificationsByAssignee(@PathVariable String assigneeId) {
        List<Notification> notifications = notificationService.getNotificationsByAssignee(assigneeId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Get unread notifications for the current user/assignee
     * GET /api/notifications/assignee/{assigneeId}/unread
     */
    @GetMapping("/assignee/{assigneeId}/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(@PathVariable String assigneeId) {
        List<Notification> unreadNotifications = notificationService.getUnreadNotifications(assigneeId);
        return ResponseEntity.ok(unreadNotifications);
    }

    /**
     * Get count of unread notifications for the current user
     * GET /api/notifications/assignee/{assigneeId}/unread-count
     */
    @GetMapping("/assignee/{assigneeId}/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(@PathVariable String assigneeId) {
        long unreadCount = notificationService.getUnreadCount(assigneeId);
        Map<String, Object> response = new HashMap<>();
        response.put("assigneeId", assigneeId);
        response.put("unreadCount", unreadCount);
        return ResponseEntity.ok(response);
    }

    /**
     * Get a specific notification by ID
     * GET /api/notifications/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Notification> getNotification(@PathVariable String id) {
        return notificationService.getNotification(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Mark a notification as read
     * PUT /api/notifications/{id}/read
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable String id) {
        try {
            Notification notification = notificationService.markAsRead(id);
            return ResponseEntity.ok(notification);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/unread")
    public ResponseEntity<Notification> markAsUnread(@PathVariable String id) {
        try {
            Notification notification = notificationService.markAsUnread(id);
            return ResponseEntity.ok(notification);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/users/{userId}/email-preferences")
    public ResponseEntity<ApiResponse> updateEmailPreference(
            @PathVariable String userId,
            @RequestBody NotificationPreferenceRequest request) {
        User user = userRepository.findById(new ObjectId(userId))
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setEmailNotificationsEnabled(request.isEmailNotificationsEnabled());
        User saved = userRepository.save(user);
        return ResponseEntity.ok(new ApiResponse(true, "Email notification preference updated", saved));
    }

    /**
     * Mark all unread notifications for an assignee as read
     * PUT /api/notifications/assignee/{assigneeId}/read-all
     */
    @PutMapping("/assignee/{assigneeId}/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead(@PathVariable String assigneeId) {
        int markedCount = notificationService.markAllAsRead(assigneeId);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Notifications marked as read");
        response.put("count", markedCount);
        response.put("assigneeId", assigneeId);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete a notification
     * DELETE /api/notifications/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteNotification(@PathVariable String id) {
        notificationService.deleteNotification(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Notification deleted successfully");
        response.put("id", id);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete all notifications for an assignee
     * DELETE /api/notifications/assignee/{assigneeId}
     */
    @DeleteMapping("/assignee/{assigneeId}")
    public ResponseEntity<Map<String, Object>> deleteAllByAssignee(@PathVariable String assigneeId) {
        List<Notification> notifications = notificationService.getNotificationsByAssignee(assigneeId);
        int deleteCount = notifications.size();
        
        notificationService.deleteAllByAssignee(assigneeId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "All notifications deleted");
        response.put("deletedCount", deleteCount);
        response.put("assigneeId", assigneeId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get notifications for a specific task
     * GET /api/notifications/task/{taskId}
     */
    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<Notification>> getNotificationsByTask(@PathVariable String taskId) {
        List<Notification> notifications = notificationService.getNotificationsByTask(taskId);
        return ResponseEntity.ok(notifications);
    }
}
