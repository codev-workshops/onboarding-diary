package com.onboarding.auth.repository;

import com.onboarding.auth.entity.Role;
import com.onboarding.auth.entity.User;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<User> findByManagerId(String managerId, Pageable pageable);

    Page<User> findByRole(Role role, Pageable pageable);

    Page<User> findByActive(boolean active, Pageable pageable);

    Page<User> findAllByActiveTrue(Pageable pageable);
}
