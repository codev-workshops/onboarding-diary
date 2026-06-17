package com.onboardingdiary.service;

import com.onboardingdiary.dto.TaskEntryRequest;
import com.onboardingdiary.entity.TaskEntry;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.enums.Priority;
import com.onboardingdiary.entity.enums.TaskStatus;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.TaskEntryRepository;
import com.onboardingdiary.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class TaskEntryService {

    private final TaskEntryRepository taskEntryRepository;
    private final UserRepository userRepository;

    public TaskEntryService(TaskEntryRepository taskEntryRepository, UserRepository userRepository) {
        this.taskEntryRepository = taskEntryRepository;
        this.userRepository = userRepository;
    }

    public TaskEntry create(Long userId, TaskEntryRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        TaskEntry entry = new TaskEntry();
        entry.setDate(request.getDate());
        entry.setTitle(request.getTitle());
        entry.setDescription(request.getDescription());
        entry.setCategory(request.getCategory());
        entry.setStatus(request.getStatus() != null ? TaskStatus.valueOf(request.getStatus()) : TaskStatus.NOT_STARTED);
        entry.setPriority(request.getPriority() != null ? Priority.valueOf(request.getPriority()) : Priority.MEDIUM);
        entry.setUser(user);

        return taskEntryRepository.save(entry);
    }

    public List<TaskEntry> getByUser(Long userId, LocalDate dateFrom, LocalDate dateTo,
                                      String category, String status) {
        List<TaskEntry> entries;
        if (dateFrom != null && dateTo != null) {
            entries = taskEntryRepository.findByUserIdAndDateBetween(userId, dateFrom, dateTo);
        } else {
            entries = taskEntryRepository.findByUserIdOrderByDateDesc(userId);
        }

        if (category != null && !category.isEmpty()) {
            entries = entries.stream()
                    .filter(e -> category.equals(e.getCategory()))
                    .toList();
        }
        if (status != null && !status.isEmpty()) {
            entries = entries.stream()
                    .filter(e -> e.getStatus() != null && status.equals(e.getStatus().name()))
                    .toList();
        }

        return entries;
    }

    public TaskEntry getById(Long id) {
        return taskEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task entry not found"));
    }

    public TaskEntry update(Long id, Long userId, TaskEntryRequest request) {
        TaskEntry entry = getById(id);
        if (!entry.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only update your own entries");
        }

        entry.setDate(request.getDate());
        entry.setTitle(request.getTitle());
        entry.setDescription(request.getDescription());
        entry.setCategory(request.getCategory());
        if (request.getStatus() != null) entry.setStatus(TaskStatus.valueOf(request.getStatus()));
        if (request.getPriority() != null) entry.setPriority(Priority.valueOf(request.getPriority()));

        return taskEntryRepository.save(entry);
    }

    public void delete(Long id, Long userId) {
        TaskEntry entry = getById(id);
        if (!entry.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only delete your own entries");
        }
        taskEntryRepository.delete(entry);
    }
}
