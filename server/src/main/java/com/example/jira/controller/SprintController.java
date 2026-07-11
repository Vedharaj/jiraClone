package com.example.jira.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import com.example.jira.model.Issue;
import com.example.jira.model.Sprint;
import com.example.jira.dto.SprintStatistics;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.SprintRepository;
import com.example.jira.service.NotificationService;
import org.bson.types.ObjectId;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/sprints")
public class SprintController {

    private final SprintRepository sprintRepository;
    private final IssueRepository issueRepository;
    private final NotificationService notificationService;

    public SprintController(
            SprintRepository sprintRepository,
            IssueRepository issueRepository,
            NotificationService notificationService) {
        this.sprintRepository = sprintRepository;
        this.issueRepository = issueRepository;
        this.notificationService = notificationService;
    }

    // =========================
    // CREATE SPRINT
    // =========================
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Sprint createSprint(@RequestBody Sprint sprint) {
        if (sprint.getProjectId() == null || sprint.getProjectId().trim().isEmpty()) {
            throw new IllegalArgumentException("Project ID is required.");
        }
        sprint.setStatus("PLANNED");
        sprint.setCreatedAt(Instant.now());
        sprint.setUpdatedAt(Instant.now());
        return sprintRepository.save(sprint);
    }

    // =========================
    // GET SPRINTS BY PROJECT
    // =========================
    @GetMapping("/project/{projectId}")
    public List<Sprint> getSprintsByProject(@PathVariable String projectId) {
        return sprintRepository.findByProjectId(projectId);
    }

    // =========================
    // GET SPRINT BY ID
    // =========================
    @GetMapping("/{id}")
    public Sprint getSprintById(@PathVariable String id) {
        return sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));
    }

    // =========================
    // START SPRINT
    // =========================
    @PutMapping("/{id}/start")
    public Sprint startSprint(@PathVariable String id) {
        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        if ("COMPLETED".equals(sprint.getStatus())) {
            throw new IllegalStateException("Cannot start a completed sprint.");
        }

        // Check if there is already an active sprint for this project
        List<Sprint> projectSprints = sprintRepository.findByProjectId(sprint.getProjectId());
        boolean hasActiveSprint = projectSprints.stream()
                .anyMatch(s -> "ACTIVE".equals(s.getStatus()));

        if (hasActiveSprint) {
            throw new IllegalStateException("Cannot start sprint if another sprint is active.");
        }

        sprint.setStatus("ACTIVE");
        sprint.setStartDate(Instant.now());
        sprint.setUpdatedAt(Instant.now());

        Sprint saved = sprintRepository.save(sprint);
        // Trigger start notification
        notificationService.handleSprintStarted(saved.getId(), saved.getProjectId(), saved.getName());
        return saved;
    }

    // =========================
    // COMPLETE SPRINT
    // =========================
    @PutMapping("/{id}/complete")
    public Sprint completeSprint(@PathVariable String id) {
        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        if (!"ACTIVE".equals(sprint.getStatus())) {
            throw new IllegalStateException("Only active sprints can be completed.");
        }

        sprint.setStatus("COMPLETED");
        sprint.setEndDate(Instant.now());
        sprint.setUpdatedAt(Instant.now());

        Sprint saved = sprintRepository.save(sprint);
        // Trigger completion notification
        notificationService.handleSprintEnded(saved.getId(), saved.getProjectId(), saved.getName());
        return saved;
    }

    // =========================
    // UPDATE SPRINT DETAILS
    // =========================
    @PutMapping("/{id}")
    public Sprint updateSprint(
            @PathVariable String id,
            @RequestBody Sprint updated) {

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        if ("COMPLETED".equals(sprint.getStatus())) {
            throw new IllegalStateException("Completed sprint is read-only.");
        }

        sprint.setName(updated.getName());
        sprint.setGoal(updated.getGoal());
        sprint.setStartDate(updated.getStartDate());
        sprint.setEndDate(updated.getEndDate());
        sprint.setUpdatedAt(Instant.now());

        return sprintRepository.save(sprint);
    }

    // =========================
    // DELETE SPRINT
    // =========================
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSprint(@PathVariable String id) {
        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        if ("ACTIVE".equals(sprint.getStatus())) {
            throw new IllegalStateException("Active sprint cannot be deleted.");
        }

        // Set sprintId to null for all issues associated with this sprint
        List<Issue> issues = issueRepository.findBySprintId(id);
        for (Issue issue : issues) {
            issue.setSprintId(null);
            issue.setUpdatedAt(Instant.now());
            issueRepository.save(issue);
        }

        sprintRepository.deleteById(new ObjectId(id));
    }

    // =========================
    // ASSIGN ISSUE TO SPRINT
    // =========================
    @PutMapping("/{sprintId}/issues/{issueId}")
    public Issue addIssueToSprint(
            @PathVariable String sprintId,
            @PathVariable String issueId) {

        Sprint sprint = sprintRepository.findById(new ObjectId(sprintId))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        if ("COMPLETED".equals(sprint.getStatus())) {
            throw new IllegalStateException("Cannot add issue to a completed sprint.");
        }

        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        issue.setSprintId(sprintId);
        issue.setUpdatedAt(Instant.now());

        return issueRepository.save(issue);
    }

    // =========================
    // REMOVE ISSUE FROM SPRINT
    // =========================
    @DeleteMapping("/{sprintId}/issues/{issueId}")
    public Issue removeIssueFromSprint(
            @PathVariable String sprintId,
            @PathVariable String issueId) {

        Sprint sprint = sprintRepository.findById(new ObjectId(sprintId))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        if ("COMPLETED".equals(sprint.getStatus())) {
            throw new IllegalStateException("Cannot remove issue from a completed sprint.");
        }

        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        if (sprintId.equals(issue.getSprintId())) {
            issue.setSprintId(null);
            issue.setUpdatedAt(Instant.now());
            return issueRepository.save(issue);
        }

        return issue;
    }

    // =========================
    // GET SPRINT STATISTICS
    // =========================
    @GetMapping("/{id}/statistics")
    public SprintStatistics getSprintStatistics(@PathVariable String id) {
        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        List<Issue> issues = issueRepository.findBySprintId(id);
        int total = issues.size();
        int completed = (int) issues.stream()
                .filter(issue -> "DONE".equals(issue.getStatus()))
                .count();
        int remaining = total - completed;
        double percentage = total > 0 ? ((double) completed * 100.0 / total) : 0.0;

        return new SprintStatistics(total, completed, remaining, percentage);
    }
}
