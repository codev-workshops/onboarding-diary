package com.codev.onboardingdiary.diary;

import com.codev.onboardingdiary.common.ApiException;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collection;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/** Reusable query predicates for diary entry lists. Null or empty arguments match everything. */
public final class DiarySpecifications {

  private DiarySpecifications() {}

  public static <T extends DiaryEntry> Specification<T> ownedBy(Long ownerId) {
    return (root, query, cb) -> cb.equal(root.get("ownerId"), ownerId);
  }

  public static <T extends DiaryEntry> Specification<T> entryDateBetween(
      LocalDate from, LocalDate to) {
    if (from != null && to != null && from.isAfter(to)) {
      throw ApiException.invalidField("from", "'from' must not be after 'to'");
    }
    return (root, query, cb) -> {
      if (from != null && to != null) {
        return cb.between(root.get("entryDate"), from, to);
      }
      if (from != null) {
        return cb.greaterThanOrEqualTo(root.get("entryDate"), from);
      }
      if (to != null) {
        return cb.lessThanOrEqualTo(root.get("entryDate"), to);
      }
      return null;
    };
  }

  public static <T> Specification<T> valueIn(String attribute, Collection<?> values) {
    return (root, query, cb) ->
        values == null || values.isEmpty() ? null : root.get(attribute).in(values);
  }

  public static <T> Specification<T> containsText(String text, String... attributes) {
    return (root, query, cb) -> {
      if (text == null || text.isBlank()) {
        return null;
      }
      String pattern = likePattern(text);
      return cb.or(
          Arrays.stream(attributes)
              .map(attribute -> cb.like(cb.lower(root.get(attribute)), pattern, '\\'))
              .toArray(Predicate[]::new));
    };
  }

  /** Case-insensitive "contains" pattern for {@code like} with {@code \\} as escape character. */
  public static String likePattern(String text) {
    return "%" + escapeLike(text.trim().toLowerCase(Locale.ROOT)) + "%";
  }

  private static String escapeLike(String value) {
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
