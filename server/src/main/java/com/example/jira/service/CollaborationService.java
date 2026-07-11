package com.example.jira.service;

import com.example.jira.dto.CollaborationEvent;
import com.example.jira.model.Project;
import com.example.jira.repository.Projectrepository;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CollaborationService {
    private final ObjectMapper objectMapper;
    private final Projectrepository projectRepository;
    private final Map<String, Map<String, WebSocketSession>> projectSessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionProjects = new ConcurrentHashMap<>();
    private final Map<String, String> sessionUsers = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> deliveredEventsBySession = new ConcurrentHashMap<>();

    public CollaborationService(ObjectMapper objectMapper, Projectrepository projectRepository) {
        this.objectMapper = objectMapper;
        this.projectRepository = projectRepository;
    }

    public boolean isProjectMember(String projectId, String userId) {
        if (projectId == null || userId == null || !ObjectId.isValid(projectId)) {
            return false;
        }
        Project project = projectRepository.findById(new ObjectId(projectId)).orElse(null);
        if (project == null) {
            return false;
        }
        return userId.equals(project.getOwnerId()) || (project.getMemberIds() != null && project.getMemberIds().contains(userId));
    }

    public void register(String projectId, String userId, WebSocketSession session) throws IOException {
        projectSessions.computeIfAbsent(projectId, ignored -> new ConcurrentHashMap<>()).put(session.getId(), session);
        sessionProjects.put(session.getId(), projectId);
        sessionUsers.put(session.getId(), userId);
        deliveredEventsBySession.put(session.getId(), Collections.newSetFromMap(new ConcurrentHashMap<>()));
        broadcastActiveUsers(projectId);
    }

    public void unregister(WebSocketSession session) throws IOException {
        String projectId = sessionProjects.remove(session.getId());
        sessionUsers.remove(session.getId());
        deliveredEventsBySession.remove(session.getId());
        if (projectId != null && projectSessions.containsKey(projectId)) {
            projectSessions.get(projectId).remove(session.getId());
            broadcastActiveUsers(projectId);
        }
    }

    public List<String> getActiveUsers(String projectId) {
        Map<String, WebSocketSession> sessions = projectSessions.getOrDefault(projectId, Map.of());
        return sessions.keySet().stream()
                .map(sessionUsers::get)
                .filter(userId -> userId != null)
                .distinct()
                .toList();
    }

    public void broadcast(CollaborationEvent event) {
        if (event == null || event.getProjectId() == null) {
            return;
        }
        Map<String, WebSocketSession> sessions = projectSessions.getOrDefault(event.getProjectId(), Map.of());
        sessions.values().forEach(session -> sendOnce(session, event));
    }

    private void broadcastActiveUsers(String projectId) throws IOException {
        CollaborationEvent event = new CollaborationEvent(
                "ACTIVE_USERS",
                projectId,
                null,
                null,
                Map.of("userIds", getActiveUsers(projectId)));
        for (WebSocketSession session : new ArrayList<>(projectSessions.getOrDefault(projectId, Map.of()).values())) {
            sendOnce(session, event);
        }
    }

    private void sendOnce(WebSocketSession session, CollaborationEvent event) {
        if (session == null || !session.isOpen() || event.getEventId() == null) {
            return;
        }
        Set<String> delivered = deliveredEventsBySession.computeIfAbsent(
                session.getId(),
                ignored -> Collections.newSetFromMap(new ConcurrentHashMap<>()));
        if (!delivered.add(event.getEventId())) {
            return;
        }
        trimDelivered(delivered);
        try {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(event)));
        } catch (IOException ignored) {
        }
    }

    private void trimDelivered(Set<String> delivered) {
        if (delivered.size() <= 300) {
            return;
        }
        List<String> ids = new ArrayList<>(delivered);
        for (int index = 0; index < Math.min(100, ids.size()); index++) {
            delivered.remove(ids.get(index));
        }
    }

    public Map<String, String> parseQuery(String query) {
        Map<String, String> params = new LinkedHashMap<>();
        if (query == null || query.isBlank()) {
            return params;
        }
        for (String pair : query.split("&")) {
            String[] parts = pair.split("=", 2);
            if (parts.length == 2) {
                params.put(parts[0], parts[1]);
            }
        }
        return params;
    }
}
