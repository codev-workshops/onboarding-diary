package com.codev.onboardingdiary.service;

import com.codev.onboardingdiary.domain.Task;
import com.codev.onboardingdiary.domain.TaskStatus;
import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.repository.TaskRepository;
import com.codev.onboardingdiary.repository.UserRepository;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.web.dto.TaskFilter;
import com.codev.onboardingdiary.web.dto.TaskForm;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class TaskService {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("date"), Sort.Order.desc("id"));

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final AuthorizationService authorizationService;

    public TaskService(TaskRepository taskRepository,
                       UserRepository userRepository,
                       AuthorizationService authorizationService) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.authorizationService = authorizationService;
    }

    public List<Task> list(AppUserDetails principal, Long ownerId, TaskFilter filter) {
        authorizationService.requireReadAccess(principal, ownerId);
        return taskRepository.findAll(specification(ownerId, filter), NEWEST_FIRST);
    }

    public List<Task> listForOwner(Long ownerId, TaskFilter filter) {
        return taskRepository.findAll(specification(ownerId, filter), NEWEST_FIRST);
    }

    public Task getForRead(AppUserDetails principal, Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Task not found"));
        authorizationService.requireReadAccess(principal, task.getUser());
        return task;
    }

    public Task getOwned(AppUserDetails principal, Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Task not found"));
        authorizationService.requireOwnRecord(principal, task.getUser().getId());
        return task;
    }

    @Transactional
    public Task create(AppUserDetails principal, TaskForm form) {
        User owner = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        Task task = new Task();
        task.setUser(owner);
        apply(task, form);
        return taskRepository.save(task);
    }

    @Transactional
    public Task update(AppUserDetails principal, Long id, TaskForm form) {
        Task task = getOwned(principal, id);
        apply(task, form);
        return taskRepository.save(task);
    }

    @Transactional
    public void delete(AppUserDetails principal, Long id) {
        Task task = getOwned(principal, id);
        taskRepository.delete(task);
    }

    public List<String> categoriesOf(Long ownerId) {
        return taskRepository.findCategories(ownerId);
    }

    public List<Task> searchText(Long ownerId, String query) {
        return taskRepository.searchText(ownerId, query);
    }

    private void apply(Task task, TaskForm form) {
        task.setDate(form.getDate());
        task.setTitle(form.getTitle().trim());
        task.setDescription(form.getDescription());
        task.setCategory(form.getCategory().trim());
        task.setStatus(form.getStatus());
        task.setPriority(form.getPriority());
    }

    static Specification<Task> specification(Long ownerId, TaskFilter filter) {
        TaskFilter effective = filter == null ? TaskFilter.empty() : filter;
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), ownerId));
            if (effective.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), effective.from()));
            }
            if (effective.to() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), effective.to()));
            }
            if (effective.category() != null && !effective.category().isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("category")),
                        effective.category().trim().toLowerCase(java.util.Locale.ROOT)));
            }
            if (effective.status() != null) {
                predicates.add(cb.equal(root.get("status"), effective.status()));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    public long countByStatus(Long ownerId, TaskStatus status) {
        return taskRepository.countByUserIdAndStatus(ownerId, status);
    }

    public long countAll(Long ownerId) {
        return taskRepository.countByUserId(ownerId);
    }
}
