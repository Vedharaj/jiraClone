package com.example.jira.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Autowired
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void send(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            // Fallback to default address if username is not configured
            String sender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : "crisvedharaj@gmail.com";
            message.setFrom(sender);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);

            logger.info("Attempting to send email from {} to {} with subject: \"{}\"", sender, to, subject);
            mailSender.send(message);
            logger.info("Email sent successfully to {}", to);
        } catch (Exception e) {
            logger.error("Failed to send email to {}. Error: {}", to, e.getMessage(), e);
            throw new RuntimeException("Email sending failed", e);
        }
    }
}
