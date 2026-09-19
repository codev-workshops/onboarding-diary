package com.codev.onboardingdiary.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Serializes chart datasets so pages can pass them to JavaScript through a data attribute,
 * which keeps the strict content security policy free of inline scripts.
 */
@Component
public class ChartJson {

    private final ObjectMapper objectMapper;

    public ChartJson(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String write(Map<String, ?> datasets) {
        try {
            return objectMapper.writeValueAsString(datasets);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to serialize chart data", ex);
        }
    }
}
