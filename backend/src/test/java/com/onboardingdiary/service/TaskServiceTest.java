package com.onboardingdiary.service;

import com.onboardingdiary.dto.CreateTaskRequest;
import com.onboardingdiary.dto.TaskFilter;
import com.onboardingdiary.dto.TaskResponse;
import com.onboardingdiary.dto.UpdateTaskRequest;
import com.onboardingdiary.entity.Task;
import com.onboardingdiary.entity.TaskCategory;
import com.onboardingdiary.entity.TaskPriority;
import com.onboardingdiary.entity.TaskStatus;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.TaskRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TaskService taskService;

    private AuthenticatedUser admin() {
        return new AuthenticatedUser(1L, "admin@acme.com", "ADMIN");
    }

    private AuthenticatedUser manager(long id) {
        return new AuthenticatedUser(id, "mgr@acme.com", "MANAGER");
    }

    private AuthenticatedUser recruit(long id) {
        return new AuthenticatedUser(id, "rec@acme.com", "RECRUIT");
    }

    private Task task(Long id, Long ownerId) {
        Task task = new Task();
        task.setOwnerId(ownerId);
        task.setDate(LocalDate.of(2026, 1, 5));
        task.setTitle("Set up laptop");
        task.setCategory(TaskCategory.SETUP);
        task.setStatus(TaskStatus.TODO);
        task.setPriority(TaskPriority.MEDIUM);
        try {
            Field field = Task.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(task, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        return task;
    }

    @Test
    void createAssignsOwnerToCallerAndDefaults() {
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
        CreateTaskRequest request = new CreateTaskRequest(
                LocalDate.of(2026, 2, 1), "  Read handbook  ", "  notes  ",
                TaskCategory.LEARNING, null, null);

        TaskResponse response = taskService.create(recruit(5L), request);

        assertThat(response.ownerId()).isEqualTo(5L);
        assertThat(response.title()).isEqualTo("Read handbook");
        assertThat(response.description()).isEqualTo("notes");
        assertThat(response.status()).isEqualTo(TaskStatus.TODO);
        assertThat(response.priority()).isEqualTo(TaskPriority.MEDIUM);
    }

    @Test
    void ownerCanReadOwnTask() {
        when(taskRepository.findById(10L)).thenReturn(Optional.of(task(10L, 5L)));
        assertThat(taskService.get(recruit(5L), 10L).id()).isEqualTo(10L);
    }

    @Test
    void recruitCannotReadOthersTask() {
        when(taskRepository.findById(10L)).thenReturn(Optional.of(task(10L, 6L)));
        assertThatThrownBy(() -> taskService.get(recruit(5L), 10L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void adminCanReadAnyTask() {
        when(taskRepository.findById(10L)).thenReturn(Optional.of(task(10L, 6L)));
        assertThat(taskService.get(admin(), 10L).id()).isEqualTo(10L);
    }

    @Test
    void managerCanReadAssignedRecruitTaskOnly() {
        Task assigned = task(10L, 6L);
        User owner = TestUsers.recruit(6L, "owned@acme.com");
        owner.setManagerId(2L);
        when(taskRepository.findById(10L)).thenReturn(Optional.of(assigned));
        when(userRepository.findById(6L)).thenReturn(Optional.of(owner));

        assertThat(taskService.get(manager(2L), 10L).id()).isEqualTo(10L);

        User unmanaged = TestUsers.recruit(7L, "other@acme.com");
        unmanaged.setManagerId(99L);
        Task otherTask = task(11L, 7L);
        when(taskRepository.findById(11L)).thenReturn(Optional.of(otherTask));
        when(userRepository.findById(7L)).thenReturn(Optional.of(unmanaged));

        assertThatThrownBy(() -> taskService.get(manager(2L), 11L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateAllowedOnlyForOwner() {
        when(taskRepository.findById(10L)).thenReturn(Optional.of(task(10L, 6L)));
        UpdateTaskRequest request = new UpdateTaskRequest(
                LocalDate.of(2026, 2, 2), "x", null,
                TaskCategory.OTHER, TaskStatus.DONE, TaskPriority.HIGH);

        assertThatThrownBy(() -> taskService.update(admin(), 10L, request))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(taskRepository, never()).save(any());
    }

    @Test
    void updateMutatesOwnedTask() {
        when(taskRepository.findById(10L)).thenReturn(Optional.of(task(10L, 5L)));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
        UpdateTaskRequest request = new UpdateTaskRequest(
                LocalDate.of(2026, 3, 3), "Updated title", "desc",
                TaskCategory.MEETING, TaskStatus.IN_PROGRESS, TaskPriority.HIGH);

        TaskResponse response = taskService.update(recruit(5L), 10L, request);

        assertThat(response.title()).isEqualTo("Updated title");
        assertThat(response.status()).isEqualTo(TaskStatus.IN_PROGRESS);
        assertThat(response.priority()).isEqualTo(TaskPriority.HIGH);
        assertThat(response.category()).isEqualTo(TaskCategory.MEETING);
    }

    @Test
    void deleteAllowedOnlyForOwner() {
        when(taskRepository.findById(10L)).thenReturn(Optional.of(task(10L, 6L)));
        assertThatThrownBy(() -> taskService.delete(recruit(5L), 10L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(taskRepository, never()).delete(any(Task.class));
    }

    @Test
    void deleteRemovesOwnedTask() {
        Task owned = task(10L, 5L);
        when(taskRepository.findById(10L)).thenReturn(Optional.of(owned));
        taskService.delete(recruit(5L), 10L);
        verify(taskRepository).delete(owned);
    }

    @Test
    void listRejectsManagerFilteringUnmanagedOwner() {
        when(userRepository.findIdsByManagerId(2L)).thenReturn(List.of(6L));
        TaskFilter filter = new TaskFilter(99L, null, null, null, null, null, null);

        assertThatThrownBy(() -> taskService.list(manager(2L), filter, Pageable.unpaged()))
                .isInstanceOf(AccessDeniedException.class);
        verify(taskRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void listAllowsRecruitOwnTasks() {
        Page<Task> page = new PageImpl<>(List.of(task(10L, 5L)));
        when(taskRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        TaskFilter filter = new TaskFilter(null, TaskStatus.TODO, null, null, null, null, null);

        Page<TaskResponse> result = taskService.list(recruit(5L), filter, PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        verify(taskRepository).findAll(any(Specification.class), any(Pageable.class));
    }
}
