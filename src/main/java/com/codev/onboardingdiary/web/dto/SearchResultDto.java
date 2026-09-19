package com.codev.onboardingdiary.web.dto;

import com.codev.onboardingdiary.domain.EntryCategory;
import java.time.LocalDate;

public record SearchResultDto(EntryCategory category,
                              Long id,
                              LocalDate date,
                              String title,
                              String snippet,
                              String link) {
}
