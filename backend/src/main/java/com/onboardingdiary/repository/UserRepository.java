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

    @Query(value = "SELECT * FROM users u WHERE " +
            "(CAST(:role AS VARCHAR) IS NULL OR u.role = CAST(:role AS VARCHAR)) AND " +
            "(CAST(:isActive AS BOOLEAN) IS NULL OR u.is_active = :isActive)",
            countQuery = "SELECT COUNT(*) FROM users u WHERE " +
            "(CAST(:role AS VARCHAR) IS NULL OR u.role = CAST(:role AS VARCHAR)) AND " +
            "(CAST(:isActive AS BOOLEAN) IS NULL OR u.is_active = :isActive)",
            nativeQuery = true)
    Page<User> findWithFilters(@Param("role") String role,
                               @Param("isActive") Boolean isActive,
                               Pageable pageable);
}
