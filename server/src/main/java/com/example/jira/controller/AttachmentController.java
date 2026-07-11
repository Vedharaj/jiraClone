package com.example.jira.controller;

import com.example.jira.model.Attachment;
import com.example.jira.service.AttachmentService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @PostMapping("/issues/{issueId}/attachments")
    public ResponseEntity<Attachment> uploadAttachment(
            @PathVariable String issueId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("userId") String userId) throws IOException {
        Attachment attachment = attachmentService.uploadAttachment(issueId, file, userId);
        return new ResponseEntity<>(attachment, HttpStatus.CREATED);
    }

    @GetMapping("/issues/{issueId}/attachments")
    public List<Attachment> getAttachments(
            @PathVariable String issueId,
            @RequestParam("userId") String userId) {
        return attachmentService.getAttachmentsByIssue(issueId, userId);
    }

    @GetMapping("/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable String attachmentId,
            @RequestParam("userId") String userId) throws IOException {
        
        Attachment attachment = attachmentService.getAttachmentById(attachmentId);
        attachmentService.validateProjectMembership(attachment.getIssueId(), userId);

        Path filePath = attachmentService.getAttachmentFilePath(attachment);
        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists()) {
            throw new RuntimeException("Physical file not found on server");
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getFileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.getOriginalFileName() + "\"")
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(attachment.getFileSize()))
                .body(resource);
    }

    @DeleteMapping("/attachments/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable String attachmentId,
            @RequestParam("userId") String userId) throws IOException {
        attachmentService.deleteAttachment(attachmentId, userId);
        return ResponseEntity.noContent().build();
    }
}
