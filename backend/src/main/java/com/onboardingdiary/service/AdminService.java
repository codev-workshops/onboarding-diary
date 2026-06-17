package com.onboardingdiary.service;

import com.onboardingdiary.dto.AssignmentRequest;
import com.onboardingdiary.dto.UserUpdateRequest;
import com.onboardingdiary.entity.ManagerRecruitAssignment;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.enums.Role;
import com.onboardingdiary.exception.BadRequestException;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.ManagerRecruitAssignmentRepository;
import com.onboardingdiary.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final ManagerRecruitAssignmentRepository assignmentRepository;

    public AdminService(UserRepository userRepository, ManagerRecruitAssignmentRepository assignmentRepository) {
        this.userRepository = userRepository;
        this.assignmentRepository = assignmentRepository;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public User updateUser(Long id, UserUpdateRequest request) {
        User user = getUserById(id);
        if (request.getRole() != null) {
            user.setRole(Role.valueOf(request.getRole()));
        }
        if (request.getActive() != null) {
            user.setActive(request.getActive());
        }
        return userRepository.save(user);
    }

    public void deactivateUser(Long id) {
        User user = getUserById(id);
        user.setActive(false);
        userRepository.save(user);
    }

    public List<ManagerRecruitAssignment> getAllAssignments() {
        return assignmentRepository.findAll();
    }

    public ManagerRecruitAssignment createAssignment(AssignmentRequest request) {
        User manager = userRepository.findById(request.getManagerId())
                .orElseThrow(() -> new ResourceNotFoundException("Manager not found"));
        User recruit = userRepository.findById(request.getRecruitId())
                .orElseThrow(() -> new ResourceNotFoundException("Recruit not found"));

        if (manager.getRole() != Role.MANAGER) {
            throw new BadRequestException("User is not a manager");
        }
        if (recruit.getRole() != Role.RECRUIT) {
            throw new BadRequestException("User is not a recruit");
        }
        if (assignmentRepository.existsByManagerIdAndRecruitId(request.getManagerId(), request.getRecruitId())) {
            throw new BadRequestException("Assignment already exists");
        }

        ManagerRecruitAssignment assignment = new ManagerRecruitAssignment();
        assignment.setManager(manager);
        assignment.setRecruit(recruit);

        return assignmentRepository.save(assignment);
    }

    public void removeAssignment(Long id) {
        if (!assignmentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Assignment not found");
        }
        assignmentRepository.deleteById(id);
    }

    public List<ManagerRecruitAssignment> getRecruitsForManager(Long managerId) {
        return assignmentRepository.findByManagerId(managerId);
    }
}
