package com.onboarding.diary;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.onboarding.diary", "com.onboarding.common"})
public class DiaryServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(DiaryServiceApplication.class, args);
    }
}
