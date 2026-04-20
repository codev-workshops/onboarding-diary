package com.onboarding.diary.service;

import com.onboarding.common.dto.PageResponse;
import com.onboarding.common.exception.AccessDeniedException;
import com.onboarding.common.exception.ResourceNotFoundException;
import com.onboarding.diary.dto.CreateTaskRequest;
import com.onboarding.diary.dto.TaskFilterParams;
import com.onboarding.diary.dto.TaskResponse;
import com.onboarding.diary.dto.UpdateTaskRequest;
import com.onboarding.diary.entity.Priority;
import com.onboarding.diary.entity.TaskCategory;
import com.onboarding.diary.entity.TaskEntry;
import com.onboarding.diary.entity.TaskStatus;
import com.onboarding.diary.repository.TaskEntryRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskEntryRepository taskEntryRepository;

    @Transactional
    public TaskResponse create(String userId, CreateTaskRequest request) {
        String now = Instant.now().toString();
        TaskEntry entry = TaskEntry.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .date(request.getDate())
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .status(request.getStatus() != null ? request.getStatus() : TaskStatus.NOT_STARTED)
                .priority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM)
                .deleted(false)
                .createdAt(now)
                .updatedAt(now)
                .build();
        taskEntryRepository.save(entry);
        return toResponse(entry);
    }

    public TaskResponse getById(String id, String requestingUserId, String role) {
        TaskEntry entry = taskEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task", id));
        if (!entry.getUserId().equals(requestingUserId)
                && !"MANAGER".equals(role) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("You do not have permission to view this task");
        }
        return toResponse(entry);
    }

    public PageResponse<TaskResponse> list(String userId, TaskFilterParams filters, Pageable pageable) {
        Page<TaskEntry> page;
        if (filters.getCategory() != null && filters.getStatus() != null) {
            page = taskEntryRepository.findByUserIdAndCategoryAndStatusAndDeletedFalse(
                    userId, filters.getCategory(), filters.getStatus(), pageable);
        } else if (filters.getCategory() != null) {
            page = taskEntryRepository.findByUserIdAndCategoryAndDeletedFalse(
                    userId, filters.getCategory(), pageable);
        } else if (filters.getStatus() != null) {
            page = taskEntryRepository.findByUserIdAndStatusAndDeletedFalse(
                    userId, filters.getStatus(), pageable);
        } else {
            page = taskEntryRepository.findByUserIdAndDeletedFalse(userId, pageable);
        }
        return toPageResponse(page);
    }

    public PageResponse<TaskResponse> listForUser(String targetUserId, TaskFilterParams filters, Pageable pageable) {
        return list(targetUserId, filters, pageable);
    }

    @Transactional
    public TaskResponse update(String id, String userId, UpdateTaskRequest request) {
        TaskEntry entry = taskEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task", id));
        if (!entry.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to update this task");
        }
        if (request.getDate() != null) entry.setDate(request.getDate());
        if (request.getTitle() != null) entry.setTitle(request.getTitle());
        if (request.getDescription() != null) entry.setDescription(request.getDescription());
        if (request.getCategory() != null) entry.setCategory(request.getCategory());
        if (request.getStatus() != null) entry.setStatus(request.getStatus());
        if (request.getPriority() != null) entry.setPriority(request.getPriority());
        entry.setUpdatedAt(Instant.now().toString());
        taskEntryRepository.save(entry);
        return toResponse(entry);
    }

    @Transactional
    public void delete(String id, String userId) {
        TaskEntry entry = taskEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task", id));
        if (!entry.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to delete this task");
        }
        entry.setDeleted(true);
        entry.setUpdatedAt(Instant.now().toString());
        taskEntryRepository.save(entry);
    }

    public List<TaskResponse> getTasksInRange(String userId, String dateFrom, String dateTo) {
        return taskEntryRepository.findByUserIdAndDateBetweenAndDeletedFalse(userId, dateFrom, dateTo)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<TaskResponse> getRecentTasks(String userId, int limit) {
        return taskEntryRepository.findRecentByUserId(userId, Pageable.ofSize(limit))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public long countByUserId(String userId) {
        return taskEntryRepository.countByUserIdAndDeletedFalse(userId);
    }

    public long countByUserIdAndStatus(String userId, TaskStatus status) {
        return taskEntryRepository.countByUserIdAndStatusAndDeletedFalse(userId, status);
    }

    public long countByUserIdAndCategory(String userId, TaskCategory category) {
        return taskEntryRepository.countByUserIdAndCategoryAndDeletedFalse(userId, category);
    }

    private TaskResponse toResponse(TaskEntry entry) {
        return TaskResponse.builder()
                .id(entry.getId())
                .userId(entry.getUserId())
                .date(entry.getDate())
                .title(entry.getTitle())
                .description(entry.getDescription())
                .category(entry.getCategory())
                .status(entry.getStatus())
                .priority(entry.getPriority())
                .createdAt(entry.getCreatedAt())
                .updatedAt(entry.getUpdatedAt())
                .build();
    }

    private PageResponse<TaskResponse> toPageResponse(Page<TaskEntry> page) {
        return PageResponse.<TaskResponse>builder()
                .content(page.getContent().stream().map(this::toResponse).collect(Collectors.toList()))
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }
}
