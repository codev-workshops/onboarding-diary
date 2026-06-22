package com.onboardingdiary.service;

import com.onboardingdiary.dto.ShareRequest;
import com.onboardingdiary.dto.ShareResponse;
import com.onboardingdiary.model.*;
import com.onboardingdiary.repository.DiaryEntryRepository;
import com.onboardingdiary.repository.ShareHistoryRepository;
import com.onboardingdiary.repository.SocialConnectionRepository;
import com.onboardingdiary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShareServiceTest {

    @Mock
    private DiaryEntryRepository entryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SocialConnectionRepository socialConnectionRepository;

    @Mock
    private ShareHistoryRepository shareHistoryRepository;

    @Mock
    private SocialMediaClient socialMediaClient;

    @InjectMocks
    private ShareService shareService;

    private User testUser;
    private DiaryEntry testEntry;
    private SocialConnection twitterConnection;
    private SocialConnection linkedinConnection;
    private SocialConnection facebookConnection;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(shareService, "frontendUrl", "http://localhost:5173");

        testUser = new User("testuser", "test@example.com", "password");
        testUser.setId(1L);

        testEntry = new DiaryEntry(testUser, "My First Day", "Today was a great day at the office.");
        testEntry.setId(1L);
        testEntry.setPublic(true);

        twitterConnection = new SocialConnection();
        twitterConnection.setUser(testUser);
        twitterConnection.setPlatform(SocialPlatform.TWITTER);
        twitterConnection.setAccessToken("twitter-token");

        linkedinConnection = new SocialConnection();
        linkedinConnection.setUser(testUser);
        linkedinConnection.setPlatform(SocialPlatform.LINKEDIN);
        linkedinConnection.setAccessToken("linkedin-token");

        facebookConnection = new SocialConnection();
        facebookConnection.setUser(testUser);
        facebookConnection.setPlatform(SocialPlatform.FACEBOOK);
        facebookConnection.setAccessToken("facebook-token");
    }

    @Test
    void shareToTwitter_withCustomMessage_succeeds() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(entryRepository.findById(1L)).thenReturn(Optional.of(testEntry));
        when(socialConnectionRepository.findByUserIdAndPlatform(1L, SocialPlatform.TWITTER))
                .thenReturn(Optional.of(twitterConnection));
        when(socialMediaClient.post(eq(SocialPlatform.TWITTER), eq("twitter-token"), any()))
                .thenReturn("https://twitter.com/i/web/status/123");
        when(shareHistoryRepository.save(any())).thenAnswer(i -> {
            ShareHistory h = i.getArgument(0);
            h.setId(1L);
            return h;
        });

        ShareRequest request = new ShareRequest("twitter", "Check out my first day!");
        ShareResponse response = shareService.shareEntry(1L, "testuser", request);

        assertNotNull(response);
        assertEquals("twitter", response.platform());
        assertEquals("https://twitter.com/i/web/status/123", response.postUrl());
        assertEquals("Check out my first day!", response.message());
        verify(socialMediaClient).post(SocialPlatform.TWITTER, "twitter-token", "Check out my first day!");
    }

    @Test
    void shareToLinkedIn_withDefaultMessage_succeeds() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(entryRepository.findById(1L)).thenReturn(Optional.of(testEntry));
        when(socialConnectionRepository.findByUserIdAndPlatform(1L, SocialPlatform.LINKEDIN))
                .thenReturn(Optional.of(linkedinConnection));
        when(socialMediaClient.post(eq(SocialPlatform.LINKEDIN), eq("linkedin-token"), any()))
                .thenReturn("https://www.linkedin.com/feed/update/123");
        when(shareHistoryRepository.save(any())).thenAnswer(i -> {
            ShareHistory h = i.getArgument(0);
            h.setId(1L);
            return h;
        });

        ShareRequest request = new ShareRequest("linkedin", null);
        ShareResponse response = shareService.shareEntry(1L, "testuser", request);

        assertNotNull(response);
        assertEquals("linkedin", response.platform());
        assertEquals("https://www.linkedin.com/feed/update/123", response.postUrl());

        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
        verify(socialMediaClient).post(eq(SocialPlatform.LINKEDIN), eq("linkedin-token"), messageCaptor.capture());
        String defaultMessage = messageCaptor.getValue();
        assertTrue(defaultMessage.contains("My First Day"));
        assertTrue(defaultMessage.contains("Today was a great day"));
    }

    @Test
    void shareToFacebook_succeeds() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(entryRepository.findById(1L)).thenReturn(Optional.of(testEntry));
        when(socialConnectionRepository.findByUserIdAndPlatform(1L, SocialPlatform.FACEBOOK))
                .thenReturn(Optional.of(facebookConnection));
        when(socialMediaClient.post(eq(SocialPlatform.FACEBOOK), eq("facebook-token"), any()))
                .thenReturn("https://www.facebook.com/123");
        when(shareHistoryRepository.save(any())).thenAnswer(i -> {
            ShareHistory h = i.getArgument(0);
            h.setId(1L);
            return h;
        });

        ShareRequest request = new ShareRequest("facebook", "Sharing my onboarding journey!");
        ShareResponse response = shareService.shareEntry(1L, "testuser", request);

        assertNotNull(response);
        assertEquals("facebook", response.platform());
        assertEquals("https://www.facebook.com/123", response.postUrl());
        verify(socialMediaClient).post(SocialPlatform.FACEBOOK, "facebook-token", "Sharing my onboarding journey!");
    }

    @Test
    void share_entryNotOwned_throwsSecurityException() {
        User otherUser = new User("otheruser", "other@example.com", "password");
        otherUser.setId(2L);

        when(userRepository.findByUsername("otheruser")).thenReturn(Optional.of(otherUser));
        when(entryRepository.findById(1L)).thenReturn(Optional.of(testEntry));

        ShareRequest request = new ShareRequest("twitter", "test");
        assertThrows(SecurityException.class,
                () -> shareService.shareEntry(1L, "otheruser", request));
    }

    @Test
    void share_noSocialConnection_throwsIllegalState() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(entryRepository.findById(1L)).thenReturn(Optional.of(testEntry));
        when(socialConnectionRepository.findByUserIdAndPlatform(1L, SocialPlatform.TWITTER))
                .thenReturn(Optional.empty());

        ShareRequest request = new ShareRequest("twitter", "test");
        assertThrows(IllegalStateException.class,
                () -> shareService.shareEntry(1L, "testuser", request));
    }

    @Test
    void share_entryNotFound_throwsIllegalArgument() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(entryRepository.findById(999L)).thenReturn(Optional.empty());

        ShareRequest request = new ShareRequest("twitter", "test");
        assertThrows(IllegalArgumentException.class,
                () -> shareService.shareEntry(999L, "testuser", request));
    }

    @Test
    void defaultMessage_includesEntryLinkForPublicEntry() {
        testEntry.setPublic(true);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(entryRepository.findById(1L)).thenReturn(Optional.of(testEntry));
        when(socialConnectionRepository.findByUserIdAndPlatform(1L, SocialPlatform.TWITTER))
                .thenReturn(Optional.of(twitterConnection));
        when(socialMediaClient.post(eq(SocialPlatform.TWITTER), eq("twitter-token"), any()))
                .thenReturn("https://twitter.com/i/web/status/123");
        when(shareHistoryRepository.save(any())).thenAnswer(i -> {
            ShareHistory h = i.getArgument(0);
            h.setId(1L);
            return h;
        });

        ShareRequest request = new ShareRequest("twitter", "");
        shareService.shareEntry(1L, "testuser", request);

        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
        verify(socialMediaClient).post(eq(SocialPlatform.TWITTER), eq("twitter-token"), messageCaptor.capture());
        assertTrue(messageCaptor.getValue().contains("http://localhost:5173/entries/1"));
    }

    @Test
    void defaultMessage_excludesLinkForPrivateEntry() {
        testEntry.setPublic(false);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(entryRepository.findById(1L)).thenReturn(Optional.of(testEntry));
        when(socialConnectionRepository.findByUserIdAndPlatform(1L, SocialPlatform.TWITTER))
                .thenReturn(Optional.of(twitterConnection));
        when(socialMediaClient.post(eq(SocialPlatform.TWITTER), eq("twitter-token"), any()))
                .thenReturn("https://twitter.com/i/web/status/123");
        when(shareHistoryRepository.save(any())).thenAnswer(i -> {
            ShareHistory h = i.getArgument(0);
            h.setId(1L);
            return h;
        });

        ShareRequest request = new ShareRequest("twitter", null);
        shareService.shareEntry(1L, "testuser", request);

        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
        verify(socialMediaClient).post(eq(SocialPlatform.TWITTER), eq("twitter-token"), messageCaptor.capture());
        assertFalse(messageCaptor.getValue().contains("http://localhost:5173/entries/"));
    }
}
