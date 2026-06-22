package com.onboardingdiary.controller;

import com.onboardingdiary.dto.ShareRequest;
import com.onboardingdiary.dto.ShareResponse;
import com.onboardingdiary.service.ShareService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/entries/{entryId}/share")
public class ShareController {

    private final ShareService shareService;

    public ShareController(ShareService shareService) {
        this.shareService = shareService;
    }

    @PostMapping
    public ResponseEntity<ShareResponse> share(
            @PathVariable Long entryId,
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody ShareRequest request) {
        return ResponseEntity.ok(shareService.shareEntry(entryId, user.getUsername(), request));
    }
}
