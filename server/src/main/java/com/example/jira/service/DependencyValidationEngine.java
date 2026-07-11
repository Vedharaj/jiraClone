package com.example.jira.service;

import com.example.jira.dto.ValidationResult;
import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Dependency Validation Engine
 * 
 * Provides comprehensive validation for task state transitions based on:
 * 1. Dependency relationships (tasks this depends on)
 * 2. Subtask relationships (parent-child hierarchy)
 * 3. Circular dependency prevention
 * 4. Status transition rules
 */
@Service
public class DependencyValidationEngine {

    private final IssueRepository issueRepository;

    public DependencyValidationEngine(IssueRepository issueRepository) {
        this.issueRepository = issueRepository;
    }

    /**
     * Validate if a task can be moved to IN_PROGRESS status
     * 
     * Requirements:
     * - All dependencies must be DONE
     * - Cannot have blocked tasks preventing transition
     */
    public ValidationResult validateCanMoveToInProgress(String taskId) {
        Optional<Issue> taskOpt = issueRepository.findById(new ObjectId(taskId));
        if (taskOpt.isEmpty()) {
            return ValidationResult.taskNotFound(taskId);
        }

        Issue task = taskOpt.get();

        // Check if all dependencies are DONE
        if (task.getDependencyIds() != null && !task.getDependencyIds().isEmpty()) {
            List<ObjectId> depObjectIds = task.getDependencyIds().stream().map(ObjectId::new).toList();
            List<Issue> dependencies = issueRepository.findAllById(depObjectIds);
            
            List<String> incompleteDeps = dependencies.stream()
                .filter(dep -> !"DONE".equals(dep.getStatus()))
                .map(Issue::getId)
                .toList();

            if (!incompleteDeps.isEmpty()) {
                ValidationResult result = ValidationResult.incompleteDependencies(incompleteDeps);
                result.setBlockingReason("Cannot move to IN_PROGRESS: " + incompleteDeps.size() + 
                    " dependencies are not DONE");
                return result;
            }
        }

        return ValidationResult.valid();
    }

    /**
     * Validate if a task can be marked as DONE
     * 
     * Requirements:
     * - All dependencies must be DONE
     * - If parent task: all subtasks must be DONE
     */
    public ValidationResult validateCanMarkAsDone(String taskId) {
        Optional<Issue> taskOpt = issueRepository.findById(new ObjectId(taskId));
        if (taskOpt.isEmpty()) {
            return ValidationResult.taskNotFound(taskId);
        }

        Issue task = taskOpt.get();

        // Check dependencies first
        if (task.getDependencyIds() != null && !task.getDependencyIds().isEmpty()) {
            List<ObjectId> depObjectIds = task.getDependencyIds().stream().map(ObjectId::new).toList();
            List<Issue> dependencies = issueRepository.findAllById(depObjectIds);

            List<String> incompleteDeps = dependencies.stream()
                .filter(dep -> !"DONE".equals(dep.getStatus()))
                .map(Issue::getId)
                .toList();

            if (!incompleteDeps.isEmpty()) {
                ValidationResult result = ValidationResult.incompleteDependencies(incompleteDeps);
                result.setBlockingReason("Cannot mark as DONE: " + incompleteDeps.size() + 
                    " dependencies must be completed first");
                return result;
            }
        }

        // If this is a parent task, check subtasks
        if (Boolean.FALSE.equals(task.getIsSubtask()) && 
            task.getSubTaskIds() != null && !task.getSubTaskIds().isEmpty()) {
            
            List<ObjectId> subtaskObjectIds = task.getSubTaskIds().stream().map(ObjectId::new).toList();
            List<Issue> subtasks = issueRepository.findAllById(subtaskObjectIds);

            List<String> incompleteSubtasks = subtasks.stream()
                .filter(sub -> !"DONE".equals(sub.getStatus()))
                .map(Issue::getId)
                .toList();

            if (!incompleteSubtasks.isEmpty()) {
                ValidationResult result = ValidationResult.incompleteSubtasks(incompleteSubtasks);
                result.setBlockingReason("Cannot mark as DONE: " + incompleteSubtasks.size() + 
                    " subtasks must be completed first");
                return result;
            }
        }

        return ValidationResult.valid();
    }

    /**
     * Validate if a dependency can be added between two tasks
     * Checks:
     * 1. Both tasks exist
     * 2. Not self-dependency
     * 3. No circular dependency would be created
     * 4. Dependency doesn't already exist
     */
    public ValidationResult validateCanAddDependency(String taskId, String dependencyTaskId) {
        // Check if task exists
        Optional<Issue> taskOpt = issueRepository.findById(new ObjectId(taskId));
        if (taskOpt.isEmpty()) {
            return ValidationResult.taskNotFound(taskId);
        }

        // Check if dependency task exists
        Optional<Issue> depTaskOpt = issueRepository.findById(new ObjectId(dependencyTaskId));
        if (depTaskOpt.isEmpty()) {
            return ValidationResult.taskNotFound("Dependency task not found: " + dependencyTaskId);
        }

        Issue task = taskOpt.get();
        Issue depTask = depTaskOpt.get();

        // Check self-dependency
        if (taskId.equals(dependencyTaskId)) {
            return ValidationResult.selfDependency();
        }

        // Check if dependency already exists
        if (task.getDependencyIds() != null && task.getDependencyIds().contains(dependencyTaskId)) {
            return ValidationResult.duplicateDependency();
        }

        // Check for circular dependency
        if (wouldCreateCircularDependency(taskId, dependencyTaskId)) {
            ValidationResult result = ValidationResult.circularDependency(depTask.getTitle() != null ? depTask.getTitle() : dependencyTaskId);
            result.setBlockingReason("Adding this dependency would create a circular reference");
            return result;
        }

        return ValidationResult.valid();
    }

    /**
     * Validate a general status transition
     * Applies all necessary validations based on target status
     */
    public ValidationResult validateStatusTransition(String taskId, String newStatus) {
        Optional<Issue> taskOpt = issueRepository.findById(new ObjectId(taskId));
        if (taskOpt.isEmpty()) {
            return ValidationResult.taskNotFound(taskId);
        }

        Issue task = taskOpt.get();
        String currentStatus = task.getStatus();

        // No need to validate if status not changing
        if (currentStatus.equals(newStatus)) {
            return ValidationResult.valid();
        }

        // Validate based on target status
        if ("IN_PROGRESS".equals(newStatus)) {
            return validateCanMoveToInProgress(taskId);
        } else if ("DONE".equals(newStatus)) {
            return validateCanMarkAsDone(taskId);
        }

        // Other statuses (OPEN, etc.) don't have special validation
        return ValidationResult.valid();
    }

    /**
     * Get all issues that are blocking this task from progressing
     * Returns tasks with incomplete dependencies
     */
    public List<Issue> getBlockingIssues(String taskId) {
        Optional<Issue> taskOpt = issueRepository.findById(new ObjectId(taskId));
        if (taskOpt.isEmpty()) {
            return new ArrayList<>();
        }

        Issue task = taskOpt.get();
        List<Issue> blockingIssues = new ArrayList<>();

        // Check dependencies
        if (task.getDependencyIds() != null && !task.getDependencyIds().isEmpty()) {
            for (String depId : task.getDependencyIds()) {
                Optional<Issue> depOpt = issueRepository.findById(new ObjectId(depId));
                if (depOpt.isPresent() && !"DONE".equals(depOpt.get().getStatus())) {
                    blockingIssues.add(depOpt.get());
                }
            }
        }

        return blockingIssues;
    }

    /**
     * Get all issues that are blocked by this task
     * Returns tasks that depend on this one
     */
    public List<Issue> getDependentIssues(String taskId) {
        Optional<Issue> taskOpt = issueRepository.findById(new ObjectId(taskId));
        if (taskOpt.isEmpty()) {
            return new ArrayList<>();
        }

        Issue task = taskOpt.get();
        List<Issue> dependentIssues = new ArrayList<>();

        // Find all tasks that depend on this one
        if (task.getBlockedTaskIds() != null && !task.getBlockedTaskIds().isEmpty()) {
            for (String blockedId : task.getBlockedTaskIds()) {
                Optional<Issue> blockedOpt = issueRepository.findById(new ObjectId(blockedId));
                if (blockedOpt.isPresent()) {
                    dependentIssues.add(blockedOpt.get());
                }
            }
        }

        return dependentIssues;
    }

    /**
     * Validate entire dependency graph for a task
     * Detects circular dependencies and provides comprehensive validation report
     */
    public ValidationResult validateDependencyGraph(String taskId) {
        Optional<Issue> taskOpt = issueRepository.findById(new ObjectId(taskId));
        if (taskOpt.isEmpty()) {
            return ValidationResult.taskNotFound(taskId);
        }

        // Check for circular dependencies in the entire graph
        Set<String> visited = new HashSet<>();
        Set<String> recursionStack = new HashSet<>();

        if (detectCircularDependency(taskId, visited, recursionStack)) {
            return ValidationResult.circularDependency(taskId);
        }

        return ValidationResult.valid();
    }

    /**
     * Check if adding a dependency would create a circular reference
     * Uses DFS algorithm
     */
    private boolean wouldCreateCircularDependency(String taskId, String dependencyTaskId) {
        Set<String> visited = new HashSet<>();
        return hasCycle(dependencyTaskId, taskId, visited);
    }

    /**
     * DFS helper to detect cycles
     */
    private boolean hasCycle(String currentTaskId, String targetTaskId, Set<String> visited) {
        if (currentTaskId.equals(targetTaskId)) {
            return true;
        }

        if (visited.contains(currentTaskId)) {
            return false;
        }

        visited.add(currentTaskId);

        Optional<Issue> currentTask = issueRepository.findById(new ObjectId(currentTaskId));
        if (currentTask.isPresent() && currentTask.get().getDependencyIds() != null) {
            for (String depId : currentTask.get().getDependencyIds()) {
                if (hasCycle(depId, targetTaskId, visited)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Detect circular dependency in entire graph using DFS with recursion stack
     */
    private boolean detectCircularDependency(String taskId, Set<String> visited, Set<String> recursionStack) {
        visited.add(taskId);
        recursionStack.add(taskId);

        Optional<Issue> taskOpt = issueRepository.findById(new ObjectId(taskId));
        if (taskOpt.isPresent() && taskOpt.get().getDependencyIds() != null) {
            for (String depId : taskOpt.get().getDependencyIds()) {
                if (!visited.contains(depId)) {
                    if (detectCircularDependency(depId, visited, recursionStack)) {
                        return true;
                    }
                } else if (recursionStack.contains(depId)) {
                    return true;
                }
            }
        }

        recursionStack.remove(taskId);
        return false;
    }

    /**
     * Get comprehensive validation report for a task
     * Includes dependencies, subtasks, and current blockers
     */
    public DependencyValidationReport getValidationReport(String taskId) {
        Optional<Issue> taskOpt = issueRepository.findById(new ObjectId(taskId));
        if (taskOpt.isEmpty()) {
            return new DependencyValidationReport();
        }

        Issue task = taskOpt.get();
        DependencyValidationReport report = new DependencyValidationReport();

        report.setTaskId(taskId);
        report.setTaskTitle(task.getTitle());
        report.setCurrentStatus(task.getStatus());

        // Check IN_PROGRESS validation
        ValidationResult inProgressValidation = validateCanMoveToInProgress(taskId);
        report.setCanMoveToInProgress(inProgressValidation.isValid());
        if (!inProgressValidation.isValid()) {
            report.setInProgressBlockers(inProgressValidation.getBlockedByIds());
        }

        // Check DONE validation
        ValidationResult doneValidation = validateCanMarkAsDone(taskId);
        report.setCanMarkAsDone(doneValidation.isValid());
        if (!doneValidation.isValid()) {
            report.setDoneBlockers(doneValidation.getBlockedByIds());
        }

        // Get blocking issues
        report.setBlockingIssues(getBlockingIssues(taskId));

        // Get dependent issues
        report.setDependentIssues(getDependentIssues(taskId));

        // Check graph validity
        ValidationResult graphValidation = validateDependencyGraph(taskId);
        report.setGraphValid(graphValidation.isValid());

        return report;
    }
}
