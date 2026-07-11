package com.example.jira.controller;

import com.example.jira.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
public class MailDebugController {

    private static final Logger logger = LoggerFactory.getLogger(MailDebugController.class);

    @Autowired
    private EmailService emailService;

    @GetMapping("/api/debug/mail")
    public ResponseEntity<?> sendTestMail(@RequestParam(value = "to") String to) {
        logger.info("Received request to send debug email to: {}", to);
        if (to == null || to.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "ERROR",
                    "message", "The 'to' parameter is required."
            ));
        }

        try {
            String subject = "Jira Clone - SMTP Test Email";
            String body = "Hello,\n\nThis is a debug test email sent from the Jira Clone backend application to verify your SMTP mail configuration.\n\nIf you received this, your email configuration is working perfectly!\n\nTimestamp: " + java.time.Instant.now().toString();

            emailService.send(to, subject, body);

            return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "message", "Test email sent successfully to " + to
            ));
        } catch (Exception e) {
            logger.error("Failed to send debug test email to: {}. Error: {}", to, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "FAILED",
                    "message", "Failed to send email: " + e.getMessage(),
                    "details", e.toString()
            ));
        }
    }
}
