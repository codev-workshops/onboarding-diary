package com.codev.onboardingdiary.repository;

import com.codev.onboardingdiary.domain.Issue;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.codev.onboardingdiary.domain.IssueStatus;

public interface IssueRepository extends JpaRepository<Issue, Long>, JpaSpecificationExecutor<Issue> {

    Optional<Issue> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    @Query("""
            select i from Issue i
            where i.user.id = :userId
              and (lower(i.title) like lower(concat('%', :q, '%'))
                   or lower(coalesce(i.description, '')) like lower(concat('%', :q, '%'))
                   or lower(coalesce(i.resolutionNotes, '')) like lower(concat('%', :q, '%')))
            order by i.date desc, i.id desc
            """)
    List<Issue> searchText(@Param("userId") Long userId, @Param("q") String q);

    long countByUserIdAndStatusIn(Long userId, List<IssueStatus> statuses);

    @Query("select i.severity, count(i) from Issue i where i.user.id in :userIds group by i.severity")
    List<Object[]> countBySeverityForUsers(@Param("userIds") List<Long> userIds);

    @Query("""
            select count(i) from Issue i
            where i.user.id in :userIds and i.status in :statuses
            """)
    long countByUsersAndStatuses(@Param("userIds") List<Long> userIds,
                                 @Param("statuses") List<IssueStatus> statuses);
}
