package com.onboardingdiary.service;

import com.onboardingdiary.dto.request.TaskRequest;
import com.onboardingdiary.dto.response.TaskResponse;
import com.onboardingdiary.entity.Task;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.TaskCategory;
import com.onboardingdiary.enums.TaskStatus;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.TaskRepository;
import com.onboardingdiary.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    @Transactional
    public TaskResponse create(UUID userId, TaskRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Task task = Task.builder()
                .user(user)
                .date(request.getDate())
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .status(request.getStatus())
                .priority(request.getPriority())
                .build();

        task = taskRepository.save(task);
        return TaskResponse.from(task);
    }

    public Page<TaskResponse> list(UUID userId, LocalDate dateFrom, LocalDate dateTo,
                                    TaskCategory category, TaskStatus status, Pageable pageable) {
        return taskRepository.findByUserWithFilters(userId, dateFrom, dateTo, category, status, pageable)
                .map(TaskResponse::from);
    }

    public TaskResponse getById(UUID taskId, UUID requestingUserId, String role) {
        Task task = findTaskOrThrow(taskId);
        checkAccess(task, requestingUserId, role);
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse update(UUID taskId, UUID userId, TaskRequest request) {
        Task task = findTaskOrThrow(taskId);
        checkOwnership(task, userId);

        task.setDate(request.getDate());
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setCategory(request.getCategory());
        task.setStatus(request.getStatus());
        task.setPriority(request.getPriority());

        task = taskRepository.save(task);
        return TaskResponse.from(task);
    }

    @Transactional
    public void delete(UUID taskId, UUID userId) {
        Task task = findTaskOrThrow(taskId);
        checkOwnership(task, userId);
        taskRepository.delete(task);
    }

    private Task findTaskOrThrow(UUID taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    }

    private void checkOwnership(Task task, UUID userId) {
        if (!task.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only modify your own tasks");
        }
    }

    private void checkAccess(Task task, UUID requestingUserId, String role) {
        if (role.equals("ADMIN")) return;
        if (task.getUser().getId().equals(requestingUserId)) return;
        if (role.equals("MANAGER")) {
            User taskOwner = task.getUser();
            if (taskOwner.getManager() != null && taskOwner.getManager().getId().equals(requestingUserId)) {
                return;
            }
        }
        throw new UnauthorizedException("Access denied");
    }
}
