package com.codev.onboardingdiary.note;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NoteRepository extends JpaRepository<Note, Long>, JpaSpecificationExecutor<Note> {

  Optional<Note> findByIdAndOwnerId(Long id, Long ownerId);

  boolean existsByOwnerId(Long ownerId);

  @Query("select distinct t from Note n join n.tags t where n.ownerId = :ownerId order by t")
  List<String> findDistinctTagsByOwnerId(@Param("ownerId") Long ownerId);
}
