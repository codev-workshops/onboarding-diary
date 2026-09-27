package com.onboardingdiary.api.error

import org.springframework.http.HttpStatus

/**
 * Complete HTTP-status → `code` catalog from docs/detailed-requirements.md §5.2.
 * All codes are defined here; later slices only reference them.
 */
enum class ErrorCode(val status: HttpStatus, val defaultMessage: String) {
    // 400
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Request validation failed"),
    MALFORMED_REQUEST(HttpStatus.BAD_REQUEST, "Request body is malformed or unreadable"),
    INVALID_CURRENT_PASSWORD(HttpStatus.BAD_REQUEST, "Current password is incorrect"),

    // 401
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Authentication required"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Invalid email or password"),

    // 403
    FORBIDDEN(HttpStatus.FORBIDDEN, "You are not allowed to perform this action"),
    NOT_ASSIGNED(HttpStatus.FORBIDDEN, "You are not assigned to this recruit"),
    NOT_INVITED(
        HttpStatus.FORBIDDEN,
        "No invitation found for this email. Ask your administrator to create your account.",
    ),

    // 404
    NOT_FOUND(HttpStatus.NOT_FOUND, "Resource not found"),

    // 409
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "A user with this email already exists"),
    ACCOUNT_ALREADY_ACTIVATED(HttpStatus.CONFLICT, "This account is already set up. Log in instead."),
    ASSIGNMENT_UNCHANGED(HttpStatus.CONFLICT, "This manager is already assigned to the recruit"),
    CONFLICT(HttpStatus.CONFLICT, "The request conflicts with a concurrent change"),

    // 422
    INVALID_STATE_TRANSITION(HttpStatus.UNPROCESSABLE_CONTENT, "Status transition not allowed"),
    RESOLUTION_NOTES_REQUIRED(HttpStatus.UNPROCESSABLE_CONTENT, "Resolution notes are required to resolve an issue"),
    INVALID_ASSIGNMENT_PARTY(HttpStatus.UNPROCESSABLE_CONTENT, "Recruit or manager is not eligible for assignment"),
    ROLE_CHANGE_BLOCKED_BY_ASSIGNMENT(HttpStatus.UNPROCESSABLE_CONTENT, "Role cannot change while an assignment is active"),
    CANNOT_DEACTIVATE_SELF(HttpStatus.UNPROCESSABLE_CONTENT, "You cannot deactivate your own account"),
    EMAIL_LOCKED(HttpStatus.UNPROCESSABLE_CONTENT, "Email can only be changed while the account is INVITED"),

    // 500
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred"),
}

/** `details[].code` vocabulary for field-level errors. */
object DetailCode {
    const val REQUIRED = "REQUIRED"
    const val INVALID_FORMAT = "INVALID_FORMAT"
    const val TOO_LONG = "TOO_LONG"
    const val OUT_OF_RANGE = "OUT_OF_RANGE"
    const val INVALID_ENUM = "INVALID_ENUM"
    const val INVALID_TRANSITION = "INVALID_TRANSITION"
    const val NOT_ALLOWED = "NOT_ALLOWED"
}
