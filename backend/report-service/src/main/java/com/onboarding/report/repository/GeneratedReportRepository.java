package com.onboarding.report.repository;

import com.onboarding.report.entity.GeneratedReport;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GeneratedReportRepository extends JpaRepository<GeneratedReport, String> {

    Page<GeneratedReport> findByUserId(String userId, Pageable pageable);

    Optional<GeneratedReport> findByIdAndUserId(String id, String userId);
}
