package com.onboarding.diary.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoteFilterParams {
    private String tag;
    private String folder;
    private String dateFrom;
    private String dateTo;
}
