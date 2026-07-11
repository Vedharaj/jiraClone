package com.example.jira.service;

import com.example.jira.dto.ValidationResult;
import com.example.jira.dto.CommentRequest;
import com.example.jira.model.Issue;
import com.example.jira.model.User;
import com.example.jira.repository.IssueRepository;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class IssueService {

    private final IssueRepository issueRepository;
    private final DependencyValidationEngine validationEngine;
    private final NotificationService notificationService;
    private final com.example.jira.repository.UserRepository userRepository;
    private final com.example.jira.repository.Projectrepository projectrepository;
    private final com.example.jira.repository.AuditLogRepository auditLogRepository;
    private final AttachmentService attachmentService;

    public IssueService(IssueRepository issueRepository, 
                        DependencyValidationEngine validationEngine, 
                        NotificationService notificationService,
                        com.example.jira.repository.UserRepository userRepository,
                        com.example.jira.repository.Projectrepository projectrepository,
                        com.example.jira.repository.AuditLogRepository auditLogRepository,
                        AttachmentService attachmentService) {
        this.issueRepository = issueRepository;
        this.validationEngine = validationEngine;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.projectrepository = projectrepository;
        this.auditLogRepository = auditLogRepository;
        this.attachmentService = attachmentService;
    }

    /**
     * Update an issue with validation for parent task status and dependencies
     */
    public Issue updateIssue(String id, Issue updated) {
        Issue issue = issueRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        Issue previous = copyIssue(issue);
        String oldStatus = issue.getStatus();
        if (updated.getUpdatedAt() != null && issue.getUpdatedAt() != null && updated.getUpdatedAt().isBefore(issue.getUpdatedAt())) {
            throw new IllegalStateException("This task was updated by someone else. Refresh and try again.");
        }

        // Validate status transition if status is changing
        if (!issue.getStatus().equals(updated.getStatus())) {
            ValidationResult validationResult = validationEngine.validateStatusTransition(id, updated.getStatus());
            if (!validationResult.isValid()) {
                throw new RuntimeException(validationResult.getMessage());
            }
        }

        issue.setTitle(updated.getTitle());
        issue.setDescription(updated.getDescription());
        issue.setStatus(updated.getStatus());
        issue.setPriority(updated.getPriority());
        issue.setAssigneeId(updated.getAssigneeId());
        issue.setOrder(updated.getOrder());
        issue.setDueDate(updated.getDueDate());
        issue.setUpdatedAt(Instant.now());
        issue.setComments(updated.getComments());

        Issue savedIssue = issueRepository.save(issue);
        notificationService.handleTaskUpdated(previous, savedIssue);

        // Trigger notifications if task just became DONE
        if (!"DONE".equals(oldStatus) && "DONE".equals(updated.getStatus())) {
            notificationService.handleTaskCompletion(id);
        }

        return savedIssue;
    }

    public Issue assignIssue(String issueId, String assigneeId, String actorId) {
        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        // Validate that assigneeId belongs to project
        com.example.jira.model.Project project = projectrepository.findById(new ObjectId(issue.getProjectId()))
                .orElseThrow(() -> new RuntimeException("Project not found"));

        boolean isMember = false;
        if (project.getOwnerId() != null && project.getOwnerId().equals(assigneeId)) {
            isMember = true;
        }
        if (project.getMemberIds() != null && project.getMemberIds().contains(assigneeId)) {
            isMember = true;
        }

        if (!isMember) {
            throw new RuntimeException("Only project members can be assigned to tasks.");
        }

        User assignee = userRepository.findById(new ObjectId(assigneeId))
                .orElseThrow(() -> new RuntimeException("Assignee not found"));

        String previousAssigneeId = issue.getAssigneeId();
        
        // Save old state for audit log
        java.util.Map<String, Object> oldValue = java.util.Map.of("assigneeId", previousAssigneeId != null ? previousAssigneeId : "");

        issue.setAssigneeId(assigneeId);
        issue.setUpdatedAt(Instant.now());
        Issue saved = issueRepository.save(issue);

        java.util.Map<String, Object> newValue = java.util.Map.of("assigneeId", assigneeId);

        // Audit Log
        auditLogRepository.save(new com.example.jira.model.AuditLog("ISSUE", issueId, "TASK_ASSIGNED", actorId, oldValue, newValue));

        // Notification
        String actionType = (previousAssigneeId != null) ? "TASK_REASSIGNED" : "TASK_ASSIGNED";
        notificationService.notifyUser(
                assigneeId,
                actionType.equals("TASK_ASSIGNED") ? "Task assigned" : "Task reassigned",
                "You were assigned to task \"" + issue.getTitle() + "\".",
                "TASK_ASSIGNMENT",
                issueId,
                issue.getProjectId(),
                "TASK_ASSIGNMENT:" + issueId + ":" + assigneeId
        );

        return saved;
    }

    public Issue unassignIssue(String issueId, String actorId) {
        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        String previousAssigneeId = issue.getAssigneeId();
        if (previousAssigneeId == null) {
            return issue;
        }

        // Save old state for audit log
        java.util.Map<String, Object> oldValue = java.util.Map.of("assigneeId", previousAssigneeId);

        issue.setAssigneeId(null);
        issue.setUpdatedAt(Instant.now());
        Issue saved = issueRepository.save(issue);

        java.util.Map<String, Object> newValue = java.util.Map.of("assigneeId", "");

        // Audit Log
        auditLogRepository.save(new com.example.jira.model.AuditLog("ISSUE", issueId, "TASK_UNASSIGNED", actorId, oldValue, newValue));

        return saved;
    }

    public Issue addComment(String id, CommentRequest request) {
        Issue issue = issueRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Issue not found"));
        if (request.getComment() == null || request.getComment().trim().isEmpty()) {
            throw new IllegalArgumentException("Comment is required");
        }
        if (issue.getComments() == null) {
            issue.setComments(new java.util.ArrayList<>());
        }
        String comment = request.getUserId() + ": " + request.getComment().trim();
        issue.getComments().add(comment);
        issue.setUpdatedAt(Instant.now());
        Issue savedIssue = issueRepository.save(issue);
        notificationService.handleCommentAdded(savedIssue, request.getUserId(), comment);
        return savedIssue;
    }

    /**
     * Get issue by ID
     */
    public Issue getIssueById(String id) {
        return issueRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Issue not found"));
    }

    /**
     * Get all issues by project
     */
    public List<Issue> getIssuesByProject(String projectId) {
        return issueRepository.findByProjectId(projectId);
    }

    /**
     * Get all issues by sprint
     */
    public List<Issue> getIssuesBySprint(String sprintId) {
        return issueRepository.findBySprintId(sprintId);
    }

    /**
     * Create a new parent task (not a subtask)
     */
    public Issue createIssue(Issue issue) {
        if (issue.getIsSubtask() == null) {
            issue.setIsSubtask(false);
        }
        
        if (Boolean.FALSE.equals(issue.getIsSubtask())) {
            if (issue.getSubTaskIds() == null) {
                issue.setSubTaskIds(new java.util.ArrayList<>());
            }
        }
        
        issue.setUpdatedAt(Instant.now());
        
        Issue savedIssue = issueRepository.save(issue);
        notificationService.handleTaskCreated(savedIssue);
        return savedIssue;
    }

    /**
     * Delete an issue (only allowed for issues without subtasks)
     */
    public void deleteIssue(String id) {
        Issue issue = issueRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        // Prevent deletion of parent task with subtasks
        if (Boolean.FALSE.equals(issue.getIsSubtask()) && 
            issue.getSubTaskIds() != null && 
            !issue.getSubTaskIds().isEmpty()) {
            throw new RuntimeException(
                "Cannot delete parent task with active subtasks. " +
                "Delete all subtasks first."
            );
        }

        // If this is a subtask, remove it from parent's subTaskIds
        if (Boolean.TRUE.equals(issue.getIsSubtask())) {
            Issue parentTask = issueRepository.findById(new ObjectId(issue.getParentTaskId()))
                    .orElseThrow(() -> new RuntimeException("Parent task not found"));

            if (parentTask.getSubTaskIds() != null) {
                parentTask.getSubTaskIds().remove(issue.getId());
                parentTask.setUpdatedAt(Instant.now());
                issueRepository.save(parentTask);
            }
        }

        // Clean up attachments associated with this issue
        attachmentService.deleteAttachmentsForIssue(id);

        issueRepository.deleteById(new ObjectId(id));
    }

    private Issue copyIssue(Issue source) {
        Issue copy = new Issue();
        copy.setTitle(source.getTitle());
        copy.setDescription(source.getDescription());
        copy.setStatus(source.getStatus());
        copy.setPriority(source.getPriority());
        copy.setProjectId(source.getProjectId());
        copy.setReporterId(source.getReporterId());
        copy.setAssigneeId(source.getAssigneeId());
        copy.setDueDate(source.getDueDate());
        copy.setUpdatedAt(source.getUpdatedAt());
        return copy;
    }
}
