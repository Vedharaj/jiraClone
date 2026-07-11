package com.example.jira.service;

import com.example.jira.dto.CollaborationEvent;
import com.example.jira.model.Issue;
import com.example.jira.model.Notification;
import com.example.jira.model.Project;
import com.example.jira.model.User;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.NotificationRepository;
import com.example.jira.repository.Projectrepository;
import com.example.jira.repository.UserRepository;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final IssueRepository issueRepository;
    private final UserRepository userRepository;
    private final Projectrepository projectRepository;
    private final EmailService emailService;
    private final CollaborationService collaborationService;

    public NotificationService(
            NotificationRepository notificationRepository,
            IssueRepository issueRepository,
            UserRepository userRepository,
            Projectrepository projectRepository,
            EmailService emailService,
            CollaborationService collaborationService) {
        this.notificationRepository = notificationRepository;
        this.issueRepository = issueRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.emailService = emailService;
        this.collaborationService = collaborationService;
    }

    public Notification createNotification(String title, String message, String type,
                                           String assigneeId, String taskId, String blockedByTaskId) {
        String eventKey = String.join(":", type, nullToEmpty(assigneeId), nullToEmpty(taskId), nullToEmpty(blockedByTaskId));
        return notifyUser(assigneeId, title, message, type, taskId, null, eventKey);
    }

    public Notification notifyUser(String userId, String title, String message, String type,
                                   String taskId, String projectId, String eventKey) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        if (eventKey != null && notificationRepository.existsByEventKeyAndUserId(eventKey, userId)) {
            return null;
        }

        Notification notification = new Notification(userId, title, message, type, taskId, projectId, eventKey);
        Notification saved = notificationRepository.save(notification);
        sendEmailIfEnabled(userId, title, message);

        if (projectId != null) {
            collaborationService.broadcast(new CollaborationEvent(
                    "NOTIFICATION_CREATED",
                    projectId,
                    taskId,
                    null,
                    Map.of("notification", saved)));
        }
        return saved;
    }

    public void notifyProjectMembers(String projectId, String title, String message, String type, String eventKeyPrefix) {
        Project project = findProject(projectId);
        if (project == null) {
            return;
        }
        for (String userId : projectMemberIds(project)) {
            notifyUser(userId, title, message, type, null, projectId, eventKeyPrefix + ":" + userId);
        }
    }

    public void handleTaskCreated(Issue issue) {
        if (issue == null) {
            return;
        }
        collaborationService.broadcast(new CollaborationEvent(
                "TASK_CREATED",
                issue.getProjectId(),
                issue.getId(),
                issue.getReporterId(),
                Map.of("issue", issue)));

        if (issue.getAssigneeId() != null) {
            notifyUser(
                    issue.getAssigneeId(),
                    "Task assigned",
                    "You were assigned to \"" + issue.getTitle() + "\".",
                    "TASK_ASSIGNMENT",
                    issue.getId(),
                    issue.getProjectId(),
                    "TASK_ASSIGNMENT:" + issue.getId() + ":" + issue.getAssigneeId());
        }
    }

    public void handleTaskUpdated(Issue previous, Issue updated) {
        if (updated == null) {
            return;
        }
        String eventType = previous != null && !nullToEmpty(previous.getStatus()).equals(nullToEmpty(updated.getStatus()))
                ? "TASK_STATUS_CHANGED"
                : "TASK_UPDATED";

        collaborationService.broadcast(new CollaborationEvent(
                eventType,
                updated.getProjectId(),
                updated.getId(),
                updated.getReporterId(),
                Map.of("issue", updated, "previousStatus", previous != null ? nullToEmpty(previous.getStatus()) : "")));

        if (previous != null && !nullToEmpty(previous.getStatus()).equals(nullToEmpty(updated.getStatus()))) {
            notifyUser(
                    updated.getAssigneeId(),
                    "Task status changed",
                    "\"" + updated.getTitle() + "\" moved to " + nullToEmpty(updated.getStatus()).replace("_", " ") + ".",
                    "TASK_STATUS_CHANGE",
                    updated.getId(),
                    updated.getProjectId(),
                    "TASK_STATUS_CHANGE:" + updated.getId() + ":" + updated.getStatus());
        }

        if (previous != null && !nullToEmpty(previous.getAssigneeId()).equals(nullToEmpty(updated.getAssigneeId()))) {
            notifyUser(
                    updated.getAssigneeId(),
                    "Task assigned",
                    "You were assigned to \"" + updated.getTitle() + "\".",
                    "TASK_ASSIGNMENT",
                    updated.getId(),
                    updated.getProjectId(),
                    "TASK_ASSIGNMENT:" + updated.getId() + ":" + updated.getAssigneeId());
        }
    }

    public void handleCommentAdded(Issue issue, String actorId, String comment) {
        if (issue == null) {
            return;
        }
        collaborationService.broadcast(new CollaborationEvent(
                "COMMENT_ADDED",
                issue.getProjectId(),
                issue.getId(),
                actorId,
                Map.of("issueId", issue.getId(), "comment", comment, "comments", issue.getComments())));
    }

    public void handleSprintStarted(String sprintId, String projectId, String sprintName) {
        notifyProjectMembers(projectId, "Sprint started", "\"" + sprintName + "\" has started.", "SPRINT_START",
                "SPRINT_START:" + sprintId);
        collaborationService.broadcast(new CollaborationEvent("SPRINT_STARTED", projectId, null, null,
                Map.of("sprintId", sprintId, "name", sprintName)));
    }

    public void handleSprintEnded(String sprintId, String projectId, String sprintName) {
        notifyProjectMembers(projectId, "Sprint ended", "\"" + sprintName + "\" has ended.", "SPRINT_END",
                "SPRINT_END:" + sprintId);
        collaborationService.broadcast(new CollaborationEvent("SPRINT_ENDED", projectId, null, null,
                Map.of("sprintId", sprintId, "name", sprintName)));
    }

    public void handleTaskCompletion(String completedTaskId) {
        Optional<Issue> completedTaskOpt = issueRepository.findById(new ObjectId(completedTaskId));
        if (completedTaskOpt.isEmpty()) {
            return;
        }

        Issue completedTask = completedTaskOpt.get();
        if (completedTask.getBlockedTaskIds() == null || completedTask.getBlockedTaskIds().isEmpty()) {
            return;
        }

        for (String blockedTaskId : completedTask.getBlockedTaskIds()) {
            Optional<Issue> blockedTaskOpt = issueRepository.findById(new ObjectId(blockedTaskId));
            if (blockedTaskOpt.isEmpty()) {
                continue;
            }

            Issue blockedTask = blockedTaskOpt.get();
            if (areAllDependenciesDone(blockedTask)) {
                notifyUser(
                        blockedTask.getAssigneeId(),
                        "Dependencies resolved",
                        "All dependencies for \"" + blockedTask.getTitle() + "\" are now complete.",
                        "DEPENDENCIES_RESOLVED",
                        blockedTask.getId(),
                        blockedTask.getProjectId(),
                        "DEPENDENCIES_RESOLVED:" + blockedTask.getId() + ":" + completedTask.getId());
            }
        }
    }

    private boolean areAllDependenciesDone(Issue task) {
        if (task.getDependencyIds() == null || task.getDependencyIds().isEmpty()) {
            return true;
        }
        for (String depId : task.getDependencyIds()) {
            Optional<Issue> depOpt = issueRepository.findById(new ObjectId(depId));
            if (depOpt.isEmpty() || !"DONE".equals(depOpt.get().getStatus())) {
                return false;
            }
        }
        return true;
    }

    public List<Notification> getNotificationsByAssignee(String assigneeId) {
        List<Notification> byUser = notificationRepository.findByUserIdOrderByCreatedAtDesc(assigneeId);
        return byUser.isEmpty() ? notificationRepository.findByAssigneeId(assigneeId) : byUser;
    }

    public List<Notification> getUnreadNotifications(String assigneeId) {
        List<Notification> byUser = notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(assigneeId);
        return byUser.isEmpty() ? notificationRepository.findByAssigneeIdAndStatus(assigneeId, "UNREAD") : byUser;
    }

    public long getUnreadCount(String assigneeId) {
        long byUser = notificationRepository.countByUserIdAndReadFalse(assigneeId);
        return byUser > 0 ? byUser : notificationRepository.countByAssigneeIdAndStatus(assigneeId, "UNREAD");
    }

    public Notification markAsRead(String notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found: " + notificationId));
        notification.markAsRead();
        return notificationRepository.save(notification);
    }

    public Notification markAsUnread(String notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found: " + notificationId));
        notification.markAsUnread();
        return notificationRepository.save(notification);
    }

    public int markAllAsRead(String assigneeId) {
        List<Notification> unreadNotifications = getUnreadNotifications(assigneeId);
        unreadNotifications.forEach(Notification::markAsRead);
        notificationRepository.saveAll(unreadNotifications);
        return unreadNotifications.size();
    }

    public void deleteNotification(String notificationId) {
        notificationRepository.deleteById(notificationId);
    }

    public Optional<Notification> getNotification(String notificationId) {
        return notificationRepository.findById(notificationId);
    }

    public void deleteAllByAssignee(String assigneeId) {
        notificationRepository.deleteAll(getNotificationsByAssignee(assigneeId));
    }

    public List<Notification> getNotificationsByTask(String taskId) {
        return notificationRepository.findByTaskId(taskId);
    }

    private void sendEmailIfEnabled(String userId, String subject, String text) {
        if (!ObjectId.isValid(userId)) {
            return;
        }
        User user = userRepository.findById(new ObjectId(userId)).orElse(null);
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        try {
            emailService.send(user.getEmail(), subject, text);
        } catch (RuntimeException ignored) {
        }
    }

    private Project findProject(String projectId) {
        if (projectId == null || !ObjectId.isValid(projectId)) {
            return null;
        }
        return projectRepository.findById(new ObjectId(projectId)).orElse(null);
    }

    private List<String> projectMemberIds(Project project) {
        List<String> userIds = new ArrayList<>();
        if (project.getOwnerId() != null) {
            userIds.add(project.getOwnerId());
        }
        if (project.getMemberIds() != null) {
            project.getMemberIds().forEach(userId -> {
                if (!userIds.contains(userId)) {
                    userIds.add(userId);
                }
            });
        }
        return userIds;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
