package com.onboardingdiary.dto;

import java.util.List;
import java.util.Map;

public class DashboardResponse {

    private long totalTasks;
    private long completedTasks;
    private long totalIssues;
    private long openIssues;
    private long totalFeedback;
    private long totalNotes;
    private List<Map<String, Object>> recentEntries;
    private List<Map<String, Object>> recruitSummaries;
    private Map<String, Long> userCountsByRole;

    public long getTotalTasks() { return totalTasks; }
    public void setTotalTasks(long totalTasks) { this.totalTasks = totalTasks; }

    public long getCompletedTasks() { return completedTasks; }
    public void setCompletedTasks(long completedTasks) { this.completedTasks = completedTasks; }

    public long getTotalIssues() { return totalIssues; }
    public void setTotalIssues(long totalIssues) { this.totalIssues = totalIssues; }

    public long getOpenIssues() { return openIssues; }
    public void setOpenIssues(long openIssues) { this.openIssues = openIssues; }

    public long getTotalFeedback() { return totalFeedback; }
    public void setTotalFeedback(long totalFeedback) { this.totalFeedback = totalFeedback; }

    public long getTotalNotes() { return totalNotes; }
    public void setTotalNotes(long totalNotes) { this.totalNotes = totalNotes; }

    public List<Map<String, Object>> getRecentEntries() { return recentEntries; }
    public void setRecentEntries(List<Map<String, Object>> recentEntries) { this.recentEntries = recentEntries; }

    public List<Map<String, Object>> getRecruitSummaries() { return recruitSummaries; }
    public void setRecruitSummaries(List<Map<String, Object>> recruitSummaries) { this.recruitSummaries = recruitSummaries; }

    public Map<String, Long> getUserCountsByRole() { return userCountsByRole; }
    public void setUserCountsByRole(Map<String, Long> userCountsByRole) { this.userCountsByRole = userCountsByRole; }
}
