package com.codev.onboardingdiary.entry.task;

import com.codev.onboardingdiary.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence for {@link TaskEntry}. */
public interface TaskRepository
    extends JpaRepository<TaskEntry, Long>, JpaSpecificationExecutor<TaskEntry> {

  Optional<TaskEntry> findByIdAndOwner(Long id, User owner);

  long countByOwner(User owner);

  long countByOwnerAndStatus(User owner, TaskStatus status);

  @Query("select t.status, count(t) from TaskEntry t where t.owner = :owner group by t.status")
  List<Object[]> countByStatus(@Param("owner") User owner);

  List<TaskEntry> findTop10ByOwnerOrderByCreatedAtDesc(User owner);
}
