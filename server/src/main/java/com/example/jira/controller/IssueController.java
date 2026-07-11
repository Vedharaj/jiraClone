package com.example.jira.controller;
import com.example.jira.model.Issue;
import com.example.jira.dto.CommentRequest;
import com.example.jira.service.IssueService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/issues")
public class IssueController {

    private final IssueService issueService;

    public IssueController(IssueService issueService) {
        this.issueService = issueService;
    }

    // CREATE - for parent tasks
    @PostMapping
    public Issue createIssue(@RequestBody Issue issue) {
        return issueService.createIssue(issue);
    }

    // GET BY PROJECT
    @GetMapping("/project/{projectId}")
    public List<Issue> getIssuesByProject(@PathVariable String projectId) {
        return issueService.getIssuesByProject(projectId);
    }

    // GET BY SPRINT
    @GetMapping("/sprint/{sprintId}")
    public List<Issue> getIssuesBySprint(@PathVariable String sprintId) {
        return issueService.getIssuesBySprint(sprintId);
    }

    // GET BY ID
    @GetMapping("/{id}")
    public Issue getIssueById(@PathVariable String id) {
        return issueService.getIssueById(id);
    }

    // UPDATE - with validation for parent task status
    @PutMapping("/{id}")
    public Issue updateIssue(
            @PathVariable String id,
            @RequestBody Issue updated) {
        return issueService.updateIssue(id, updated);
    }

    @PostMapping("/{id}/comments")
    public Issue addComment(@PathVariable String id, @RequestBody CommentRequest request) {
        return issueService.addComment(id, request);
    }

    // DELETE - with validation
    @DeleteMapping("/{id}")
    public void deleteIssue(@PathVariable String id) {
        issueService.deleteIssue(id);
    }

    @PutMapping("/{id}/assign")
    public Issue assignIssue(
            @PathVariable String id,
            @RequestParam String assigneeId,
            @RequestParam String actorId) {
        return issueService.assignIssue(id, assigneeId, actorId);
    }

    @PutMapping("/{id}/unassign")
    public Issue unassignIssue(
            @PathVariable String id,
            @RequestParam String actorId) {
        return issueService.unassignIssue(id, actorId);
    }
}
