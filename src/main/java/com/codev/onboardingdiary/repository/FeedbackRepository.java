package com.codev.onboardingdiary.repository;

import com.codev.onboardingdiary.domain.Feedback;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeedbackRepository extends JpaRepository<Feedback, Long>, JpaSpecificationExecutor<Feedback> {

    Optional<Feedback> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    @Query("""
            select f from Feedback f
            where f.user.id = :userId
              and (lower(f.subject) like lower(concat('%', :q, '%'))
                   or lower(f.details) like lower(concat('%', :q, '%')))
            order by f.date desc, f.id desc
            """)
    List<Feedback> searchText(@Param("userId") Long userId, @Param("q") String q);
}
