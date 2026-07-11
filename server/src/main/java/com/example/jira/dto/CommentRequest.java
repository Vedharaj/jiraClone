package com.example.jira.dto;

public class CommentRequest {
    private String userId;
    private String comment;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
}
