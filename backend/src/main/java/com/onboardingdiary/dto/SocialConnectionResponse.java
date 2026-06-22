package com.onboardingdiary.dto;

import com.onboardingdiary.model.SocialConnection;

import java.time.LocalDateTime;

public record SocialConnectionResponse(
    Long id,
    String platform,
    String platformUserId,
    LocalDateTime connectedAt
) {
    public static SocialConnectionResponse from(SocialConnection connection) {
        return new SocialConnectionResponse(
            connection.getId(),
            connection.getPlatform().getValue(),
            connection.getPlatformUserId(),
            connection.getConnectedAt()
        );
    }
}
