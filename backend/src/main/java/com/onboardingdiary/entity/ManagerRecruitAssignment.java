package com.onboardingdiary.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"manager_id", "recruit_id"}))
public class ManagerRecruitAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "manager_id")
    private User manager;

    @ManyToOne
    @JoinColumn(name = "recruit_id")
    private User recruit;

    private LocalDateTime assignedAt;

    @PrePersist
    protected void onCreate() {
        assignedAt = LocalDateTime.now();
    }

    public ManagerRecruitAssignment() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getManager() { return manager; }
    public void setManager(User manager) { this.manager = manager; }

    public User getRecruit() { return recruit; }
    public void setRecruit(User recruit) { this.recruit = recruit; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }
}
