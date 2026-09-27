package com.onboardingdiary.api.error

import java.time.Instant

/** Error envelope (REQ-FUNC-090): `{ code, message, details[], timestamp, path }`. */
data class ErrorResponse(
    val code: ErrorCode,
    val message: String,
    val details: List<ErrorDetail> = emptyList(),
    val timestamp: Instant = Instant.now(),
    val path: String,
)

data class ErrorDetail(
    val field: String? = null,
    val code: String,
    val message: String,
)
