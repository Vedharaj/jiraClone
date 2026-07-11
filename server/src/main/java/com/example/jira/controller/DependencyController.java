package com.example.jira.controller;

import com.example.jira.dto.AddDependencyRequest;
import com.example.jira.dto.DependencyResponse;
import com.example.jira.dto.RemoveDependencyRequest;
import com.example.jira.model.Issue;
import com.example.jira.service.DependencyService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/dependencies")
public class DependencyController {

    private final DependencyService dependencyService;

    public DependencyController(DependencyService dependencyService) {
        this.dependencyService = dependencyService;
    }

    /**
     * Add a dependency: taskId depends on dependencyTaskId
     * POST /api/dependencies
     * {
     *   "taskId": "issue-1",
     *   "dependencyTaskId": "issue-2"
     * }
     */
    @PostMapping
    public Issue addDependency(@RequestBody AddDependencyRequest request) {
        return dependencyService.addDependency(request.getTaskId(), request.getDependencyTaskId());
    }

    /**
     * Remove a dependency
     * DELETE /api/dependencies
     * {
     *   "taskId": "issue-1",
     *   "dependencyTaskId": "issue-2"
     * }
     */
    @DeleteMapping
    public Issue removeDependency(@RequestBody RemoveDependencyRequest request) {
        return dependencyService.removeDependency(request.getTaskId(), request.getDependencyTaskId());
    }

    /**
     * Get all tasks that a specific task depends on
     * GET /api/dependencies/{taskId}
     */
    @GetMapping("/{taskId}")
    public List<Issue> getDependencies(@PathVariable String taskId) {
        return dependencyService.getDependencies(taskId);
    }

    /**
     * Get all tasks that are blocked by (depend on) a specific task
     * GET /api/dependencies/{taskId}/blocking
     */
    @GetMapping("/{taskId}/blocking")
    public List<Issue> getBlockedTasks(@PathVariable String taskId) {
        return dependencyService.getBlockedTasks(taskId);
    }

    /**
     * Get all incomplete dependencies for a task
     * Returns list of dependency IDs that are not yet DONE
     * GET /api/dependencies/{taskId}/incomplete
     */
    @GetMapping("/{taskId}/incomplete")
    public List<String> getIncompleteDependencies(@PathVariable String taskId) {
        return dependencyService.getIncompleteDependencies(taskId);
    }

    /**
     * Check if a task can be marked as DONE based on dependencies
     * GET /api/dependencies/{taskId}/can-done
     */
    @GetMapping("/{taskId}/can-done")
    public boolean canMarkAsDone(@PathVariable String taskId) {
        return dependencyService.canMarkAsDone(taskId);
    }

    /**
     * Get detailed dependency information for a task
     * Includes dependency count, blocked count, and all IDs
     * GET /api/dependencies/{taskId}/details
     */
    @GetMapping("/{taskId}/details")
    public DependencyResponse getDependencyDetails(@PathVariable String taskId) {
        return dependencyService.getDependencyResponse(taskId);
    }

    /**
     * Get count of incomplete dependencies
     * GET /api/dependencies/{taskId}/incomplete-count
     */
    @GetMapping("/{taskId}/incomplete-count")
    public int getIncompleteCount(@PathVariable String taskId) {
        return dependencyService.getIncompleteDependencies(taskId).size();
    }
}
