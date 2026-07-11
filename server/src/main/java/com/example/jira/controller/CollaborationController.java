package com.example.jira.controller;

import com.example.jira.dto.ApiResponse;
import com.example.jira.service.CollaborationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/collaboration")
public class CollaborationController {
    private final CollaborationService collaborationService;

    public CollaborationController(CollaborationService collaborationService) {
        this.collaborationService = collaborationService;
    }

    @GetMapping("/projects/{projectId}/active-users")
    public ResponseEntity<ApiResponse> getActiveUsers(@PathVariable String projectId) {
        return ResponseEntity.ok(new ApiResponse(true, "Active users loaded", collaborationService.getActiveUsers(projectId)));
    }
}
