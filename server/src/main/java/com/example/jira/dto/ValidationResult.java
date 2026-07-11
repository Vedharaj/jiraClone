package com.example.jira.dto;

import java.util.List;

/**
 * Validation result object returned by the validation engine
 * Contains information about validation success/failure and any blocking issues
 */
public class ValidationResult {
    private boolean valid;
    private String code;
    private String message;
    private List<String> blockedByIds;
    private int blockedCount;
    private String blockingReason;

    public ValidationResult() {
    }

    public ValidationResult(boolean valid, String code, String message) {
        this.valid = valid;
        this.code = code;
        this.message = message;
        this.blockedCount = 0;
    }

    public ValidationResult(boolean valid, String code, String message, List<String> blockedByIds) {
        this.valid = valid;
        this.code = code;
        this.message = message;
        this.blockedByIds = blockedByIds;
        this.blockedCount = blockedByIds != null ? blockedByIds.size() : 0;
    }

    // Factory methods for common validation results
    public static ValidationResult valid() {
        return new ValidationResult(true, "VALID", "Validation passed");
    }

    public static ValidationResult circularDependency() {
        return new ValidationResult(
            false,
            "CIRCULAR_DEPENDENCY",
            "Cannot create dependency: would create a circular dependency."
        );
    }

    public static ValidationResult circularDependency(String taskId) {
        return new ValidationResult(
            false,
            "CIRCULAR_DEPENDENCY",
            "Cannot create dependency: would create a circular dependency with task '" + taskId + "'."
        );
    }

    public static ValidationResult incompleteDependencies(List<String> incompleteDeps) {
        return new ValidationResult(
            false,
            "INCOMPLETE_DEPENDENCIES",
            "Task has " + incompleteDeps.size() + " incomplete dependencies. Cannot transition to this status.",
            incompleteDeps
        );
    }

    public static ValidationResult selfDependency() {
        return new ValidationResult(false, "SELF_DEPENDENCY", "Task cannot depend on itself");
    }

    public static ValidationResult duplicateDependency() {
        return new ValidationResult(false, "DUPLICATE_DEPENDENCY", "Dependency already exists");
    }

    public static ValidationResult incompleteSubtasks(List<String> incompletSubtaskIds) {
        return new ValidationResult(
            false,
            "INCOMPLETE_SUBTASKS",
            "Task has " + incompletSubtaskIds.size() + " incomplete subtasks. Cannot mark as DONE.",
            incompletSubtaskIds
        );
    }

    public static ValidationResult taskNotFound(String taskId) {
        return new ValidationResult(false, "TASK_NOT_FOUND", "Task not found: " + taskId);
    }

    // Getters and setters
    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<String> getBlockedByIds() {
        return blockedByIds;
    }

    public void setBlockedByIds(List<String> blockedByIds) {
        this.blockedByIds = blockedByIds;
        this.blockedCount = blockedByIds != null ? blockedByIds.size() : 0;
    }

    public int getBlockedCount() {
        return blockedCount;
    }

    public void setBlockedCount(int blockedCount) {
        this.blockedCount = blockedCount;
    }

    public String getBlockingReason() {
        return blockingReason;
    }

    public void setBlockingReason(String blockingReason) {
        this.blockingReason = blockingReason;
    }
}
