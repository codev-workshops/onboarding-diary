package com.codev.onboardingdiary.search;

import com.codev.onboardingdiary.dashboard.RecentEntry.EntryType;
import java.util.List;

/** Search results grouped by diary log, newest entries first within each group. */
public record SearchResults(String query, SearchScope scope, List<Group> groups) {

  /** Matches in one log: the total count and the first page of hits. */
  public record Group(EntryType type, long total, List<SearchHit> hits) {}
}
