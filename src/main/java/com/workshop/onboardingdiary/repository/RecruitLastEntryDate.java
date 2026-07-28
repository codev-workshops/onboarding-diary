package com.workshop.onboardingdiary.repository;

import java.time.LocalDate;

/**
 * The most recent entry date one recruit has for a single entry type, used to work out whether a
 * recruit has gone quiet (REQUIREMENTS 10.2 "recently inactive").
 */
public interface RecruitLastEntryDate {

    Long getRecruitId();

    LocalDate getLastEntryDate();
}
