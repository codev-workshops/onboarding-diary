package com.workshop.onboardingdiary;

import static org.assertj.core.api.Assertions.assertThat;

import com.workshop.onboardingdiary.repository.DepartmentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class OnboardingDiaryApplicationTests {

    @Autowired
    private DepartmentRepository departmentRepository;

    @Test
    void contextLoads() {
        assertThat(departmentRepository).isNotNull();
    }

    @Test
    void flywaySeedsTheDepartmentList() {
        assertThat(departmentRepository.count()).isEqualTo(11);
        assertThat(departmentRepository.findByNameIgnoreCase("engineering")).isPresent();
        assertThat(departmentRepository.findByNameIgnoreCase("Other")).isPresent();
    }
}
