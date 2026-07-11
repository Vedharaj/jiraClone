package com.example.jira.service;

import com.example.jira.dto.CreateSubtaskRequest;
import com.example.jira.dto.UpdateSubtaskRequest;
import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class SubtaskService {

    private final IssueRepository issueRepository;

    public SubtaskService(IssueRepository issueRepository) {
        this.issueRepository = issueRepository;
    }

    /**
     * Create a subtask that inherits projectId and sprintId from parent task
     */
    public Issue createSubtask(CreateSubtaskRequest request) {
        // Fetch parent task
        Issue parentTask = issueRepository.findById(new ObjectId(request.getParentTaskId()))
                .orElseThrow(() -> new RuntimeException("Parent task not found"));

        // Validate parent task is not a subtask itself
        if (Boolean.TRUE.equals(parentTask.getIsSubtask())) {
            throw new RuntimeException("Cannot create subtasks of a subtask");
        }

        // Create new subtask
        Issue subtask = new Issue();
        subtask.setTitle(request.getTitle());
        subtask.setDescription(request.getDescription());
        subtask.setType(request.getType());
        subtask.setStatus("TODO"); // Default status for new subtasks
        subtask.setPriority(request.getPriority());
        subtask.setAssigneeId(request.getAssigneeId());
        subtask.setOrder(request.getOrder());
        
        // Inherit from parent task
        subtask.setProjectId(parentTask.getProjectId());
        subtask.setSprintId(parentTask.getSprintId());
        subtask.setReporterId(parentTask.getReporterId());
        
        // Set subtask relationships
        subtask.setParentTaskId(request.getParentTaskId());
        subtask.setIsSubtask(true);
        
        // Initialize empty collections
        subtask.setSubTaskIds(new ArrayList<>());
        subtask.setDependencyIds(new ArrayList<>());
        subtask.setBlockedTaskIds(new ArrayList<>());
        subtask.setComments(new ArrayList<>());
        
        subtask.setUpdatedAt(Instant.now());

        // Save subtask
        Issue savedSubtask = issueRepository.save(subtask);

        // Add subtask ID to parent's subTaskIds list
        if (parentTask.getSubTaskIds() == null) {
            parentTask.setSubTaskIds(new ArrayList<>());
        }
        parentTask.getSubTaskIds().add(savedSubtask.getId());
        parentTask.setUpdatedAt(Instant.now());
        issueRepository.save(parentTask);

        return savedSubtask;
    }

    /**
     * Get all subtasks for a parent task
     */
    public List<Issue> getSubtasksByParent(String parentTaskId) {
        return issueRepository.findByParentTaskId(parentTaskId);
    }

    /**
     * Update a subtask
     */
    public Issue updateSubtask(String subtaskId, UpdateSubtaskRequest request) {
        Issue subtask = issueRepository.findById(new ObjectId(subtaskId))
                .orElseThrow(() -> new RuntimeException("Subtask not found"));

        if (!Boolean.TRUE.equals(subtask.getIsSubtask())) {
            throw new RuntimeException("Issue is not a subtask");
        }

        subtask.setTitle(request.getTitle());
        subtask.setDescription(request.getDescription());
        subtask.setStatus(request.getStatus());
        subtask.setPriority(request.getPriority());
        subtask.setAssigneeId(request.getAssigneeId());
        subtask.setOrder(request.getOrder());
        subtask.setComments(request.getComments());
        subtask.setUpdatedAt(Instant.now());

        return issueRepository.save(subtask);
    }

    /**
     * Delete a subtask and remove it from parent's subTaskIds
     */
    public void deleteSubtask(String subtaskId) {
        Issue subtask = issueRepository.findById(new ObjectId(subtaskId))
                .orElseThrow(() -> new RuntimeException("Subtask not found"));

        if (!Boolean.TRUE.equals(subtask.getIsSubtask())) {
            throw new RuntimeException("Issue is not a subtask");
        }

        // Remove subtask ID from parent's subTaskIds
        Issue parentTask = issueRepository.findById(new ObjectId(subtask.getParentTaskId()))
                .orElseThrow(() -> new RuntimeException("Parent task not found"));

        if (parentTask.getSubTaskIds() != null) {
            parentTask.getSubTaskIds().remove(subtask.getId());
            parentTask.setUpdatedAt(Instant.now());
            issueRepository.save(parentTask);
        }

        // Delete the subtask
        issueRepository.deleteById(new ObjectId(subtaskId));
    }

    /**
     * Get parent task for a subtask
     */
    public Issue getParentTask(String subtaskId) {
        Issue subtask = issueRepository.findById(new ObjectId(subtaskId))
                .orElseThrow(() -> new RuntimeException("Subtask not found"));

        if (!Boolean.TRUE.equals(subtask.getIsSubtask())) {
            throw new RuntimeException("Issue is not a subtask");
        }

        return issueRepository.findById(new ObjectId(subtask.getParentTaskId()))
                .orElseThrow(() -> new RuntimeException("Parent task not found"));
    }

    /**
     * Check if all subtasks of a parent are DONE
     */
    public boolean areAllSubtasksDone(String parentTaskId) {
        List<Issue> subtasks = issueRepository.findByParentTaskId(parentTaskId);
        
        if (subtasks.isEmpty()) {
            return true; // Parent with no subtasks can be marked DONE
        }

        return subtasks.stream()
                .allMatch(subtask -> "DONE".equals(subtask.getStatus()));
    }

    /**
     * Get all incomplete subtasks for a parent task
     */
    public List<Issue> getIncompleteSubtasks(String parentTaskId) {
        List<Issue> subtasks = issueRepository.findByParentTaskId(parentTaskId);
        return subtasks.stream()
                .filter(subtask -> !"DONE".equals(subtask.getStatus()))
                .toList();
    }
}
