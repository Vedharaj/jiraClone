package com.example.jira.service;

import com.example.jira.dto.CreateTimeLogRequest;
import com.example.jira.dto.TimeSummaryResponse;
import com.example.jira.dto.UpdateTimeLogRequest;
import com.example.jira.model.AuditLog;
import com.example.jira.model.Issue;
import com.example.jira.model.Project;
import com.example.jira.model.TimeLog;
import com.example.jira.model.User;
import com.example.jira.repository.AuditLogRepository;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.Projectrepository;
import com.example.jira.repository.TimeLogRepository;
import com.example.jira.repository.UserRepository;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TimeLogService {
    private final TimeLogRepository timeLogRepository;
    private final AuditLogRepository auditLogRepository;
    private final IssueRepository issueRepository;
    private final Projectrepository projectRepository;
    private final UserRepository userRepository;

    public TimeLogService(TimeLogRepository timeLogRepository, AuditLogRepository auditLogRepository,
                          IssueRepository issueRepository, Projectrepository projectRepository,
                          UserRepository userRepository) {
        this.timeLogRepository = timeLogRepository;
        this.auditLogRepository = auditLogRepository;
        this.issueRepository = issueRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    public TimeLog create(CreateTimeLogRequest request) {
        validateInput(request.getDate(), request.getDurationHours());
        Issue issue = getIssue(request.getTaskId());
        assertCanManage(issue, request.getUserId());

        TimeLog log = new TimeLog();
        log.setTaskId(issue.getId());
        log.setUserId(request.getUserId());
        log.setDate(request.getDate());
        log.setDurationHours(request.getDurationHours());
        log.setDescription(cleanDescription(request.getDescription()));
        TimeLog saved = timeLogRepository.save(log);
        auditLogRepository.save(new AuditLog("TIME_LOG", saved.getId(), "CREATE", request.getUserId(), null, snapshot(saved)));
        return saved;
    }

    public TimeLog update(String id, UpdateTimeLogRequest request) {
        requireConfirmation(request.isConfirmed(), "update");
        validateInput(request.getDate(), request.getDurationHours());
        TimeLog log = getTimeLog(id);
        Issue issue = getIssue(log.getTaskId());
        assertCanManage(issue, request.getUserId());

        Map<String, Object> oldValue = snapshot(log);
        log.setDate(request.getDate());
        log.setDurationHours(request.getDurationHours());
        log.setDescription(cleanDescription(request.getDescription()));
        log.setUpdatedAt(Instant.now());
        TimeLog saved = timeLogRepository.save(log);
        auditLogRepository.save(new AuditLog("TIME_LOG", saved.getId(), "UPDATE", request.getUserId(), oldValue, snapshot(saved)));
        return saved;
    }

    public void delete(String id, String userId, boolean confirmed) {
        requireConfirmation(confirmed, "delete");
        TimeLog log = getTimeLog(id);
        Issue issue = getIssue(log.getTaskId());
        assertCanManage(issue, userId);
        Map<String, Object> oldValue = snapshot(log);
        timeLogRepository.delete(log);
        auditLogRepository.save(new AuditLog("TIME_LOG", id, "DELETE", userId, oldValue, null));
    }

    public List<TimeLog> getByTask(String taskId) {
        getIssue(taskId);
        return timeLogRepository.findByTaskIdOrderByDateDescCreatedAtDesc(taskId);
    }

    public TimeSummaryResponse getTaskTotal(String taskId) {
        double total = getByTask(taskId).stream().mapToDouble(TimeLog::getDurationHours).sum();
        return new TimeSummaryResponse("TASK", taskId, round(total));
    }

    public TimeSummaryResponse getSprintTotal(String sprintId) {
        List<String> taskIds = issueRepository.findBySprintId(sprintId).stream().map(Issue::getId).toList();
        double total = taskIds.isEmpty() ? 0 : timeLogRepository.findByTaskIdIn(taskIds).stream()
                .mapToDouble(TimeLog::getDurationHours).sum();
        return new TimeSummaryResponse("SPRINT", sprintId, round(total));
    }

    public List<AuditLog> getAuditHistory(String timeLogId) {
        return auditLogRepository.findTop5ByEntityTypeAndEntityIdOrderByTimestampDesc("TIME_LOG", timeLogId);
    }

    private void validateInput(LocalDate date, double durationHours) {
        if (durationHours <= 0) throw new IllegalArgumentException("Duration hours must be greater than 0");
        if (date == null) throw new IllegalArgumentException("Work date is required");
        if (date.isAfter(LocalDate.now())) throw new IllegalArgumentException("Work date cannot be in the future");
    }

    private void requireConfirmation(boolean confirmed, String action) {
        if (!confirmed) throw new IllegalStateException("Confirmation is required before you can " + action + " a time log");
    }

    private void assertCanManage(Issue issue, String userId) {
        if (userId == null || userId.isBlank()) throw new SecurityException("A user is required to manage time logs");
        if (userId.equals(issue.getAssigneeId())) return;

        Project project = projectRepository.findById(objectId(issue.getProjectId(), "project"))
                .orElseThrow(() -> new RuntimeException("Project not found"));
        if (userId.equals(project.getOwnerId())) return;

        User user = userRepository.findById(objectId(userId, "user"))
                .orElseThrow(() -> new SecurityException("User not found"));
        String role = user.getRole() == null ? "" : user.getRole().toUpperCase();
        boolean managerRole = role.equals("PROJECT_MANAGER") || role.equals("PROJECT MANAGER") || role.equals("ADMIN");
        boolean projectMember = project.getMemberIds() != null && project.getMemberIds().contains(userId);
        if (!managerRole || !projectMember) {
            throw new SecurityException("Only the task assignee or a Project Manager can manage time logs");
        }
    }

    private Issue getIssue(String id) {
        return issueRepository.findById(objectId(id, "task")).orElseThrow(() -> new RuntimeException("Task not found"));
    }

    private TimeLog getTimeLog(String id) {
        return timeLogRepository.findById(objectId(id, "time log")).orElseThrow(() -> new RuntimeException("Time log not found"));
    }

    private ObjectId objectId(String value, String label) {
        if (value == null || !ObjectId.isValid(value)) throw new IllegalArgumentException("Invalid " + label + " ID");
        return new ObjectId(value);
    }

    private String cleanDescription(String description) {
        return description == null ? "" : description.trim();
    }

    private Map<String, Object> snapshot(TimeLog log) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", log.getId());
        value.put("taskId", log.getTaskId());
        value.put("userId", log.getUserId());
        value.put("date", log.getDate() != null ? log.getDate().toString() : null);
        value.put("durationHours", log.getDurationHours());
        value.put("description", log.getDescription());
        value.put("createdAt", log.getCreatedAt());
        value.put("updatedAt", log.getUpdatedAt());
        return value;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
