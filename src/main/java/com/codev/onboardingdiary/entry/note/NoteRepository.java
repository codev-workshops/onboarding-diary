package com.codev.onboardingdiary.entry.note;

import com.codev.onboardingdiary.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence for {@link Note}. */
public interface NoteRepository extends JpaRepository<Note, Long>, JpaSpecificationExecutor<Note> {

  Optional<Note> findByIdAndOwner(Long id, User owner);

  long countByOwner(User owner);

  List<Note> findTop10ByOwnerOrderByCreatedAtDesc(User owner);

  @Query("select distinct t from Note n join n.tags t where n.owner = :owner order by t")
  List<String> findDistinctTags(@Param("owner") User owner);
}
