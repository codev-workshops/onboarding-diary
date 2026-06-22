package com.onboardingdiary.controller;

import com.onboardingdiary.auth.SocialAuthService;
import com.onboardingdiary.dto.SocialConnectionResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/auth/social")
public class SocialAuthController {

    private final SocialAuthService socialAuthService;

    public SocialAuthController(SocialAuthService socialAuthService) {
        this.socialAuthService = socialAuthService;
    }

    @GetMapping("/connections")
    public ResponseEntity<List<SocialConnectionResponse>> getConnections(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(socialAuthService.getConnections(user.getUsername()));
    }

    @DeleteMapping("/connections/{platform}")
    public ResponseEntity<Void> disconnect(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable String platform) {
        socialAuthService.disconnect(user.getUsername(), platform);
        return ResponseEntity.noContent().build();
    }

    // --- Twitter ---

    @GetMapping("/twitter/connect")
    public ResponseEntity<Void> twitterConnect(@AuthenticationPrincipal UserDetails user) {
        String url = socialAuthService.getTwitterConnectUrl(user.getUsername());
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, url).build();
    }

    @GetMapping("/twitter/callback")
    public ResponseEntity<Void> twitterCallback(@RequestParam String code, @RequestParam String state) {
        String redirectUrl = socialAuthService.handleTwitterCallback(code, state);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(redirectUrl)).build();
    }

    // --- LinkedIn ---

    @GetMapping("/linkedin/connect")
    public ResponseEntity<Void> linkedinConnect(@AuthenticationPrincipal UserDetails user) {
        String url = socialAuthService.getLinkedInConnectUrl(user.getUsername());
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, url).build();
    }

    @GetMapping("/linkedin/callback")
    public ResponseEntity<Void> linkedinCallback(@RequestParam String code, @RequestParam String state) {
        String redirectUrl = socialAuthService.handleLinkedInCallback(code, state);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(redirectUrl)).build();
    }

    // --- Facebook ---

    @GetMapping("/facebook/connect")
    public ResponseEntity<Void> facebookConnect(@AuthenticationPrincipal UserDetails user) {
        String url = socialAuthService.getFacebookConnectUrl(user.getUsername());
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, url).build();
    }

    @GetMapping("/facebook/callback")
    public ResponseEntity<Void> facebookCallback(@RequestParam String code, @RequestParam String state) {
        String redirectUrl = socialAuthService.handleFacebookCallback(code, state);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(redirectUrl)).build();
    }
}
