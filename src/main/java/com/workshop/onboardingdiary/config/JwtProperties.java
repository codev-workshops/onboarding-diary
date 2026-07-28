package com.workshop.onboardingdiary.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT settings (decision D4), populated from the JWT_* environment variables.
 */
@ConfigurationProperties(prefix = "onboarding-diary.jwt")
public class JwtProperties {

    private String secret;
    private Duration expiry = Duration.ofHours(8);
    private String cookieName = "ACCESS_TOKEN";
    private boolean cookieSecure = false;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public Duration getExpiry() {
        return expiry;
    }

    public void setExpiry(Duration expiry) {
        this.expiry = expiry;
    }

    public String getCookieName() {
        return cookieName;
    }

    public void setCookieName(String cookieName) {
        this.cookieName = cookieName;
    }

    public boolean isCookieSecure() {
        return cookieSecure;
    }

    public void setCookieSecure(boolean cookieSecure) {
        this.cookieSecure = cookieSecure;
    }
}
