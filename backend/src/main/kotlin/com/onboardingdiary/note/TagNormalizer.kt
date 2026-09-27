package com.onboardingdiary.note

import com.onboardingdiary.api.error.ApiException
import com.onboardingdiary.api.error.DetailCode
import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.ErrorDetail

/**
 * Tag rules from docs/detailed-requirements.md §7.7: each tag is trimmed and
 * lower-cased, duplicates are dropped (first occurrence wins), every tag must
 * match [PATTERN] and a note carries at most [MAX_TAGS]. Violations are
 * `400 VALIDATION_FAILED` on field `tags` (or `tag` for the list filter).
 */
object TagNormalizer {
    const val MAX_TAGS = 10
    val PATTERN = Regex("^[a-z0-9][a-z0-9-]{0,29}$")

    fun normalizeOne(raw: String): String = raw.trim().lowercase()

    fun isValid(tag: String): Boolean = PATTERN.matches(tag)

    /** Normalizes a request `tags` array; `null` means "no tags". */
    fun normalize(raw: List<String>?): List<String> {
        if (raw == null) return emptyList()
        val normalized = raw.map(::normalizeOne).distinct()
        val details = mutableListOf<ErrorDetail>()
        if (normalized.size > MAX_TAGS) {
            details += ErrorDetail("tags", DetailCode.OUT_OF_RANGE, "at most $MAX_TAGS tags are allowed")
        }
        raw.forEachIndexed { i, original ->
            if (!isValid(normalizeOne(original))) {
                details += ErrorDetail("tags[$i]", DetailCode.INVALID_FORMAT, "must match ${PATTERN.pattern}")
            }
        }
        if (details.isNotEmpty()) throw ApiException(ErrorCode.VALIDATION_FAILED, details = details)
        return normalized
    }

    /** Normalizes the `?tag=` filter; blank means "no filter". */
    fun normalizeFilter(raw: String?): String? {
        val tag = raw?.let(::normalizeOne)?.takeIf { it.isNotEmpty() } ?: return null
        if (!isValid(tag)) {
            throw ApiException(
                ErrorCode.VALIDATION_FAILED,
                details = listOf(ErrorDetail("tag", DetailCode.INVALID_FORMAT, "must match ${PATTERN.pattern}")),
            )
        }
        return tag
    }
}
