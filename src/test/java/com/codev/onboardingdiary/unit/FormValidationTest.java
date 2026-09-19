package com.codev.onboardingdiary.unit;

import static org.assertj.core.api.Assertions.assertThat;

import com.codev.onboardingdiary.domain.FeedbackType;
import com.codev.onboardingdiary.domain.Priority;
import com.codev.onboardingdiary.domain.TaskStatus;
import com.codev.onboardingdiary.web.dto.FeedbackForm;
import com.codev.onboardingdiary.web.dto.NoteForm;
import com.codev.onboardingdiary.web.dto.SignupForm;
import com.codev.onboardingdiary.web.dto.TaskForm;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class FormValidationTest {

    private static final ValidatorFactory FACTORY = Validation.buildDefaultValidatorFactory();
    private final Validator validator = FACTORY.getValidator();

    private Set<String> fieldsInError(Object form) {
        return validator.validate(form).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    private TaskForm validTask() {
        TaskForm form = new TaskForm();
        form.setDate(LocalDate.now().minusDays(1));
        form.setTitle("Collect laptop");
        form.setCategory("Setup");
        form.setStatus(TaskStatus.TODO);
        form.setPriority(Priority.MEDIUM);
        return form;
    }

    @Test
    void validTaskPasses() {
        assertThat(fieldsInError(validTask())).isEmpty();
    }

    @Test
    void futureDiaryDateIsRejected() {
        TaskForm form = validTask();
        form.setDate(LocalDate.now().plusDays(1));
        assertThat(fieldsInError(form)).contains("date");
    }

    @Test
    void requiredTaskFieldsAreEnforced() {
        TaskForm form = new TaskForm();
        assertThat(fieldsInError(form)).contains("date", "title", "category", "status", "priority");
    }

    @Test
    void shortAndOversizedTaskTextIsRejected() {
        TaskForm form = validTask();
        form.setTitle("ab");
        assertThat(fieldsInError(form)).contains("title");

        form = validTask();
        form.setTitle("x".repeat(151));
        assertThat(fieldsInError(form)).contains("title");

        form = validTask();
        form.setDescription("x".repeat(4001));
        assertThat(fieldsInError(form)).contains("description");
    }

    @Test
    void signupRequiresValidEmailAndPasswordLength() {
        SignupForm form = new SignupForm();
        form.setName("A");
        form.setEmail("not-an-email");
        form.setPassword("short");
        assertThat(fieldsInError(form)).contains("name", "email", "password");

        form.setName("Rita Recruit");
        form.setEmail("rita@example.com");
        form.setPassword("Password123!");
        assertThat(fieldsInError(form)).isEmpty();
    }

    @Test
    void feedbackAndNoteLimitsAreEnforced() {
        FeedbackForm feedback = new FeedbackForm();
        feedback.setDate(LocalDate.now());
        feedback.setSubject("ok");
        feedback.setType(FeedbackType.POSITIVE);
        feedback.setDetails("x".repeat(5001));
        assertThat(fieldsInError(feedback)).contains("subject", "details");

        NoteForm note = new NoteForm();
        note.setDate(LocalDate.now());
        note.setTitle("Notes on onboarding");
        note.setContent("x".repeat(10001));
        note.setTags("y".repeat(501));
        assertThat(fieldsInError(note)).contains("content", "tags");
    }
}
