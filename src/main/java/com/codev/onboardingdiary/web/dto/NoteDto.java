package com.codev.onboardingdiary.web.dto;

import java.time.LocalDate;

public record NoteDto(Long id,
                      LocalDate date,
                      String title,
                      String content,
                      String tags) {
}
