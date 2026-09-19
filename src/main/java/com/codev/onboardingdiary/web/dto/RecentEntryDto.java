package com.codev.onboardingdiary.web.dto;

import com.codev.onboardingdiary.domain.EntryCategory;
import java.time.LocalDate;

public record RecentEntryDto(EntryCategory category,
                             Long id,
                             LocalDate date,
                             String title,
                             String detail,
                             String link) {
}
