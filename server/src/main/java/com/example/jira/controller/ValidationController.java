package com.example.jira.controller;

import com.example.jira.dto.ValidationResult;
import com.example.jira.model.Issue;
import com.example.jira.service.DependencyValidationEngine;
import com.example.jira.service.DependencyValidationReport;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/validation")
public class ValidationController {

    private final DependencyValidationEngine validationEngine;

    public ValidationController(DependencyValidationEngine validationEngine) {
        this.validationEngine = validationEngine;
    }

    /**
     * Validate if a task can be moved to IN_PROGRESS
     * GET /api/validation/{taskId}/can-in-progress
     */
    @GetMapping("/{taskId}/can-in-progress")
    public ValidationResult validateCanMoveToInProgress(@PathVariable String taskId) {
        return validationEngine.validateCanMoveToInProgress(taskId);
    }

    /**
     * Validate if a task can be marked as DONE
     * GET /api/validation/{taskId}/can-done
     */
    @GetMapping("/{taskId}/can-done")
    public ValidationResult validateCanMarkAsDone(@PathVariable String taskId) {
        return validationEngine.validateCanMarkAsDone(taskId);
    }

    /**
     * Validate if a dependency can be added
     * GET /api/validation/{taskId}/can-add-dependency/{dependencyTaskId}
     */
    @GetMapping("/{taskId}/can-add-dependency/{dependencyTaskId}")
    public ValidationResult validateCanAddDependency(
            @PathVariable String taskId,
            @PathVariable String dependencyTaskId) {
        return validationEngine.validateCanAddDependency(taskId, dependencyTaskId);
    }

    /**
     * Validate a status transition
     * GET /api/validation/{taskId}/can-transition/{newStatus}
     */
    @GetMapping("/{taskId}/can-transition/{newStatus}")
    public ValidationResult validateStatusTransition(
            @PathVariable String taskId,
            @PathVariable String newStatus) {
        return validationEngine.validateStatusTransition(taskId, newStatus);
    }

    /**
     * Get all issues that are blocking this task
     * GET /api/validation/{taskId}/blocking-issues
     */
    @GetMapping("/{taskId}/blocking-issues")
    public List<Issue> getBlockingIssues(@PathVariable String taskId) {
        return validationEngine.getBlockingIssues(taskId);
    }

    /**
     * Get all issues that depend on this task
     * GET /api/validation/{taskId}/dependent-issues
     */
    @GetMapping("/{taskId}/dependent-issues")
    public List<Issue> getDependentIssues(@PathVariable String taskId) {
        return validationEngine.getDependentIssues(taskId);
    }

    /**
     * Validate the entire dependency graph
     * GET /api/validation/{taskId}/graph
     */
    @GetMapping("/{taskId}/graph")
    public ValidationResult validateDependencyGraph(@PathVariable String taskId) {
        return validationEngine.validateDependencyGraph(taskId);
    }

    /**
     * Get comprehensive validation report for a task
     * GET /api/validation/{taskId}/report
     */
    @GetMapping("/{taskId}/report")
    public DependencyValidationReport getValidationReport(@PathVariable String taskId) {
        return validationEngine.getValidationReport(taskId);
    }
}
