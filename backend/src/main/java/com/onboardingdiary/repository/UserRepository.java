package com.onboardingdiary.repository;

import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByManagerId(UUID managerId);

    @Query("SELECT u FROM User u WHERE " +
            "(:role IS NULL OR u.role = :role) AND " +
            "(:isActive IS NULL OR u.isActive = :isActive)")
    Page<User> findWithFilters(@Param("role") Role role,
                               @Param("isActive") Boolean isActive,
                               Pageable pageable);
}
