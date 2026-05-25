package com.urbanwatch.dto;

import java.time.LocalDateTime;

public class CommentResponse {

    private Long id;
    private String content;
    private LocalDateTime createdAt;
    private Long userId;
    private String userName;
    private Long callId;

    public CommentResponse() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public Long getCallId() { return callId; }
    public void setCallId(Long callId) { this.callId = callId; }
}