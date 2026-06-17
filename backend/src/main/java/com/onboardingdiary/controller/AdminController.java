package com.onboardingdiary.controller;

import com.onboardingdiary.dto.AssignmentRequest;
import com.onboardingdiary.dto.UserUpdateRequest;
import com.onboardingdiary.entity.ManagerRecruitAssignment;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUserById(id));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(adminService.updateUser(id, request));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deactivateUser(@PathVariable Long id) {
        adminService.deactivateUser(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<ManagerRecruitAssignment>> getAllAssignments() {
        return ResponseEntity.ok(adminService.getAllAssignments());
    }

    @PostMapping("/assignments")
    public ResponseEntity<ManagerRecruitAssignment> createAssignment(@RequestBody AssignmentRequest request) {
        return ResponseEntity.ok(adminService.createAssignment(request));
    }

    @DeleteMapping("/assignments/{id}")
    public ResponseEntity<Void> removeAssignment(@PathVariable Long id) {
        adminService.removeAssignment(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/managers/{managerId}/recruits")
    public ResponseEntity<List<ManagerRecruitAssignment>> getRecruitsForManager(@PathVariable Long managerId) {
        return ResponseEntity.ok(adminService.getRecruitsForManager(managerId));
    }
}
