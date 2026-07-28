package com.workshop.onboardingdiary.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.workshop.onboardingdiary.entity.Department;
import com.workshop.onboardingdiary.repository.DepartmentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** The department list is public because the sign-up form needs it (REQUIREMENTS 4.9). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DepartmentEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Test
    void seededDepartmentsAreReadableWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/departments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(11))
                .andExpect(jsonPath("$[?(@.name == 'Engineering')].active").value(true))
                .andExpect(jsonPath("$[?(@.name == 'Other')]").exists());
    }

    @Test
    void theActiveFilterHidesDeactivatedDepartments() throws Exception {
        Department department = departmentRepository.findByNameIgnoreCase("Finance").orElseThrow();
        department.setActive(false);
        departmentRepository.saveAndFlush(department);

        mockMvc.perform(get("/api/departments").param("active", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(10))
                .andExpect(jsonPath("$[?(@.name == 'Finance')]").doesNotExist());

        mockMvc.perform(get("/api/departments").param("active", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Finance"));
    }
}
