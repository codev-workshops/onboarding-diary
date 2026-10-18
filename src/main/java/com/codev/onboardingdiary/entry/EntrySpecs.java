package com.codev.onboardingdiary.entry;

import com.codev.onboardingdiary.user.User;
import java.time.LocalDate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

/** Reusable query building blocks for entry list filters. */
public final class EntrySpecs {

  /** Newest entry date first; ties broken by creation order. */
  public static final Sort NEWEST_FIRST =
      Sort.by(Sort.Order.desc("entryDate"), Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

  private EntrySpecs() {}

  public static <T extends EntryBase> Specification<T> ownedBy(User owner) {
    return (root, query, cb) -> cb.equal(root.get("owner"), owner);
  }

  /** Inclusive date range; either bound may be null. */
  public static <T extends EntryBase> Specification<T> dateBetween(LocalDate from, LocalDate to) {
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

  /** Equality on an attribute, skipped when the value is null. */
  public static <T> Specification<T> attributeEquals(String attribute, Object value) {
    return (root, query, cb) -> value == null ? null : cb.equal(root.get(attribute), value);
  }
}
