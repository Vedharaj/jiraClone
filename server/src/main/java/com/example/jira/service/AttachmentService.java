package com.example.jira.service;

import com.example.jira.model.Attachment;
import com.example.jira.model.Issue;
import com.example.jira.model.Project;
import com.example.jira.repository.AttachmentRepository;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.Projectrepository;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final IssueRepository issueRepository;
    private final Projectrepository projectrepository;

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "png", "jpg", "jpeg", "docx");

    private final Path uploadDir = Paths.get("uploads", "attachments").toAbsolutePath().normalize();

    public AttachmentService(AttachmentRepository attachmentRepository,
                             IssueRepository issueRepository,
                             Projectrepository projectrepository) {
        this.attachmentRepository = attachmentRepository;
        this.issueRepository = issueRepository;
        this.projectrepository = projectrepository;

        // Ensure directories exist
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage directory for attachments", e);
        }
    }

    /**
     * Validate project membership of the user for the given issue.
     */
    public void validateProjectMembership(String issueId, String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new SecurityException("Access denied: User ID is required for security validation.");
        }

        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new IllegalArgumentException("Issue not found"));

        Project project = projectrepository.findById(new ObjectId(issue.getProjectId()))
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        boolean isMember = false;
        if (project.getOwnerId() != null && project.getOwnerId().equals(userId)) {
            isMember = true;
        }
        if (project.getMemberIds() != null && project.getMemberIds().contains(userId)) {
            isMember = true;
        }

        if (!isMember) {
            throw new SecurityException("Access denied: You are not a member of this project.");
        }
    }

    /**
     * Upload an attachment for an issue
     */
    public Attachment uploadAttachment(String issueId, MultipartFile file, String userId) throws IOException {
        validateProjectMembership(issueId, userId);

        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new IllegalArgumentException("Issue not found"));

        // Only main issues can have attachments
        if (Boolean.TRUE.equals(issue.getIsSubtask())) {
            throw new IllegalArgumentException("Subtasks cannot upload attachments.");
        }

        // Validate max 2 attachments per issue
        long count = attachmentRepository.countByIssueId(issueId);
        if (count >= 2) {
            throw new IllegalArgumentException("Maximum of 2 attachments reached for this issue.");
        }

        // Validate file size (10MB)
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size must be 10MB or smaller.");
        }

        // Validate format/MIME type
        String contentType = file.getContentType();
        String originalFileName = file.getOriginalFilename();
        
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            // Fallback: check file extension if Content-Type is missing/unrecognized
            String ext = getFileExtension(originalFileName);
            if (ext == null || !ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
                throw new IllegalArgumentException("Unsupported file format. Allowed formats: PDF, PNG, JPG/JPEG, DOCX.");
            }
        } else {
            String ext = getFileExtension(originalFileName);
            if (ext == null || !ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
                throw new IllegalArgumentException("Unsupported file extension. Allowed formats: PDF, PNG, JPG/JPEG, DOCX.");
            }
        }

        // Generate stored file name using UUID to prevent collisions
        String extension = getFileExtension(originalFileName);
        String storedFileName = UUID.randomUUID().toString() + (extension != null ? "." + extension : "");

        // Save physical file
        Path targetPath = this.uploadDir.resolve(storedFileName);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        // Save database record
        Attachment attachment = new Attachment(
                issueId,
                originalFileName,
                storedFileName,
                contentType != null ? contentType : "application/octet-stream",
                file.getSize(),
                userId
        );

        return attachmentRepository.save(attachment);
    }

    /**
     * Fetch attachments of an issue
     */
    public List<Attachment> getAttachmentsByIssue(String issueId, String userId) {
        validateProjectMembership(issueId, userId);
        return attachmentRepository.findByIssueId(issueId);
    }

    /**
     * Get attachment details by ID
     */
    public Attachment getAttachmentById(String attachmentId) {
        return attachmentRepository.findById(new ObjectId(attachmentId))
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
    }

    /**
     * Delete an attachment
     */
    public void deleteAttachment(String attachmentId, String userId) throws IOException {
        Attachment attachment = getAttachmentById(attachmentId);
        validateProjectMembership(attachment.getIssueId(), userId);

        // Delete physical file
        Path filePath = this.uploadDir.resolve(attachment.getStoredFileName());
        Files.deleteIfExists(filePath);

        // Delete database record
        attachmentRepository.delete(attachment);
    }

    /**
     * Delete all attachments for an issue (clean up when issue is deleted)
     */
    public void deleteAttachmentsForIssue(String issueId) {
        List<Attachment> attachments = attachmentRepository.findByIssueId(issueId);
        for (Attachment attachment : attachments) {
            try {
                Path filePath = this.uploadDir.resolve(attachment.getStoredFileName());
                Files.deleteIfExists(filePath);
            } catch (IOException e) {
                System.err.println("Failed to delete physical file: " + attachment.getStoredFileName());
            }
        }
        attachmentRepository.deleteByIssueId(issueId);
    }

    public Path getAttachmentFilePath(Attachment attachment) {
        return this.uploadDir.resolve(attachment.getStoredFileName());
    }

    private String getFileExtension(String fileName) {
        if (fileName == null) return null;
        int lastIndex = fileName.lastIndexOf('.');
        if (lastIndex == -1) return null;
        return fileName.substring(lastIndex + 1);
    }
}
