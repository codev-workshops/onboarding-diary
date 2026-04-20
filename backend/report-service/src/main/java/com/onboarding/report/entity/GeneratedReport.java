package com.onboarding.report.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "generated_reports")
public class GeneratedReport {

    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "target_user_id")
    private String targetUserId;

    @Column(name = "date_from", nullable = false)
    private String dateFrom;

    @Column(name = "date_to", nullable = false)
    private String dateTo;

    @Column(nullable = false)
    private String categories;

    @Column(nullable = false)
    private String format;

    @Column(nullable = false)
    private String status;

    @Column(name = "report_data", columnDefinition = "TEXT")
    private String reportData;

    @Column(name = "created_at", nullable = false)
    private String createdAt;
}
