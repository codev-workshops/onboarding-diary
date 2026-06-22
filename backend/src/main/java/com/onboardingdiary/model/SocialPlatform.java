package com.onboardingdiary.model;

import com.fasterxml.jackson.annotation.JsonValue;

public enum SocialPlatform {
    TWITTER("twitter"),
    LINKEDIN("linkedin"),
    FACEBOOK("facebook");

    private final String value;

    SocialPlatform(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static SocialPlatform fromValue(String value) {
        for (SocialPlatform platform : values()) {
            if (platform.value.equalsIgnoreCase(value)) {
                return platform;
            }
        }
        throw new IllegalArgumentException("Unknown platform: " + value);
    }
}
