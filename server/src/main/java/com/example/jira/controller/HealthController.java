package com.example.jira.controller;

import com.example.jira.dto.HealthResponse;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*")
@RestController
public class HealthController {

    private static final Logger logger = LoggerFactory.getLogger(HealthController.class);

    @Autowired
    private MongoTemplate mongoTemplate;

    @GetMapping("/health")
    public ResponseEntity<HealthResponse> healthcheck() {
        logger.info("Received health check ping request.");
        try {
            // Check database connectivity (ping) without writing anything
            mongoTemplate.getDb().runCommand(new Document("ping", 1));
            logger.info("Health check ping passed: MongoDB connection is healthy.");
            return ResponseEntity.ok(new HealthResponse("UP", "jira-clone"));
        } catch (Exception e) {
            logger.error("Health check ping failed: MongoDB is unavailable. Error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new HealthResponse("DOWN", "jira-clone"));
        }
    }
}
