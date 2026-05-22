package com.onboardingdiary.controller;

import com.onboardingdiary.dto.response.SearchResponse;
import com.onboardingdiary.security.UserPrincipal;
import com.onboardingdiary.service.SearchService;
import com.onboardingdiary.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<SearchResponse> search(@AuthenticationPrincipal UserPrincipal principal,
                                                   @RequestParam String q) {
        return ResponseEntity.ok(searchService.search(principal.getId(), q));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<SearchResponse> searchForUser(@AuthenticationPrincipal UserPrincipal principal,
                                                          @PathVariable UUID userId,
                                                          @RequestParam String q) {
        userService.verifyManagerAccess(principal.getId(), principal.getRole(), userId);
        return ResponseEntity.ok(searchService.search(userId, q));
    }
}
