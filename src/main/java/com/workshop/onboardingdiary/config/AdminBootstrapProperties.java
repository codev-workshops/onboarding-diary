package com.workshop.onboardingdiary.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bootstrap Admin settings, populated from the ADMIN_* environment variables.
 */
@ConfigurationProperties(prefix = "onboarding-diary.admin")
public class AdminBootstrapProperties {

    private String email;
    private String password;
    private String name = "Administrator";
    private String department = "Other";
    private String startDate;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }
}
