package com.onboardingdiary.service;

import com.onboardingdiary.dto.CreateTaskRequest;
import com.onboardingdiary.dto.TaskFilter;
import com.onboardingdiary.dto.TaskResponse;
import com.onboardingdiary.dto.UpdateTaskRequest;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.Task;
import com.onboardingdiary.entity.TaskPriority;
import com.onboardingdiary.entity.TaskStatus;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.TaskRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TaskResponse create(AuthenticatedUser caller, CreateTaskRequest request) {
        Task task = new Task();
        task.setOwnerId(caller.id());
        task.setDate(request.date());
        task.setTitle(request.title().trim());
        task.setDescription(trimToNull(request.description()));
        task.setCategory(request.category());
        task.setStatus(request.status() != null ? request.status() : TaskStatus.TODO);
        task.setPriority(request.priority() != null ? request.priority() : TaskPriority.MEDIUM);
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional(readOnly = true)
    public Page<TaskResponse> list(AuthenticatedUser caller, TaskFilter filter, Pageable pageable) {
        Set<Long> allowedOwnerIds = visibleOwnerIds(caller);
        Long ownerFilter = filter.ownerId();

        if (ownerFilter != null && allowedOwnerIds != null && !allowedOwnerIds.contains(ownerFilter)) {
            throw new AccessDeniedException("Not allowed to view this user's tasks");
        }

        Specification<Task> spec = buildSpecification(allowedOwnerIds, ownerFilter, filter);
        return taskRepository.findAll(spec, pageable).map(TaskResponse::from);
    }

    @Transactional(readOnly = true)
    public TaskResponse get(AuthenticatedUser caller, Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        if (!canRead(caller, task)) {
            // 404 rather than 403 to avoid disclosing existence of others' tasks.
            throw new ResourceNotFoundException("Task not found");
        }
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse update(AuthenticatedUser caller, Long id, UpdateTaskRequest request) {
        Task task = loadOwnedTask(caller, id);
        task.setDate(request.date());
        task.setTitle(request.title().trim());
        task.setDescription(trimToNull(request.description()));
        task.setCategory(request.category());
        task.setStatus(request.status());
        task.setPriority(request.priority());
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public void delete(AuthenticatedUser caller, Long id) {
        Task task = loadOwnedTask(caller, id);
        taskRepository.delete(task);
    }

    /**
     * Loads a task that the caller is permitted to modify (owner only). Returns
     * 404 for both missing and non-owned tasks to avoid existence disclosure.
     */
    private Task loadOwnedTask(AuthenticatedUser caller, Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        if (!caller.id().equals(task.getOwnerId())) {
            throw new ResourceNotFoundException("Task not found");
        }
        return task;
    }

    private boolean canRead(AuthenticatedUser caller, Task task) {
        Role role = Role.valueOf(caller.role());
        if (role == Role.ADMIN) {
            return true;
        }
        if (caller.id().equals(task.getOwnerId())) {
            return true;
        }
        if (role == Role.MANAGER) {
            User owner = userRepository.findById(task.getOwnerId()).orElse(null);
            return owner != null && caller.id().equals(owner.getManagerId());
        }
        return false;
    }

    /**
     * The set of owner ids the caller may view, or {@code null} for unrestricted
     * (admin) access.
     */
    private Set<Long> visibleOwnerIds(AuthenticatedUser caller) {
        Role role = Role.valueOf(caller.role());
        if (role == Role.ADMIN) {
            return null;
        }
        Set<Long> ids = new HashSet<>();
        ids.add(caller.id());
        if (role == Role.MANAGER) {
            ids.addAll(userRepository.findIdsByManagerId(caller.id()));
        }
        return ids;
    }

    private Specification<Task> buildSpecification(Set<Long> allowedOwnerIds, Long ownerFilter, TaskFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (ownerFilter != null) {
                predicates.add(cb.equal(root.get("ownerId"), ownerFilter));
            } else if (allowedOwnerIds != null) {
                predicates.add(root.get("ownerId").in(allowedOwnerIds));
            }

            if (filter.status() != null) {
                predicates.add(cb.equal(root.get("status"), filter.status()));
            }
            if (filter.category() != null) {
                predicates.add(cb.equal(root.get("category"), filter.category()));
            }
            if (filter.priority() != null) {
                predicates.add(cb.equal(root.get("priority"), filter.priority()));
            }
            if (filter.dateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), filter.dateFrom()));
            }
            if (filter.dateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), filter.dateTo()));
            }
            if (filter.search() != null && !filter.search().isBlank()) {
                String like = "%" + filter.search().trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("description")), like)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
