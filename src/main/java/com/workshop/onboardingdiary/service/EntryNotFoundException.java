package com.workshop.onboardingdiary.service;

/** The requested entry does not exist. */
public class EntryNotFoundException extends RuntimeException {

    public EntryNotFoundException(String message) {
        super(message);
    }
}
