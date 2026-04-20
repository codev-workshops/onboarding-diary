package com.onboarding.diary.repository;

import com.onboarding.diary.entity.FeedbackEntry;
import com.onboarding.diary.entity.FeedbackType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedbackEntryRepository extends JpaRepository<FeedbackEntry, String> {

    Page<FeedbackEntry> findByUserIdAndDeletedFalse(String userId, Pageable pageable);

    long countByUserIdAndDeletedFalse(String userId);

    List<FeedbackEntry> findByUserIdAndDateBetweenAndDeletedFalse(String userId, String dateFrom, String dateTo);

    Optional<FeedbackEntry> findByIdAndDeletedFalse(String id);

    Page<FeedbackEntry> findByUserIdAndTypeAndDeletedFalse(String userId, FeedbackType type, Pageable pageable);
}
