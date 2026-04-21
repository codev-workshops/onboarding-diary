package com.onboarding.diary.dto;

import com.onboarding.diary.entity.FeedbackSource;
import com.onboarding.diary.entity.FeedbackType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackFilterParams {
    private FeedbackType type;
    private FeedbackSource source;
    private String dateFrom;
    private String dateTo;
}
