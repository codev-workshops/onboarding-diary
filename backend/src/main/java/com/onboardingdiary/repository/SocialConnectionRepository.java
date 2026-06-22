package com.onboardingdiary.repository;

import com.onboardingdiary.model.SocialConnection;
import com.onboardingdiary.model.SocialPlatform;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SocialConnectionRepository extends JpaRepository<SocialConnection, Long> {

    List<SocialConnection> findByUserId(Long userId);

    Optional<SocialConnection> findByUserIdAndPlatform(Long userId, SocialPlatform platform);

    void deleteByUserIdAndPlatform(Long userId, SocialPlatform platform);
}
