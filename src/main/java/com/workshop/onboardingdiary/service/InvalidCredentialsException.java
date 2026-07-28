package com.workshop.onboardingdiary.service;

/** Login failure; always reported with the same generic message to avoid user enumeration. */
public class InvalidCredentialsException extends RuntimeException {

    public static final String MESSAGE = "Invalid email or password";

    public InvalidCredentialsException() {
        super(MESSAGE);
    }
}
