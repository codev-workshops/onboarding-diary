package com.codev.onboardingdiary.note;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Tags are trimmed, lower-cased and de-duplicated before they are stored or queried. */
final class NoteTags {

  private NoteTags() {}

  static Set<String> normalize(Collection<String> tags) {
    Set<String> normalized = new LinkedHashSet<>();
    if (tags != null) {
      for (String tag : tags) {
        if (tag != null && !tag.isBlank()) {
          normalized.add(tag.trim().toLowerCase(Locale.ROOT));
        }
      }
    }
    return normalized;
  }

  static List<String> normalizeToList(Collection<String> tags) {
    return List.copyOf(normalize(tags));
  }
}
