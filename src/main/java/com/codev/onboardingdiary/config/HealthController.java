package com.codev.onboardingdiary.config;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Lightweight liveness endpoint. */
@RestController
public class HealthController {

  @GetMapping("/api/health")
  Map<String, String> health() {
    return Map.of("status", "UP");
  }
}
