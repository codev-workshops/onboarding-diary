package com.onboarding.diary.dto;

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
    private String dateFrom;
    private String dateTo;
}
