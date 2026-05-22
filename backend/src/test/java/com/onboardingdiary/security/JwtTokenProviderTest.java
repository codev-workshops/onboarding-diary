package com.onboardingdiary.security;

import com.onboardingdiary.config.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties();
        props.getJwt().setSecret("test-secret-key-must-be-at-least-32-characters-long");
        props.getJwt().setExpirationMs(3600000);
        jwtTokenProvider = new JwtTokenProvider(props);
    }

    @Test
    void generateToken_returnsValidJwt() {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId, "test@test.com", "RECRUIT");

        assertNotNull(token);
        assertFalse(token.isEmpty());
        assertTrue(token.split("\\.").length == 3);
    }

    @Test
    void getUserIdFromToken_returnsCorrectId() {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId, "test@test.com", "RECRUIT");

        UUID extracted = jwtTokenProvider.getUserIdFromToken(token);

        assertEquals(userId, extracted);
    }

    @Test
    void validateToken_returnsTrueForValidToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtTokenProvider.generateToken(userId, "test@test.com", "RECRUIT");

        assertTrue(jwtTokenProvider.validateToken(token));
    }

    @Test
    void validateToken_returnsFalseForInvalidToken() {
        assertFalse(jwtTokenProvider.validateToken("invalid.token.here"));
    }

    @Test
    void validateToken_returnsFalseForNull() {
        assertFalse(jwtTokenProvider.validateToken(null));
    }

    @Test
    void validateToken_returnsFalseForEmptyString() {
        assertFalse(jwtTokenProvider.validateToken(""));
    }

    @Test
    void validateToken_returnsFalseForExpiredToken() {
        AppProperties props = new AppProperties();
        props.getJwt().setSecret("test-secret-key-must-be-at-least-32-characters-long");
        props.getJwt().setExpirationMs(0);
        JwtTokenProvider expiredProvider = new JwtTokenProvider(props);

        String token = expiredProvider.generateToken(UUID.randomUUID(), "test@test.com", "RECRUIT");

        assertFalse(jwtTokenProvider.validateToken(token));
    }

    @Test
    void generateToken_differentUsersGetDifferentTokens() {
        UUID user1 = UUID.randomUUID();
        UUID user2 = UUID.randomUUID();

        String token1 = jwtTokenProvider.generateToken(user1, "a@test.com", "RECRUIT");
        String token2 = jwtTokenProvider.generateToken(user2, "b@test.com", "MANAGER");

        assertNotEquals(token1, token2);
    }
}
