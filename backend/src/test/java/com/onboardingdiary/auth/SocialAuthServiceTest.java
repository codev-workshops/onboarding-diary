package com.onboardingdiary.auth;

import com.onboardingdiary.dto.SocialConnectionResponse;
import com.onboardingdiary.model.SocialConnection;
import com.onboardingdiary.model.SocialPlatform;
import com.onboardingdiary.model.User;
import com.onboardingdiary.repository.SocialConnectionRepository;
import com.onboardingdiary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SocialAuthServiceTest {

    @Mock
    private SocialConnectionRepository connectionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private SocialAuthService socialAuthService;

    private User testUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(socialAuthService, "twitterClientId", "test-twitter-id");
        ReflectionTestUtils.setField(socialAuthService, "twitterClientSecret", "test-twitter-secret");
        ReflectionTestUtils.setField(socialAuthService, "linkedinClientId", "test-linkedin-id");
        ReflectionTestUtils.setField(socialAuthService, "linkedinClientSecret", "test-linkedin-secret");
        ReflectionTestUtils.setField(socialAuthService, "facebookAppId", "test-facebook-id");
        ReflectionTestUtils.setField(socialAuthService, "facebookAppSecret", "test-facebook-secret");
        ReflectionTestUtils.setField(socialAuthService, "baseUrl", "http://localhost:8080");
        ReflectionTestUtils.setField(socialAuthService, "frontendUrl", "http://localhost:5173");

        testUser = new User("testuser", "test@example.com", "password");
        testUser.setId(1L);
    }

    @Test
    void getConnections_returnsAllConnections() {
        SocialConnection twitter = new SocialConnection();
        twitter.setId(1L);
        twitter.setUser(testUser);
        twitter.setPlatform(SocialPlatform.TWITTER);
        twitter.setAccessToken("token");
        twitter.setPlatformUserId("tw-123");

        SocialConnection linkedin = new SocialConnection();
        linkedin.setId(2L);
        linkedin.setUser(testUser);
        linkedin.setPlatform(SocialPlatform.LINKEDIN);
        linkedin.setAccessToken("token");
        linkedin.setPlatformUserId("li-456");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(connectionRepository.findByUserId(1L)).thenReturn(List.of(twitter, linkedin));

        List<SocialConnectionResponse> result = socialAuthService.getConnections("testuser");

        assertEquals(2, result.size());
        assertEquals("twitter", result.get(0).platform());
        assertEquals("linkedin", result.get(1).platform());
    }

    @Test
    void disconnect_removesConnection() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        socialAuthService.disconnect("testuser", "twitter");

        verify(connectionRepository).deleteByUserIdAndPlatform(1L, SocialPlatform.TWITTER);
    }

    @Test
    void twitterConnectUrl_containsRequiredParams() {
        String url = socialAuthService.getTwitterConnectUrl("testuser");

        assertTrue(url.contains("twitter.com/i/oauth2/authorize"));
        assertTrue(url.contains("client_id=test-twitter-id"));
        assertTrue(url.contains("response_type=code"));
        assertTrue(url.contains("code_challenge_method=S256"));
        assertTrue(url.contains("state=testuser"));
    }

    @Test
    void linkedinConnectUrl_containsRequiredParams() {
        String url = socialAuthService.getLinkedInConnectUrl("testuser");

        assertTrue(url.contains("linkedin.com/oauth/v2/authorization"));
        assertTrue(url.contains("client_id=test-linkedin-id"));
        assertTrue(url.contains("response_type=code"));
        assertTrue(url.contains("state=testuser"));
    }

    @Test
    void facebookConnectUrl_containsRequiredParams() {
        String url = socialAuthService.getFacebookConnectUrl("testuser");

        assertTrue(url.contains("facebook.com/v18.0/dialog/oauth"));
        assertTrue(url.contains("client_id=test-facebook-id"));
        assertTrue(url.contains("state=testuser"));
        assertTrue(url.contains("publish_to_groups"));
        assertTrue(url.contains("pages_manage_posts"));
    }

    @Test
    void getConnections_userNotFound_throwsException() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> socialAuthService.getConnections("unknown"));
    }

    @Test
    void disconnect_invalidPlatform_throwsException() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        assertThrows(IllegalArgumentException.class,
                () -> socialAuthService.disconnect("testuser", "invalid"));
    }
}
