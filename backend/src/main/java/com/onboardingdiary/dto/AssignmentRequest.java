package com.onboardingdiary.dto;

public class AssignmentRequest {

    private Long managerId;
    private Long recruitId;

    public Long getManagerId() { return managerId; }
    public void setManagerId(Long managerId) { this.managerId = managerId; }

    public Long getRecruitId() { return recruitId; }
    public void setRecruitId(Long recruitId) { this.recruitId = recruitId; }
}
