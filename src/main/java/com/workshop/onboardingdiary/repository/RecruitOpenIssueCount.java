package com.workshop.onboardingdiary.repository;

/**
 * The number of open CRITICAL/HIGH issues one recruit owns, used by the manager dashboard's
 * high-priority attention list (REQUIREMENTS 10.2).
 */
public interface RecruitOpenIssueCount {

    Long getRecruitId();

    long getOpenCount();
}
