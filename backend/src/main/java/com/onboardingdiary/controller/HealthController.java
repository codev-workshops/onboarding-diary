package com.onboardingdiary.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "System")
public class HealthController {

    @GetMapping("/health")
    @SecurityRequirements
    @Operation(summary = "Liveness probe")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    @GetMapping("/ready")
    @SecurityRequirements
    @Operation(summary = "Readiness probe")
    public Map<String, String> ready() {
        return Map.of("status", "READY");
    }
}
