package com.workshop.onboardingdiary;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class OnboardingDiaryApplication {

    public static void main(String[] args) {
        SpringApplication.run(OnboardingDiaryApplication.class, args);
    }
}
