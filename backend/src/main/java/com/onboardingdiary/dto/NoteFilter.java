package com.onboardingdiary.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Optional filters applied to a note listing. Any null/empty field is ignored.
 * A note matches {@code tags} only if it contains every requested tag.
 */
public record NoteFilter(
        Long ownerId,
        List<String> tags,
        LocalDate dateFrom,
        LocalDate dateTo,
        String search
) {
}
