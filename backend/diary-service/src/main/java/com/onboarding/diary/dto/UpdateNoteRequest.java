package com.onboarding.diary.dto;

import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateNoteRequest {

    private String date;

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private String content;

    private List<String> tags;
}
