package com.example.jira.service;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;

@Component
public class CollaborationWebSocketHandler extends TextWebSocketHandler {
    private final CollaborationService collaborationService;

    public CollaborationWebSocketHandler(CollaborationService collaborationService) {
        this.collaborationService = collaborationService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Map<String, String> params = collaborationService.parseQuery(session.getUri() != null ? session.getUri().getQuery() : null);
        String projectId = params.get("projectId");
        String userId = params.get("userId");

        if (!collaborationService.isProjectMember(projectId, userId)) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("User is not a project member"));
            return;
        }

        collaborationService.register(projectId, userId, session);
        session.sendMessage(new TextMessage("{\"type\":\"CONNECTED\"}"));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        collaborationService.unregister(session);
    }
}
