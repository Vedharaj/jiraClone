package com.example.jira.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.example.jira.dto.ApiResponse;
import com.example.jira.dto.ChangeEmailRequest;
import com.example.jira.dto.ChangePasswordRequest;
import com.example.jira.dto.UpdateProfileRequest;
import com.example.jira.model.AuditLog;
import com.example.jira.model.User;
import com.example.jira.repository.AuditLogRepository;
import com.example.jira.repository.UserRepository;
import com.example.jira.service.EmailService;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private static final long MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^[+]?[0-9()\\s.-]{7,25}$");
    private static final Pattern STRONG_PASSWORD_PATTERN = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    @org.springframework.beans.factory.annotation.Value("${app.frontend.url:}")
    private String configuredFrontendUrl;

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse> getProfile(@PathVariable String userId) {
        User user = findUser(userId);
        return ResponseEntity.ok(new ApiResponse(true, "Profile loaded", profileData(user)));
    }

    @GetMapping("/{userId}/audit-log")
    public ResponseEntity<ApiResponse> getAuditLog(@PathVariable String userId) {
        findUser(userId);
        return ResponseEntity.ok(new ApiResponse(
            true,
            "Audit log loaded",
            auditLogRepository.findTop5ByEntityTypeAndEntityIdOrderByTimestampDesc("USER", userId)));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse> updateProfile(
            @PathVariable String userId,
            @RequestBody UpdateProfileRequest request) {
        User user = findUser(userId);
        String name = request.getName() == null ? "" : request.getName().trim();

        if (name.isEmpty()) {
            return badRequest("Name is required");
        }

        Map<String, Object> oldValue = Map.of(
                "name", nullToEmpty(user.getName()),
                "phone", nullToEmpty(user.getPhone()));

        String phone = request.getPhone() == null ? "" : request.getPhone().trim();
        if (!phone.isEmpty() && !PHONE_PATTERN.matcher(phone).matches()) {
            return badRequest("Enter a valid phone number");
        }

        user.setName(name);
        user.setPhone(phone);
        user.setUpdatedAt(Instant.now());
        User savedUser = userRepository.save(user);

        logProfileChange(userId, "PROFILE_UPDATED", oldValue, Map.of(
                "name", nullToEmpty(savedUser.getName()),
                "phone", nullToEmpty(savedUser.getPhone())));

        return ResponseEntity.ok(new ApiResponse(true, "Profile updated", profileData(savedUser)));
    }

    @PostMapping(value = "/{userId}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse> uploadImage(
            @PathVariable String userId,
            @RequestParam("file") MultipartFile file) throws IOException {
        User user = findUser(userId);

        if (file.isEmpty()) {
            return badRequest("Profile image is required");
        }
        if (file.getSize() > MAX_PROFILE_IMAGE_SIZE) {
            return badRequest("Profile image must be 2MB or smaller");
        }
        if (!ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
            return badRequest("Profile image must be a jpg, jpeg, png, or webp file");
        }

        String extension = extensionFor(file.getContentType());
        String filename = userId + "-" + UUID.randomUUID() + extension;
        Path uploadDir = Paths.get("uploads", "profile-images").toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);
        Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        String imageUrl = "/uploads/profile-images/" + filename;
        String oldAvatar = user.getAvatar();
        user.setAvatar(imageUrl);
        user.setUpdatedAt(Instant.now());
        User savedUser = userRepository.save(user);

        logProfileChange(userId, "PROFILE_IMAGE_UPDATED", Map.of("avatar", nullToEmpty(oldAvatar)),
                Map.of("avatar", imageUrl));

        return ResponseEntity.ok(new ApiResponse(true, "Profile image uploaded", profileData(savedUser)));
    }

    @PostMapping("/{userId}/change-email")
    public ResponseEntity<ApiResponse> changeEmail(
            @PathVariable String userId,
            @RequestBody ChangeEmailRequest request,
            jakarta.servlet.http.HttpServletRequest servletRequest) {
        User user = findUser(userId);
        String newEmail = request.getNewEmail() == null ? "" : request.getNewEmail().trim().toLowerCase();

        if (!EMAIL_PATTERN.matcher(newEmail).matches()) {
            return badRequest("Enter a valid email address");
        }
        if (userRepository.findByEmail(newEmail).isPresent()) {
            return new ResponseEntity<>(new ApiResponse(false, "Email already exists"), HttpStatus.CONFLICT);
        }

        String token = UUID.randomUUID().toString();
        user.setPendingEmail(newEmail);
        user.setEmailVerificationToken(token);
        user.setEmailVerificationExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        String verificationLink = "/verification-success?token=" + token;
        logProfileChange(userId, "EMAIL_CHANGE_REQUESTED", Map.of("email", user.getEmail()),
                Map.of("pendingEmail", newEmail));

        String frontendUrl;
        if (configuredFrontendUrl != null && !configuredFrontendUrl.trim().isEmpty()) {
            String baseUrl = configuredFrontendUrl.trim();
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            frontendUrl = baseUrl + verificationLink;
        } else {
            String origin = servletRequest != null ? servletRequest.getHeader("Origin") : null;
            if (origin == null || origin.isEmpty()) {
                origin = servletRequest != null ? servletRequest.getHeader("Referer") : null;
                if (origin != null && !origin.isEmpty()) {
                    try {
                        java.net.URI uri = new java.net.URI(origin);
                        origin = uri.getScheme() + "://" + uri.getAuthority();
                    } catch (Exception e) {
                        origin = null;
                    }
                }
            }
            if (origin != null && !origin.isEmpty()) {
                if (origin.endsWith("/")) {
                    origin = origin.substring(0, origin.length() - 1);
                }
                frontendUrl = origin + verificationLink;
            } else {
                frontendUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                        .path(verificationLink)
                        .build()
                        .toUriString();
            }
        }
        try {
            String emailBody = String.format(
                    "Hello %s,%n%nPlease verify your new email address by clicking the link below:%n%n%s%n%nThis link is valid for 24 hours.",
                    nullToEmpty(user.getName()),
                    frontendUrl);
            emailService.send(newEmail, "Confirm your new email", emailBody);
        } catch (Exception e) {
            return new ResponseEntity<>(new ApiResponse(false, "Failed to send verification email: " + e.getMessage()),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return ResponseEntity.ok(new ApiResponse(
                true,
                "Verification link generated and sent to your new email.",
                Map.of("verificationLink", frontendUrl, "pendingEmail", newEmail)));
    }

    @GetMapping("/verify-email")
    public ResponseEntity<ApiResponse> verifyEmail(@RequestParam String token) {
        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid verification token"));

        if (user.getEmailVerificationExpiresAt() == null || user.getEmailVerificationExpiresAt().isBefore(Instant.now())) {
            return badRequest("Verification link has expired");
        }

        String oldEmail = user.getEmail();
        String newEmail = user.getPendingEmail();
        user.setEmail(newEmail);
        user.setPendingEmail(null);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiresAt(null);
        user.setEmailVerified(true);
        user.setUpdatedAt(Instant.now());
        User savedUser = userRepository.save(user);

        logProfileChange(savedUser.getId(), "EMAIL_CHANGED", Map.of("email", oldEmail), Map.of("email", newEmail));
        return ResponseEntity.ok(new ApiResponse(true, "Email verified and updated", profileData(savedUser)));
    }

    @PostMapping("/{userId}/change-password")
    public ResponseEntity<ApiResponse> changePassword(
            @PathVariable String userId,
            @RequestBody ChangePasswordRequest request) {
        User user = findUser(userId);

        if (!passwordEncoder.matches(nullToEmpty(request.getCurrentPassword()), user.getPassword())) {
            return new ResponseEntity<>(new ApiResponse(false, "Current password is incorrect"), HttpStatus.UNAUTHORIZED);
        }
        if (!isStrongPassword(request.getNewPassword())) {
            return badRequest(strongPasswordMessage());
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        logProfileChange(userId, "PASSWORD_CHANGED", Map.of("password", "updated"), Map.of("password", "updated"));
        return ResponseEntity.ok(new ApiResponse(true, "Password changed"));
    }

    @PostMapping("/{userId}/deactivate")
    public ResponseEntity<ApiResponse> deactivateAccount(@PathVariable String userId) {
        User user = findUser(userId);
        user.setActive(false);
        user.setDeactivatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        logProfileChange(userId, "ACCOUNT_DEACTIVATED", Map.of("active", true), Map.of("active", false));
        return ResponseEntity.ok(new ApiResponse(true, "Account deactivated"));
    }

    public static boolean isStrongPassword(String password) {
        return password != null && STRONG_PASSWORD_PATTERN.matcher(password).matches();
    }

    public static String strongPasswordMessage() {
        return "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";
    }

    private User findUser(String userId) {
        ObjectId objectId;
        try {
            objectId = new ObjectId(userId);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid user id");
        }
        return userRepository.findById(objectId).orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Map<String, Object> profileData(User user) {
        return Map.ofEntries(
                Map.entry("id", user.getId()),
                Map.entry("name", nullToEmpty(user.getName())),
                Map.entry("email", nullToEmpty(user.getEmail())),
                Map.entry("role", nullToEmpty(user.getRole())),
                Map.entry("group", nullToEmpty(user.getGroup())),
                Map.entry("avatar", nullToEmpty(user.getAvatar())),
                Map.entry("phone", nullToEmpty(user.getPhone())),
                Map.entry("active", user.isActive()),
                Map.entry("emailVerified", user.isEmailVerified()),
                Map.entry("emailNotificationsEnabled", user.isEmailNotificationsEnabled()),
                Map.entry("pendingEmail", nullToEmpty(user.getPendingEmail())),
                Map.entry("createdAt", user.getCreatedAt()),
                Map.entry("updatedAt", user.getUpdatedAt()));
    }

    private void logProfileChange(
            String userId,
            String action,
            Map<String, Object> oldValue,
            Map<String, Object> newValue) {
        auditLogRepository.save(new AuditLog("USER", userId, action, userId, oldValue, newValue));
    }

    private ResponseEntity<ApiResponse> badRequest(String message) {
        return new ResponseEntity<>(new ApiResponse(false, message), HttpStatus.BAD_REQUEST);
    }

    private String extensionFor(String contentType) {
        if ("image/png".equals(contentType)) {
            return ".png";
        }
        if ("image/webp".equals(contentType)) {
            return ".webp";
        }
        return ".jpg";
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
