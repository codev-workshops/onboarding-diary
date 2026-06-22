package com.onboardingdiary.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "social_connections", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "platform"})
})
public class SocialConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SocialPlatform platform;

    @Column(name = "access_token", nullable = false, length = 1024)
    private String accessToken;

    @Column(name = "refresh_token", length = 1024)
    private String refreshToken;

    @Column(name = "platform_user_id")
    private String platformUserId;

    @Column(name = "connected_at", nullable = false, updatable = false)
    private LocalDateTime connectedAt = LocalDateTime.now();

    public SocialConnection() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public SocialPlatform getPlatform() { return platform; }
    public void setPlatform(SocialPlatform platform) { this.platform = platform; }
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    public String getPlatformUserId() { return platformUserId; }
    public void setPlatformUserId(String platformUserId) { this.platformUserId = platformUserId; }
    public LocalDateTime getConnectedAt() { return connectedAt; }
    public void setConnectedAt(LocalDateTime connectedAt) { this.connectedAt = connectedAt; }
}
