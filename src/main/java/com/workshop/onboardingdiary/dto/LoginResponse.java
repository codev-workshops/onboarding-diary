package com.workshop.onboardingdiary.dto;

public record LoginResponse(String token, String tokenType, UserSummaryResponse user) {

    public static LoginResponse of(String token, UserSummaryResponse user) {
        return new LoginResponse(token, "Bearer", user);
    }
}
