package com.onboarding.diary.repository;

import com.onboarding.diary.entity.NoteEntry;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NoteEntryRepository extends JpaRepository<NoteEntry, String> {

    Page<NoteEntry> findByUserIdAndDeletedFalse(String userId, Pageable pageable);

    long countByUserIdAndDeletedFalse(String userId);

    List<NoteEntry> findByUserIdAndDateBetweenAndDeletedFalse(String userId, String dateFrom, String dateTo);

    Optional<NoteEntry> findByIdAndDeletedFalse(String id);

    @Query("SELECT n FROM NoteEntry n WHERE n.userId = :userId AND n.deleted = false AND n.tags LIKE %:tag%")
    Page<NoteEntry> findByUserIdAndTagContainingAndDeletedFalse(@Param("userId") String userId, @Param("tag") String tag, Pageable pageable);

    @Query("SELECT DISTINCT n.tags FROM NoteEntry n WHERE n.userId = :userId AND n.deleted = false AND n.tags IS NOT NULL")
    List<String> findDistinctTagsByUserId(@Param("userId") String userId);

    Page<NoteEntry> findByUserIdAndFolderAndDeletedFalse(String userId, String folder, Pageable pageable);

    Page<NoteEntry> findByUserIdAndFolderIsNullAndDeletedFalse(String userId, Pageable pageable);

    @Query("SELECT DISTINCT n.folder FROM NoteEntry n WHERE n.userId = :userId AND n.deleted = false AND n.folder IS NOT NULL")
    List<String> findDistinctFoldersByUserId(@Param("userId") String userId);

    @Query("SELECT n FROM NoteEntry n WHERE n.userId = :userId AND n.deleted = false AND n.tags LIKE %:tag% AND n.folder = :folder")
    Page<NoteEntry> findByUserIdAndTagContainingAndFolderAndDeletedFalse(@Param("userId") String userId, @Param("tag") String tag, @Param("folder") String folder, Pageable pageable);

    @Query("SELECT n FROM NoteEntry n WHERE n.userId = :userId AND n.deleted = false AND n.tags LIKE %:tag% AND n.folder IS NULL")
    Page<NoteEntry> findByUserIdAndTagContainingAndFolderIsNullAndDeletedFalse(@Param("userId") String userId, @Param("tag") String tag, Pageable pageable);
}
