package com.onboarding.diary.repository;

import com.onboarding.diary.entity.TaskCategory;
import com.onboarding.diary.entity.TaskEntry;
import com.onboarding.diary.entity.TaskStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskEntryRepository extends JpaRepository<TaskEntry, String> {

    Page<TaskEntry> findByUserIdAndDeletedFalse(String userId, Pageable pageable);

    long countByUserIdAndDeletedFalse(String userId);

    long countByUserIdAndStatusAndDeletedFalse(String userId, TaskStatus status);

    List<TaskEntry> findByUserIdAndDateBetweenAndDeletedFalse(String userId, String dateFrom, String dateTo);

    Optional<TaskEntry> findByIdAndDeletedFalse(String id);

    Page<TaskEntry> findByUserIdAndStatusAndDeletedFalse(String userId, TaskStatus status, Pageable pageable);

    Page<TaskEntry> findByUserIdAndCategoryAndDeletedFalse(String userId, TaskCategory category, Pageable pageable);

    Page<TaskEntry> findByUserIdAndCategoryAndStatusAndDeletedFalse(String userId, TaskCategory category, TaskStatus status, Pageable pageable);

    @Query("SELECT t FROM TaskEntry t WHERE t.userId = :userId AND t.deleted = false ORDER BY t.createdAt DESC")
    List<TaskEntry> findRecentByUserId(@Param("userId") String userId, Pageable pageable);

    long countByUserIdAndCategoryAndDeletedFalse(String userId, TaskCategory category);
}
