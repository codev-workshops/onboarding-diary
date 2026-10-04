package com.codev.onboardingdiary.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

  Optional<User> findByEmail(String email);

  boolean existsByEmail(String email);

  @Query("select count(u) from User u join u.roles r where r = :role and u.enabled = true")
  long countEnabledWithRole(@Param("role") Role role);
}
