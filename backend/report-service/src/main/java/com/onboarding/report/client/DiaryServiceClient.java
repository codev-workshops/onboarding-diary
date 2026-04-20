package com.onboarding.report.client;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Component
public class DiaryServiceClient {

    private final RestTemplate restTemplate;
    private final String diaryServiceUrl;

    public DiaryServiceClient(
            RestTemplate restTemplate,
            @Value("${diary-service.url}") String diaryServiceUrl) {
        this.restTemplate = restTemplate;
        this.diaryServiceUrl = diaryServiceUrl;
    }

    public List<Map<String, Object>> getTasks(String userId, String dateFrom, String dateTo) {
        return fetchData("/api/tasks/internal/user/" + userId, dateFrom, dateTo);
    }

    public List<Map<String, Object>> getIssues(String userId, String dateFrom, String dateTo) {
        return fetchData("/api/issues/internal/user/" + userId, dateFrom, dateTo);
    }

    public List<Map<String, Object>> getFeedback(String userId, String dateFrom, String dateTo) {
        return fetchData("/api/feedback/internal/user/" + userId, dateFrom, dateTo);
    }

    public List<Map<String, Object>> getNotes(String userId, String dateFrom, String dateTo) {
        return fetchData("/api/notes/internal/user/" + userId, dateFrom, dateTo);
    }

    private List<Map<String, Object>> fetchData(String path, String dateFrom, String dateTo) {
        String url = diaryServiceUrl + path + "?dateFrom=" + dateFrom + "&dateTo=" + dateTo;
        HttpHeaders headers = new HttpHeaders();
        String token = extractCurrentToken();
        if (token != null) {
            headers.set("Authorization", "Bearer " + token);
        }

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        try {
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {});
            return response.getBody() != null ? response.getBody() : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String extractCurrentToken() {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            String bearerToken = request.getHeader("Authorization");
            if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
                return bearerToken.substring(7);
            }
        }
        return null;
    }
}
