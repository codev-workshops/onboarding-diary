package com.codev.onboardingdiary.search;

/** Whose diary entries a search covers. */
public enum SearchScope {
  /** The caller's own entries. */
  SELF,
  /** Entries of the recruits the caller manages (all recruits for admins), shared notes only. */
  TEAM
}
