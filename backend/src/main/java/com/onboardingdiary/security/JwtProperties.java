package com.onboardingdiary.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT configuration. Per the MVP simplification (DESIGN_REVIEW.md), we issue a
 * single short-TTL access token and do not implement refresh tokens.
 */
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    /** Base64 or raw secret used to sign tokens (HMAC-SHA256). Must be >= 32 bytes. */
    private String secret;

    /** Access token time-to-live in seconds. */
    private long expirationSeconds = 3600;

    private String issuer = "onboarding-diary";

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    public void setExpirationSeconds(long expirationSeconds) {
        this.expirationSeconds = expirationSeconds;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }
}
