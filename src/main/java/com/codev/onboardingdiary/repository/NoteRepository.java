package com.codev.onboardingdiary.repository;

import com.codev.onboardingdiary.domain.Note;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NoteRepository extends JpaRepository<Note, Long>, JpaSpecificationExecutor<Note> {

    Optional<Note> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    @Query("""
            select n from Note n
            where n.user.id = :userId
              and (lower(n.title) like lower(concat('%', :q, '%'))
                   or lower(n.content) like lower(concat('%', :q, '%'))
                   or lower(coalesce(n.tags, '')) like lower(concat('%', :q, '%')))
            order by n.date desc, n.id desc
            """)
    List<Note> searchText(@Param("userId") Long userId, @Param("q") String q);
}
