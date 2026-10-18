package com.codev.onboardingdiary.entry.note;

import com.codev.onboardingdiary.common.ApiException;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

/** Normalises and validates note tags: trimmed, lower-case, unique, at most ten. */
final class NoteTags {

  static final int MAX_TAGS = 10;
  static final int MAX_LENGTH = 30;
  private static final Pattern ALLOWED = Pattern.compile("^[a-z0-9 _-]+$");

  private NoteTags() {}

  static List<String> normalize(List<String> rawTags) {
    if (rawTags == null) {
      return List.of();
    }
    List<String> tags =
        rawTags.stream()
            .filter(Objects::nonNull)
            .map(tag -> tag.trim().toLowerCase(Locale.ROOT))
            .filter(tag -> !tag.isEmpty())
            .distinct()
            .sorted()
            .toList();
    if (tags.size() > MAX_TAGS) {
      throw ApiException.fieldError("tags", "must contain at most " + MAX_TAGS + " tags");
    }
    for (String tag : tags) {
      if (tag.length() > MAX_LENGTH || !ALLOWED.matcher(tag).matches()) {
        throw ApiException.fieldError(
            "tags",
            "each tag must be 1-" + MAX_LENGTH + " characters of letters, digits, space, - or _");
      }
    }
    return tags;
  }
}
