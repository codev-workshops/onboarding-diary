package com.workshop.onboardingdiary.entries;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.TaskCategory;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.TaskCategoryRepository;
import com.workshop.onboardingdiary.service.JwtService;
import com.workshop.onboardingdiary.support.TestUsers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Task category list for authenticated users (REQUIREMENTS 4.9, 2.6). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TaskCategoryEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TestUsers testUsers;

    @Autowired
    private TaskCategoryRepository taskCategoryRepository;

    private String token;

    @BeforeEach
    void setUp() {
        User user = testUsers.create("categories@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        token = jwtService.issueToken(user.getEmail(), user.getRole());
    }

    @Test
    void theSeededCategoriesAreReturnedToAnyAuthenticatedUser() throws Exception {
        mockMvc.perform(get("/api/categories").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$[0].name").value("Development"))
                .andExpect(jsonPath("$[1].name").value("Documentation"))
                .andExpect(jsonPath("$[2].name").value("Meetings"))
                .andExpect(jsonPath("$[3].name").value("Other"))
                .andExpect(jsonPath("$[4].name").value("Support"))
                .andExpect(jsonPath("$[5].name").value("Training"));
    }

    @Test
    void inactiveCategoriesAreHiddenFromTheDefaultListing() throws Exception {
        TaskCategory training = taskCategoryRepository.findByNameIgnoreCase("Training").orElseThrow();
        training.setActive(false);
        taskCategoryRepository.save(training);

        mockMvc.perform(get("/api/categories").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5));

        mockMvc.perform(get("/api/categories?active=false").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Training"));
    }

    @Test
    void listingCategoriesRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/categories")).andExpect(status().isUnauthorized());
    }
}
