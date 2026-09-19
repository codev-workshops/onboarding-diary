package com.codev.onboardingdiary.repository;

import com.codev.onboardingdiary.domain.Task;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.codev.onboardingdiary.domain.TaskStatus;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    Optional<Task> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    @Query("""
            select t from Task t
            where t.user.id = :userId
              and (lower(t.title) like lower(concat('%', :q, '%'))
                   or lower(coalesce(t.description, '')) like lower(concat('%', :q, '%'))
                   or lower(t.category) like lower(concat('%', :q, '%')))
            order by t.date desc, t.id desc
            """)
    List<Task> searchText(@Param("userId") Long userId, @Param("q") String q);

    long countByUserIdAndStatus(Long userId, TaskStatus status);

    @Query("select distinct t.category from Task t where t.user.id = :userId order by t.category")
    List<String> findCategories(@Param("userId") Long userId);

    @Query("select t.status, count(t) from Task t where t.user.id in :userIds group by t.status")
    List<Object[]> countByStatusForUsers(@Param("userIds") List<Long> userIds);
}
