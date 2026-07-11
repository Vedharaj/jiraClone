package com.example.jira.controller;

import com.example.jira.dto.CreateTimeLogRequest;
import com.example.jira.dto.DeleteTimeLogRequest;
import com.example.jira.dto.TimeSummaryResponse;
import com.example.jira.dto.UpdateTimeLogRequest;
import com.example.jira.model.AuditLog;
import com.example.jira.model.TimeLog;
import com.example.jira.service.TimeLogService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/time-logs")
public class TimeLogController {
    private final TimeLogService timeLogService;

    public TimeLogController(TimeLogService timeLogService) {
        this.timeLogService = timeLogService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TimeLog create(@RequestBody CreateTimeLogRequest request) {
        return timeLogService.create(request);
    }

    @PutMapping("/{id}")
    public TimeLog update(@PathVariable String id, @RequestBody UpdateTimeLogRequest request) {
        return timeLogService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id, @RequestBody DeleteTimeLogRequest request) {
        timeLogService.delete(id, request.getUserId(), request.isConfirmed());
    }

    @GetMapping("/task/{taskId}")
    public List<TimeLog> getByTask(@PathVariable String taskId) {
        return timeLogService.getByTask(taskId);
    }

    @GetMapping("/task/{taskId}/total")
    public TimeSummaryResponse getTaskTotal(@PathVariable String taskId) {
        return timeLogService.getTaskTotal(taskId);
    }

    @GetMapping("/sprint/{sprintId}/total")
    public TimeSummaryResponse getSprintTotal(@PathVariable String sprintId) {
        return timeLogService.getSprintTotal(sprintId);
    }

    @GetMapping("/{id}/audit")
    public List<AuditLog> getAuditHistory(@PathVariable String id) {
        return timeLogService.getAuditHistory(id);
    }
}
