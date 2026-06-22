package com.onboardingdiary.auth;

import com.onboardingdiary.dto.SocialConnectionResponse;
import com.onboardingdiary.model.SocialConnection;
import com.onboardingdiary.model.SocialPlatform;
import com.onboardingdiary.model.User;
import com.onboardingdiary.repository.SocialConnectionRepository;
import com.onboardingdiary.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SocialAuthService {

    private final SocialConnectionRepository connectionRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    private final ConcurrentHashMap<String, String> pkceVerifiers = new ConcurrentHashMap<>();

    @Value("${app.twitter.client-id}")
    private String twitterClientId;

    @Value("${app.twitter.client-secret}")
    private String twitterClientSecret;

    @Value("${app.linkedin.client-id}")
    private String linkedinClientId;

    @Value("${app.linkedin.client-secret}")
    private String linkedinClientSecret;

    @Value("${app.facebook.app-id}")
    private String facebookAppId;

    @Value("${app.facebook.app-secret}")
    private String facebookAppSecret;

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public SocialAuthService(SocialConnectionRepository connectionRepository, UserRepository userRepository) {
        this.connectionRepository = connectionRepository;
        this.userRepository = userRepository;
    }

    public List<SocialConnectionResponse> getConnections(String username) {
        User user = findUser(username);
        return connectionRepository.findByUserId(user.getId())
                .stream().map(SocialConnectionResponse::from).toList();
    }

    @Transactional
    public void disconnect(String username, String platformValue) {
        User user = findUser(username);
        SocialPlatform platform = SocialPlatform.fromValue(platformValue);
        connectionRepository.deleteByUserIdAndPlatform(user.getId(), platform);
    }

    // --- Twitter OAuth 2.0 PKCE ---

    public String getTwitterConnectUrl(String username) {
        String codeVerifier = generateCodeVerifier();
        String codeChallenge = generateCodeChallenge(codeVerifier);
        String state = username;
        pkceVerifiers.put(state, codeVerifier);

        String redirectUri = baseUrl + "/api/v1/auth/social/twitter/callback";
        return "https://twitter.com/i/oauth2/authorize"
                + "?response_type=code"
                + "&client_id=" + encode(twitterClientId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&scope=" + encode("tweet.read tweet.write users.read offline.access")
                + "&state=" + encode(state)
                + "&code_challenge=" + encode(codeChallenge)
                + "&code_challenge_method=S256";
    }

    public String handleTwitterCallback(String code, String state) {
        String codeVerifier = pkceVerifiers.remove(state);
        if (codeVerifier == null) {
            throw new IllegalStateException("Invalid OAuth state");
        }
        String username = state;
        String redirectUri = baseUrl + "/api/v1/auth/social/twitter/callback";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBasicAuth(twitterClientId, twitterClientSecret);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", code);
        params.add("grant_type", "authorization_code");
        params.add("redirect_uri", redirectUri);
        params.add("code_verifier", codeVerifier);

        ResponseEntity<Map> response = restTemplate.exchange(
                "https://api.twitter.com/2/oauth2/token",
                HttpMethod.POST,
                new HttpEntity<>(params, headers),
                Map.class
        );

        Map<String, Object> tokenData = response.getBody();
        String accessToken = (String) tokenData.get("access_token");
        String refreshToken = (String) tokenData.get("refresh_token");

        String platformUserId = fetchTwitterUserId(accessToken);
        saveConnection(username, SocialPlatform.TWITTER, accessToken, refreshToken, platformUserId);

        return frontendUrl + "/settings/social?connected=twitter";
    }

    private String fetchTwitterUserId(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        ResponseEntity<Map> response = restTemplate.exchange(
                "https://api.twitter.com/2/users/me",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
        );
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        return (String) data.get("id");
    }

    // --- LinkedIn OAuth 2.0 ---

    public String getLinkedInConnectUrl(String username) {
        String redirectUri = baseUrl + "/api/v1/auth/social/linkedin/callback";
        return "https://www.linkedin.com/oauth/v2/authorization"
                + "?response_type=code"
                + "&client_id=" + encode(linkedinClientId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&state=" + encode(username)
                + "&scope=" + encode("openid profile w_member_social");
    }

    public String handleLinkedInCallback(String code, String state) {
        String username = state;
        String redirectUri = baseUrl + "/api/v1/auth/social/linkedin/callback";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("code", code);
        params.add("redirect_uri", redirectUri);
        params.add("client_id", linkedinClientId);
        params.add("client_secret", linkedinClientSecret);

        ResponseEntity<Map> response = restTemplate.exchange(
                "https://www.linkedin.com/oauth/v2/accessToken",
                HttpMethod.POST,
                new HttpEntity<>(params, headers),
                Map.class
        );

        Map<String, Object> tokenData = response.getBody();
        String accessToken = (String) tokenData.get("access_token");

        String platformUserId = fetchLinkedInUserId(accessToken);
        saveConnection(username, SocialPlatform.LINKEDIN, accessToken, null, platformUserId);

        return frontendUrl + "/settings/social?connected=linkedin";
    }

    private String fetchLinkedInUserId(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        ResponseEntity<Map> response = restTemplate.exchange(
                "https://api.linkedin.com/v2/me",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
        );
        return (String) response.getBody().get("id");
    }

    // --- Facebook OAuth 2.0 ---

    public String getFacebookConnectUrl(String username) {
        String redirectUri = baseUrl + "/api/v1/auth/social/facebook/callback";
        return "https://www.facebook.com/v18.0/dialog/oauth"
                + "?client_id=" + encode(facebookAppId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&state=" + encode(username)
                + "&scope=" + encode("public_profile,publish_to_groups,pages_manage_posts");
    }

    public String handleFacebookCallback(String code, String state) {
        String username = state;
        String redirectUri = baseUrl + "/api/v1/auth/social/facebook/callback";

        String tokenUrl = "https://graph.facebook.com/v18.0/oauth/access_token"
                + "?client_id=" + encode(facebookAppId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&client_secret=" + encode(facebookAppSecret)
                + "&code=" + encode(code);

        ResponseEntity<Map> response = restTemplate.getForEntity(tokenUrl, Map.class);
        Map<String, Object> tokenData = response.getBody();
        String accessToken = (String) tokenData.get("access_token");

        String platformUserId = fetchFacebookUserId(accessToken);
        saveConnection(username, SocialPlatform.FACEBOOK, accessToken, null, platformUserId);

        return frontendUrl + "/settings/social?connected=facebook";
    }

    private String fetchFacebookUserId(String accessToken) {
        String url = "https://graph.facebook.com/v18.0/me?access_token=" + encode(accessToken);
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        return (String) response.getBody().get("id");
    }

    // --- Helpers ---

    private void saveConnection(String username, SocialPlatform platform,
                                String accessToken, String refreshToken, String platformUserId) {
        User user = findUser(username);
        SocialConnection connection = connectionRepository
                .findByUserIdAndPlatform(user.getId(), platform)
                .orElse(new SocialConnection());
        connection.setUser(user);
        connection.setPlatform(platform);
        connection.setAccessToken(accessToken);
        connection.setRefreshToken(refreshToken);
        connection.setPlatformUserId(platformUserId);
        connectionRepository.save(connection);
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private String generateCodeVerifier() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String generateCodeChallenge(String codeVerifier) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(codeVerifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate code challenge", e);
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
