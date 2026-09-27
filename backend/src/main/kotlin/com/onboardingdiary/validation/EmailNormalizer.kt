package com.onboardingdiary.validation

/** Trim + lowercase (REQ-FUNC-003). Applied before validation, storage and lookup. */
object EmailNormalizer {
    fun normalize(raw: String?): String? = raw?.trim()?.lowercase()
}
