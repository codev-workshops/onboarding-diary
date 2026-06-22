package com.onboardingdiary.service;

import com.onboardingdiary.model.SocialPlatform;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class SocialMediaClientImpl implements SocialMediaClient {

    private static final Logger log = LoggerFactory.getLogger(SocialMediaClientImpl.class);

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String post(SocialPlatform platform, String accessToken, String message) {
        return switch (platform) {
            case TWITTER -> postToTwitter(accessToken, message);
            case LINKEDIN -> postToLinkedIn(accessToken, message);
            case FACEBOOK -> postToFacebook(accessToken, message);
        };
    }

    private String postToTwitter(String accessToken, String message) {
        String url = "https://api.twitter.com/2/tweets";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> body = Map.of("text", message);
        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);
            Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
            String tweetId = (String) data.get("id");
            return "https://twitter.com/i/web/status/" + tweetId;
        } catch (Exception e) {
            log.error("Failed to post to Twitter", e);
            throw new RuntimeException("Failed to post to Twitter: " + e.getMessage());
        }
    }

    private String postToLinkedIn(String accessToken, String message) {
        String url = "https://api.linkedin.com/v2/ugcPosts";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Restli-Protocol-Version", "2.0.0");

        String personUrn = getLinkedInPersonUrn(accessToken);
        Map<String, Object> body = Map.of(
                "author", personUrn,
                "lifecycleState", "PUBLISHED",
                "specificContent", Map.of(
                        "com.linkedin.ugc.ShareContent", Map.of(
                                "shareCommentary", Map.of("text", message),
                                "shareMediaCategory", "NONE"
                        )
                ),
                "visibility", Map.of(
                        "com.linkedin.ugc.MemberNetworkVisibility", "PUBLIC"
                )
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);
            String postId = (String) response.getBody().get("id");
            return "https://www.linkedin.com/feed/update/" + postId;
        } catch (Exception e) {
            log.error("Failed to post to LinkedIn", e);
            throw new RuntimeException("Failed to post to LinkedIn: " + e.getMessage());
        }
    }

    private String getLinkedInPersonUrn(String accessToken) {
        String url = "https://api.linkedin.com/v2/me";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
        String id = (String) response.getBody().get("id");
        return "urn:li:person:" + id;
    }

    private String postToFacebook(String accessToken, String message) {
        String url = "https://graph.facebook.com/v18.0/me/feed";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String body = "message=" + message + "&access_token=" + accessToken;
        HttpEntity<String> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);
            String postId = (String) response.getBody().get("id");
            return "https://www.facebook.com/" + postId;
        } catch (Exception e) {
            log.error("Failed to post to Facebook", e);
            throw new RuntimeException("Failed to post to Facebook: " + e.getMessage());
        }
    }
}
