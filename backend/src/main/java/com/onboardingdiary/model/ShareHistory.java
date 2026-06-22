package com.onboardingdiary.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "share_history")
public class ShareHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entry_id", nullable = false)
    private DiaryEntry entry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SocialPlatform platform;

    @Column(name = "shared_at", nullable = false, updatable = false)
    private LocalDateTime sharedAt = LocalDateTime.now();

    @Column(name = "post_url", length = 1024)
    private String postUrl;

    public ShareHistory() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public DiaryEntry getEntry() { return entry; }
    public void setEntry(DiaryEntry entry) { this.entry = entry; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public SocialPlatform getPlatform() { return platform; }
    public void setPlatform(SocialPlatform platform) { this.platform = platform; }
    public LocalDateTime getSharedAt() { return sharedAt; }
    public void setSharedAt(LocalDateTime sharedAt) { this.sharedAt = sharedAt; }
    public String getPostUrl() { return postUrl; }
    public void setPostUrl(String postUrl) { this.postUrl = postUrl; }
}
