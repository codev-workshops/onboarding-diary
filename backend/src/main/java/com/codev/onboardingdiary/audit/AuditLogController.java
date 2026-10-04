package com.codev.onboardingdiary.audit;

import com.codev.onboardingdiary.diary.PageResponse;
import java.time.LocalDate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only audit log browser (secured under /api/admin/**). */
@RestController
public class AuditLogController {

  private final AuditLogService service;

  public AuditLogController(AuditLogService service) {
    this.service = service;
  }

  @GetMapping("/api/admin/audit-log")
  public PageResponse<AuditLogResponse> search(
      @RequestParam(required = false) Long userId,
      @RequestParam(required = false) AuditAction action,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @PageableDefault(size = 20) Pageable pageable) {
    return service.search(userId, action, from, to, pageable);
  }
}
