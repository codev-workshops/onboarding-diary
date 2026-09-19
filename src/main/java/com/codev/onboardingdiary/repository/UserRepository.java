package com.codev.onboardingdiary.repository;

import com.codev.onboardingdiary.domain.Role;
import com.codev.onboardingdiary.domain.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    @EntityGraph(attributePaths = "manager")
    Optional<User> findWithManagerById(Long id);

    @EntityGraph(attributePaths = "manager")
    List<User> findAllWithManagerByOrderByNameAsc();

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findByManagerIdOrderByNameAsc(Long managerId);

    List<User> findByRoleOrderByNameAsc(Role role);

    List<User> findAllByOrderByNameAsc();

    @Query("select u from User u where u.role = :role and u.active = true order by u.name")
    List<User> findActiveByRole(@Param("role") Role role);
}
