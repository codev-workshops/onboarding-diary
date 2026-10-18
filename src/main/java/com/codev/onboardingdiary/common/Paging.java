package com.codev.onboardingdiary.common;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/** Validates and builds page requests from query parameters. */
public final class Paging {

  public static final int DEFAULT_SIZE = 20;
  public static final int MAX_SIZE = 100;

  private Paging() {}

  public static PageRequest of(Integer page, Integer size, Sort sort) {
    int pageNumber = page == null ? 0 : page;
    int pageSize = size == null ? DEFAULT_SIZE : size;
    if (pageNumber < 0) {
      throw ApiException.fieldError("page", "must be 0 or greater");
    }
    if (pageSize < 1 || pageSize > MAX_SIZE) {
      throw ApiException.fieldError("size", "must be between 1 and " + MAX_SIZE);
    }
    return PageRequest.of(pageNumber, pageSize, sort);
  }
}
