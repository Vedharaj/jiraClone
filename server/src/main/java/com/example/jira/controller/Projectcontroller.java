package com.example.jira.controller;

import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.jira.dto.ProjectResponse;
import com.example.jira.model.Project;
import com.example.jira.model.User;
import com.example.jira.repository.Projectrepository;
import com.example.jira.repository.UserRepository;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/projects")
public class Projectcontroller {

    private final Projectrepository projectrepository;
    private final UserRepository userRepository;
    private final com.example.jira.repository.AuditLogRepository auditLogRepository;
    private final com.example.jira.service.NotificationService notificationService;

    public Projectcontroller(Projectrepository projectrepository, 
                             UserRepository userRepository,
                             com.example.jira.repository.AuditLogRepository auditLogRepository,
                             com.example.jira.service.NotificationService notificationService) {
        this.projectrepository = projectrepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.notificationService = notificationService;
    }

    @PostMapping
    public Project createProject(@RequestBody Project project) {
        return projectrepository.save(project);
    }

    @GetMapping
    public List<Project> getAllProjects() {
        return projectrepository.findAll();
    }

    @GetMapping("/{id}")
    public ProjectResponse getProjectById(@PathVariable String id) {
        Project project = projectrepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Fetch owner
        User owner = userRepository.findById(new ObjectId(project.getOwnerId()))
                .orElse(null);

        // Fetch members
        List<ObjectId> memberObjectIds = project.getMemberIds().stream()
                .map(ObjectId::new)
                .toList();

        List<User> members = userRepository.findByIdIn(memberObjectIds);

        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                owner,
                members);
    }

    @PutMapping("/{id}")
    public Project updaProject(@PathVariable String id, @RequestBody Project updated) {
        Project project = projectrepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("project not found"));

        project.setName(updated.getName());
        project.setDescription(updated.getDescription());
        project.setMemberIds(updated.getMemberIds());
        return projectrepository.save(project);
    }

    @DeleteMapping("/{id}")
    public void deleteproject(@PathVariable String id) {
        projectrepository.deleteById(new ObjectId(id));
    }

    @GetMapping("/{id}/members")
    public List<User> getProjectMembers(@PathVariable String id) {
        Project project = projectrepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Project not found"));

        List<String> allIds = new java.util.ArrayList<>();
        if (project.getOwnerId() != null) {
            allIds.add(project.getOwnerId());
        }
        if (project.getMemberIds() != null) {
            for (String memberId : project.getMemberIds()) {
                if (!allIds.contains(memberId)) {
                    allIds.add(memberId);
                }
            }
        }

        List<ObjectId> objectIds = allIds.stream()
                .filter(ObjectId::isValid)
                .map(ObjectId::new)
                .toList();

        return userRepository.findByIdIn(objectIds);
    }

    @PostMapping("/{id}/members")
    public org.springframework.http.ResponseEntity<com.example.jira.dto.ApiResponse> addMember(
            @PathVariable String id,
            @org.springframework.web.bind.annotation.RequestParam String userId,
            @org.springframework.web.bind.annotation.RequestParam String actorId) {
        Project project = projectrepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Validate actor exists and check permissions
        User actor = userRepository.findById(new ObjectId(actorId))
                .orElseThrow(() -> new RuntimeException("Actor not found"));

        boolean isOwner = project.getOwnerId().equals(actorId);
        boolean isManagerOrAdmin = "PROJECT_MANAGER".equalsIgnoreCase(actor.getRole()) || "ADMIN".equalsIgnoreCase(actor.getRole());
        if (!isOwner && !isManagerOrAdmin) {
            return new org.springframework.http.ResponseEntity<>(new com.example.jira.dto.ApiResponse(false, "Only the Project Owner, Project Manager, or Admin can add members."), org.springframework.http.HttpStatus.FORBIDDEN);
        }

        // Validate user to add exists
        User user = userRepository.findById(new ObjectId(userId))
                .orElseThrow(() -> new RuntimeException("User to add not found"));

        List<String> memberIds = project.getMemberIds();
        if (memberIds == null) {
            memberIds = new java.util.ArrayList<>();
        }

        if (project.getOwnerId().equals(userId) || memberIds.contains(userId)) {
            return new org.springframework.http.ResponseEntity<>(new com.example.jira.dto.ApiResponse(false, "User is already a project member."), org.springframework.http.HttpStatus.CONFLICT);
        }

        // Save old state for audit log
        java.util.Map<String, Object> oldValue = java.util.Map.of("memberIds", new java.util.ArrayList<>(memberIds));

        memberIds.add(userId);
        project.setMemberIds(memberIds);
        projectrepository.save(project);

        java.util.Map<String, Object> newValue = java.util.Map.of("memberIds", new java.util.ArrayList<>(memberIds));

        // Audit Log
        auditLogRepository.save(new com.example.jira.model.AuditLog("PROJECT", id, "MEMBER_ADDED", actorId, oldValue, newValue));

        // Notification
        notificationService.notifyUser(
                userId,
                "Added to project",
                "You were added to project \"" + project.getName() + "\".",
                "PROJECT_ADD",
                null,
                id,
                "PROJECT_ADD:" + id + ":" + userId
        );

        return org.springframework.http.ResponseEntity.ok(new com.example.jira.dto.ApiResponse(true, "Member added successfully", project));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public org.springframework.http.ResponseEntity<com.example.jira.dto.ApiResponse> removeMember(
            @PathVariable String id,
            @PathVariable String userId,
            @org.springframework.web.bind.annotation.RequestParam String actorId) {
        Project project = projectrepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (project.getOwnerId().equals(userId)) {
            return new org.springframework.http.ResponseEntity<>(new com.example.jira.dto.ApiResponse(false, "Cannot remove the project owner."), org.springframework.http.HttpStatus.BAD_REQUEST);
        }

        User actor = userRepository.findById(new ObjectId(actorId))
                .orElseThrow(() -> new RuntimeException("Actor not found"));

        boolean isOwner = project.getOwnerId().equals(actorId);
        boolean isManagerOrAdmin = "PROJECT_MANAGER".equalsIgnoreCase(actor.getRole()) || "ADMIN".equalsIgnoreCase(actor.getRole());
        if (!isOwner && !isManagerOrAdmin) {
            return new org.springframework.http.ResponseEntity<>(new com.example.jira.dto.ApiResponse(false, "Only the Project Owner, Project Manager, or Admin can remove members."), org.springframework.http.HttpStatus.FORBIDDEN);
        }

        List<String> memberIds = project.getMemberIds();
        if (memberIds == null || !memberIds.contains(userId)) {
            return new org.springframework.http.ResponseEntity<>(new com.example.jira.dto.ApiResponse(false, "User is not a member of this project."), org.springframework.http.HttpStatus.BAD_REQUEST);
        }

        // Save old state for audit log
        java.util.Map<String, Object> oldValue = java.util.Map.of("memberIds", new java.util.ArrayList<>(memberIds));

        memberIds.remove(userId);
        project.setMemberIds(memberIds);
        projectrepository.save(project);

        java.util.Map<String, Object> newValue = java.util.Map.of("memberIds", new java.util.ArrayList<>(memberIds));

        // Audit Log
        auditLogRepository.save(new com.example.jira.model.AuditLog("PROJECT", id, "MEMBER_REMOVED", actorId, oldValue, newValue));

        // Notification
        notificationService.notifyUser(
                userId,
                "Removed from project",
                "You were removed from project \"" + project.getName() + "\".",
                "PROJECT_REMOVE",
                null,
                id,
                "PROJECT_REMOVE:" + id + ":" + userId
        );

        return org.springframework.http.ResponseEntity.ok(new com.example.jira.dto.ApiResponse(true, "Member removed successfully", project));
    }
}
