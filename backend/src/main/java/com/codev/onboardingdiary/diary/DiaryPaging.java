package com.codev.onboardingdiary.diary;

import com.codev.onboardingdiary.common.ApiException;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Restricts client-supplied sorting to known columns and adds a stable tie-breaker. */
public final class DiaryPaging {

  private static final Set<String> COMMON_SORTS = Set.of("entryDate", "createdAt", "updatedAt");

  private DiaryPaging() {}

  public static Pageable normalize(Pageable pageable, Set<String> extraSorts) {
    for (Sort.Order order : pageable.getSort()) {
      String property = order.getProperty();
      if (!COMMON_SORTS.contains(property) && !extraSorts.contains(property)) {
        throw ApiException.invalidField("sort", "Cannot sort by '" + property + "'");
      }
    }
    Sort sort = pageable.getSort().and(Sort.by(Sort.Direction.DESC, "id"));
    return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
  }
}
