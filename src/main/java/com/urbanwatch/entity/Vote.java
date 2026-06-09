package com.urbanwatch.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "votes",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_votes_call_user",
                columnNames = {"call_id", "user_id"}
        )
)
public class Vote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // true = like (positivo), false = dislike (negativo)
    @Column(nullable = false)
    private Boolean value;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "call_id", nullable = false)
    private Call call;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public Vote() {
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Boolean getValue() { return value; }
    public void setValue(Boolean value) { this.value = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public Call getCall() { return call; }
    public void setCall(Call call) { this.call = call; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
