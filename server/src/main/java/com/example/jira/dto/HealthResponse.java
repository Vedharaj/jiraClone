package com.example.jira.dto;

import java.time.Instant;

/**
 * Data Transfer Object representing the health check response.
 */
public class HealthResponse {
    private String status;
    private String timestamp;
    private String service;

    public HealthResponse() {
        this.timestamp = Instant.now().toString();
    }

    public HealthResponse(String status, String service) {
        this.status = status;
        this.timestamp = Instant.now().toString();
        this.service = service;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getService() {
        return service;
    }

    public void setService(String service) {
        this.service = service;
    }
}
