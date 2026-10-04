package com.codev.onboardingdiary.audit;

import com.codev.onboardingdiary.audit.AuditLogResponse.UserRef;
import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.diary.PageResponse;
import com.codev.onboardingdiary.user.Profile;
import com.codev.onboardingdiary.user.ProfileRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Writes and searches the audit log. */
@Service
public class AuditLogService {

  private final AuditLogRepository repository;
  private final ProfileRepository profileRepository;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public AuditLogService(
      AuditLogRepository repository,
      ProfileRepository profileRepository,
      ObjectMapper objectMapper,
      Clock clock) {
    this.repository = repository;
    this.profileRepository = profileRepository;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  /** Records an action; {@code details} is stored as JSON. Never include secrets in it. */
  @Transactional
  public void record(Long actorId, AuditAction action, Long targetUserId, Map<String, ?> details) {
    repository.save(
        new AuditLogEntry(actorId, action, targetUserId, toJson(details), clock.instant()));
  }

  /** Searches newest first; {@code from}/{@code to} are inclusive UTC dates. */
  @Transactional(readOnly = true)
  public PageResponse<AuditLogResponse> search(
      Long userId, AuditAction action, LocalDate from, LocalDate to, Pageable pageable) {
    if (from != null && to != null && from.isAfter(to)) {
      throw ApiException.invalidField("from", "'from' must not be after 'to'");
    }
    Specification<AuditLogEntry> spec =
        Specification.<AuditLogEntry>where(null)
            .and(
                userId == null
                    ? null
                    : (root, query, cb) ->
                        cb.or(
                            cb.equal(root.get("actorId"), userId),
                            cb.equal(root.get("targetUserId"), userId)))
            .and(action == null ? null : (root, query, cb) -> cb.equal(root.get("action"), action))
            .and(
                from == null
                    ? null
                    : (root, query, cb) ->
                        cb.greaterThanOrEqualTo(
                            root.get("createdAt"), from.atStartOfDay(ZoneOffset.UTC).toInstant()))
            .and(
                to == null
                    ? null
                    : (root, query, cb) ->
                        cb.lessThan(
                            root.get("createdAt"),
                            to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant()));
    Pageable newestFirst =
        PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            Sort.by(Sort.Direction.DESC, "createdAt", "id"));
    Page<AuditLogEntry> page = repository.findAll(spec, newestFirst);
    Set<Long> userIds =
        page.stream()
            .flatMap(entry -> Stream.of(entry.getActorId(), entry.getTargetUserId()))
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
    Map<Long, UserRef> users =
        profileRepository.findAllById(userIds).stream()
            .map(AuditLogService::toRef)
            .collect(Collectors.toMap(UserRef::id, Function.identity()));
    return PageResponse.from(
        page.map(
            entry ->
                new AuditLogResponse(
                    entry.getId(),
                    entry.getCreatedAt(),
                    entry.getAction(),
                    ref(users, entry.getActorId()),
                    ref(users, entry.getTargetUserId()),
                    entry.getDetails())));
  }

  private static UserRef ref(Map<Long, UserRef> users, Long id) {
    return id == null ? null : users.getOrDefault(id, new UserRef(id, null, null));
  }

  private static UserRef toRef(Profile profile) {
    return new UserRef(profile.getUserId(), profile.getFullName(), profile.getUser().getEmail());
  }

  private String toJson(Map<String, ?> details) {
    if (details == null || details.isEmpty()) {
      return null;
    }
    try {
      String json = objectMapper.writeValueAsString(details);
      return json.length() > AuditLogEntry.MAX_DETAILS_LENGTH
          ? json.substring(0, AuditLogEntry.MAX_DETAILS_LENGTH)
          : json;
    } catch (JsonProcessingException ex) {
      throw new IllegalStateException("Could not serialise audit details", ex);
    }
  }
}
