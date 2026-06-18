package com.onboardingdiary.repository;

import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    @Query("SELECT u FROM User u WHERE lower(u.email) = lower(:email)")
    Optional<User> findByEmailIgnoreCase(@Param("email") String email);

    @Query("SELECT u.id FROM User u WHERE u.managerId = :managerId")
    List<Long> findIdsByManagerId(@Param("managerId") Long managerId);

    @Query("SELECT (count(u) > 0) FROM User u WHERE lower(u.email) = lower(:email)")
    boolean existsByEmailIgnoreCase(@Param("email") String email);

    Page<User> findByRole(Role role, Pageable pageable);

    Page<User> findByManagerId(Long managerId, Pageable pageable);
}
