package com.onboardingdiary.repository;

import com.onboardingdiary.model.ShareHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShareHistoryRepository extends JpaRepository<ShareHistory, Long> {

    List<ShareHistory> findByEntryIdOrderBySharedAtDesc(Long entryId);

    List<ShareHistory> findByUserIdOrderBySharedAtDesc(Long userId);
}
