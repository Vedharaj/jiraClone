package com.example.jira.service;

import com.example.jira.dto.DependencyResponse;
import com.example.jira.dto.ValidationResult;
import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class DependencyService {

    private final IssueRepository issueRepository;
    private final DependencyValidationEngine validationEngine;

    public DependencyService(IssueRepository issueRepository, DependencyValidationEngine validationEngine) {
        this.issueRepository = issueRepository;
        this.validationEngine = validationEngine;
    }

    /**
     * Add a dependency from taskId to dependencyTaskId
     * This means taskId depends on dependencyTaskId
     * dependencyTaskId must be completed before taskId can be marked DONE
     * Uses validation engine for comprehensive checks
     */
    public Issue addDependency(String taskId, String dependencyTaskId) {
        // Validate the dependency using validation engine
        ValidationResult validationResult = validationEngine.validateCanAddDependency(taskId, dependencyTaskId);
        if (!validationResult.isValid()) {
            throw new IllegalArgumentException(validationResult.getMessage());
        }

        // Get tasks (already validated to exist)
        Issue task = issueRepository.findById(new ObjectId(taskId))
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        Issue dependencyTask = issueRepository.findById(new ObjectId(dependencyTaskId))
                .orElseThrow(() -> new RuntimeException("Dependency task not found: " + dependencyTaskId));

        // Initialize dependencyIds if null
        if (task.getDependencyIds() == null) {
            task.setDependencyIds(new ArrayList<>());
        }

        // Add dependency
        task.getDependencyIds().add(dependencyTaskId);
        task.setUpdatedAt(Instant.now());

        // Update blockedTaskIds on the dependency task
        if (dependencyTask.getBlockedTaskIds() == null) {
            dependencyTask.setBlockedTaskIds(new ArrayList<>());
        }

        if (!dependencyTask.getBlockedTaskIds().contains(taskId)) {
            dependencyTask.getBlockedTaskIds().add(taskId);
            dependencyTask.setUpdatedAt(Instant.now());
            issueRepository.save(dependencyTask);
        }

        return issueRepository.save(task);
    }

    /**
     * Remove a dependency
     */
    public Issue removeDependency(String taskId, String dependencyTaskId) {
        Issue task = issueRepository.findById(new ObjectId(taskId))
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        Issue dependencyTask = issueRepository.findById(new ObjectId(dependencyTaskId))
                .orElseThrow(() -> new RuntimeException("Dependency task not found: " + dependencyTaskId));

        // Remove from task's dependencyIds
        if (task.getDependencyIds() != null) {
            task.getDependencyIds().remove(dependencyTaskId);
            task.setUpdatedAt(Instant.now());
        }

        // Remove from dependencyTask's blockedTaskIds
        if (dependencyTask.getBlockedTaskIds() != null) {
            dependencyTask.getBlockedTaskIds().remove(taskId);
            dependencyTask.setUpdatedAt(Instant.now());
            issueRepository.save(dependencyTask);
        }

        return issueRepository.save(task);
    }

    /**
     * Get all dependencies for a task
     * Returns list of tasks that this task depends on
     */
    public List<Issue> getDependencies(String taskId) {
        Issue task = issueRepository.findById(new ObjectId(taskId))
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        List<Issue> dependencies = new ArrayList<>();

        if (task.getDependencyIds() != null && !task.getDependencyIds().isEmpty()) {
            for (String dependencyId : task.getDependencyIds()) {
                issueRepository.findById(new ObjectId(dependencyId))
                        .ifPresent(dependencies::add);
            }
        }

        return dependencies;
    }

    /**
     * Get all tasks blocked by a specific task
     * Returns list of tasks that depend on this task
     */
    public List<Issue> getBlockedTasks(String taskId) {
        Issue task = issueRepository.findById(new ObjectId(taskId))
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        List<Issue> blockedTasks = new ArrayList<>();

        if (task.getBlockedTaskIds() != null && !task.getBlockedTaskIds().isEmpty()) {
            for (String blockedId : task.getBlockedTaskIds()) {
                issueRepository.findById(new ObjectId(blockedId))
                        .ifPresent(blockedTasks::add);
            }
        }

        return blockedTasks;
    }

    /**
     * Get tasks that depend on a specific task (same as getBlockedTasks)
     */
    public List<Issue> getTasksDependingOn(String taskId) {
        return getBlockedTasks(taskId);
    }

    /**
     * Get dependency response with metadata
     */
    public DependencyResponse getDependencyResponse(String taskId) {
        Issue task = issueRepository.findById(new ObjectId(taskId))
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        return new DependencyResponse(
                task.getId(),
                task.getTitle(),
                task.getStatus(),
                task.getDependencyIds(),
                task.getBlockedTaskIds()
        );
    }

    /**
     * Check if all dependencies are completed
     * Returns true if task can be marked as DONE based on dependencies
     */
    public boolean canMarkAsDone(String taskId) {
        Issue task = issueRepository.findById(new ObjectId(taskId))
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        // If no dependencies, can be marked DONE
        if (task.getDependencyIds() == null || task.getDependencyIds().isEmpty()) {
            return true;
        }

        // Check if all dependencies are DONE
        return task.getDependencyIds().stream()
                .allMatch(depId -> {
                    var issue = issueRepository.findById(new ObjectId(depId));
                    return issue.isPresent() && "DONE".equals(issue.get().getStatus());
                });
    }

    /**
     * Get all tasks that cannot be marked DONE due to incomplete dependencies
     */
    public List<String> getIncompleteDependencies(String taskId) {
        Issue task = issueRepository.findById(new ObjectId(taskId))
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        List<String> incompleteDeps = new ArrayList<>();

        if (task.getDependencyIds() != null) {
            for (String depId : task.getDependencyIds()) {
                var issue = issueRepository.findById(new ObjectId(depId));
                if (issue.isPresent() && !"DONE".equals(issue.get().getStatus())) {
                    incompleteDeps.add(depId);
                }
            }
        }

        return incompleteDeps;
    }
}
