package com.onboardingdiary.dto;

public class UserUpdateRequest {

    private String role;
    private Boolean active;

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
