package com.urbanwatch.dto;

import com.urbanwatch.entity.CallStatus;
import com.urbanwatch.entity.SlaLevel;
import java.time.LocalDateTime;

public class CallResponse {

    private Long id;
    private String title;
    private String description;
    private CallStatus status;
    private Double latitude;
    private Double longitude;
    private SlaLevel slaLevel;
    private boolean paused;
    private String prefeituraObservation;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime pausedAt;
    private Long userId;
    private String userName;

    public CallResponse() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public CallStatus getStatus() { return status; }
    public void setStatus(CallStatus status) { this.status = status; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public SlaLevel getSlaLevel() { return slaLevel; }
    public void setSlaLevel(SlaLevel slaLevel) { this.slaLevel = slaLevel; }
    public boolean isPaused() { return paused; }
    public void setPaused(boolean paused) { this.paused = paused; }
    public String getPrefeituraObservation() { return prefeituraObservation; }
    public void setPrefeituraObservation(String prefeituraObservation) { this.prefeituraObservation = prefeituraObservation; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public LocalDateTime getPausedAt() { return pausedAt; }
    public void setPausedAt(LocalDateTime pausedAt) { this.pausedAt = pausedAt; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
}
