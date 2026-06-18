package com.onboardingdiary.service;

import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;

import java.lang.reflect.Field;

/**
 * Test helpers for constructing User instances (the id has no public setter).
 */
final class TestUsers {

    private TestUsers() {
    }

    static User of(Long id, String email, Role role) {
        User user = new User();
        user.setEmail(email);
        user.setName("Test " + role);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        user.setPasswordHash("hashed");
        setId(user, id);
        return user;
    }

    static User recruit(Long id, String email) {
        return of(id, email, Role.RECRUIT);
    }

    static User admin(Long id, String email) {
        return of(id, email, Role.ADMIN);
    }

    static User manager(Long id, String email) {
        return of(id, email, Role.MANAGER);
    }

    static void setId(User user, Long id) {
        try {
            Field field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Unable to set User id in test", e);
        }
    }
}
