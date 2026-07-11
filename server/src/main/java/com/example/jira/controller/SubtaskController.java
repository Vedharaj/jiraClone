package com.example.jira.controller;

import com.example.jira.dto.CreateSubtaskRequest;
import com.example.jira.dto.UpdateSubtaskRequest;
import com.example.jira.model.Issue;
import com.example.jira.service.SubtaskService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/subtasks")
public class SubtaskController {

    private final SubtaskService subtaskService;

    public SubtaskController(SubtaskService subtaskService) {
        this.subtaskService = subtaskService;
    }

    /**
     * Create a new subtask (inherits projectId and sprintId from parent)
     */
    @PostMapping
    public Issue createSubtask(@RequestBody CreateSubtaskRequest request) {
        return subtaskService.createSubtask(request);
    }

    /**
     * Get all subtasks for a parent task
     */
    @GetMapping("/parent/{parentTaskId}")
    public List<Issue> getSubtasksByParent(@PathVariable String parentTaskId) {
        return subtaskService.getSubtasksByParent(parentTaskId);
    }

    /**
     * Get parent task of a subtask
     */
    @GetMapping("/{subtaskId}/parent")
    public Issue getParentTask(@PathVariable String subtaskId) {
        return subtaskService.getParentTask(subtaskId);
    }

    /**
     * Update a subtask
     */
    @PutMapping("/{subtaskId}")
    public Issue updateSubtask(
            @PathVariable String subtaskId,
            @RequestBody UpdateSubtaskRequest request) {
        return subtaskService.updateSubtask(subtaskId, request);
    }

    /**
     * Delete a subtask
     */
    @DeleteMapping("/{subtaskId}")
    public void deleteSubtask(@PathVariable String subtaskId) {
        subtaskService.deleteSubtask(subtaskId);
    }

    /**
     * Check if all subtasks are DONE
     */
    @GetMapping("/parent/{parentTaskId}/all-done")
    public boolean areAllSubtasksDone(@PathVariable String parentTaskId) {
        return subtaskService.areAllSubtasksDone(parentTaskId);
    }

    /**
     * Get incomplete subtasks for a parent task
     */
    @GetMapping("/parent/{parentTaskId}/incomplete")
    public List<Issue> getIncompleteSubtasks(@PathVariable String parentTaskId) {
        return subtaskService.getIncompleteSubtasks(parentTaskId);
    }
}
