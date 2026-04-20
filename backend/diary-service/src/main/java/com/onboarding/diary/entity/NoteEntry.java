package com.onboarding.diary.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "note_entries")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoteEntry {

    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private String date;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String content;

    private String tags;

    @Column(nullable = false)
    private boolean deleted;

    @Column(name = "created_at", nullable = false)
    private String createdAt;

    @Column(name = "updated_at", nullable = false)
    private String updatedAt;
}
