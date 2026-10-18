package com.codev.onboardingdiary.user;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence for {@link User}. */
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

  Optional<User> findByEmail(String email);

  boolean existsByEmail(String email);

  boolean existsByRole(Role role);

  long countByRoleAndActiveTrue(Role role);

  long countByManager(User manager);

  List<User> findByRoleAndActiveTrueOrderByNameAsc(Role role);

  @Modifying
  @Query("update User u set u.manager = null where u.manager = :manager")
  int unassignRecruitsOf(@Param("manager") User manager);
}
