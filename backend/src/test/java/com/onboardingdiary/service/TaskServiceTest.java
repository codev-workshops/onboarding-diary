package com.onboardingdiary.service;

import com.onboardingdiary.dto.request.TaskRequest;
import com.onboardingdiary.dto.response.TaskResponse;
import com.onboardingdiary.entity.Task;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.*;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.TaskRepository;
import com.onboardingdiary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TaskService taskService;

    private User user;
    private User manager;
    private Task task;
    private TaskRequest taskRequest;

    @BeforeEach
    void setUp() {
        manager = User.builder()
                .id(UUID.randomUUID())
                .email("manager@test.com")
                .fullName("Test Manager")
                .role(Role.MANAGER)
                .build();

        user = User.builder()
                .id(UUID.randomUUID())
                .email("recruit@test.com")
                .fullName("Test Recruit")
                .role(Role.RECRUIT)
                .manager(manager)
                .build();

        task = Task.builder()
                .id(UUID.randomUUID())
                .user(user)
                .date(LocalDate.now())
                .title("Test Task")
                .description("Description")
                .category(TaskCategory.SETUP)
                .status(TaskStatus.NOT_STARTED)
                .priority(TaskPriority.MEDIUM)
                .build();

        taskRequest = new TaskRequest();
        taskRequest.setDate(LocalDate.now());
        taskRequest.setTitle("Test Task");
        taskRequest.setDescription("Description");
        taskRequest.setCategory(TaskCategory.SETUP);
        taskRequest.setStatus(TaskStatus.NOT_STARTED);
        taskRequest.setPriority(TaskPriority.MEDIUM);
    }

    @Test
    void create_validRequest_returnsTaskResponse() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        TaskResponse response = taskService.create(user.getId(), taskRequest);

        assertNotNull(response);
        assertEquals("Test Task", response.getTitle());
        assertEquals(TaskCategory.SETUP, response.getCategory());
        verify(taskRepository).save(any(Task.class));
    }

    @Test
    void create_userNotFound_throwsResourceNotFoundException() {
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                taskService.create(UUID.randomUUID(), taskRequest));
    }

    @Test
    void list_returnsPagedResults() {
        PageRequest pageable = PageRequest.of(0, 10);
        Page<Task> page = new PageImpl<>(List.of(task));
        when(taskRepository.findByUserWithFilters(eq(user.getId()), any(), any(), any(), any(), eq(pageable)))
                .thenReturn(page);

        Page<TaskResponse> result = taskService.list(user.getId(), null, null, null, null, pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals("Test Task", result.getContent().get(0).getTitle());
    }

    @Test
    void getById_ownerAccess_returnsTask() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        TaskResponse response = taskService.getById(task.getId(), user.getId(), "RECRUIT");

        assertEquals(task.getId(), response.getId());
    }

    @Test
    void getById_managerAccessAssignedRecruit_returnsTask() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        TaskResponse response = taskService.getById(task.getId(), manager.getId(), "MANAGER");

        assertEquals(task.getId(), response.getId());
    }

    @Test
    void getById_managerAccessUnassignedRecruit_throwsUnauthorized() {
        UUID otherManagerId = UUID.randomUUID();
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThrows(UnauthorizedException.class, () ->
                taskService.getById(task.getId(), otherManagerId, "MANAGER"));
    }

    @Test
    void getById_adminAccess_returnsTask() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        TaskResponse response = taskService.getById(task.getId(), UUID.randomUUID(), "ADMIN");

        assertEquals(task.getId(), response.getId());
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        when(taskRepository.findById(any())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                taskService.getById(UUID.randomUUID(), user.getId(), "RECRUIT"));
    }

    @Test
    void update_ownerCanUpdate() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        taskRequest.setTitle("Updated Title");
        TaskResponse response = taskService.update(task.getId(), user.getId(), taskRequest);

        assertNotNull(response);
        verify(taskRepository).save(any(Task.class));
    }

    @Test
    void update_nonOwnerCannotUpdate() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThrows(UnauthorizedException.class, () ->
                taskService.update(task.getId(), UUID.randomUUID(), taskRequest));
    }

    @Test
    void delete_ownerCanDelete() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        taskService.delete(task.getId(), user.getId());

        verify(taskRepository).delete(task);
    }

    @Test
    void delete_nonOwnerCannotDelete() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThrows(UnauthorizedException.class, () ->
                taskService.delete(task.getId(), UUID.randomUUID()));
    }

    @Test
    void delete_notFound_throwsResourceNotFoundException() {
        when(taskRepository.findById(any())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                taskService.delete(UUID.randomUUID(), user.getId()));
    }
}
