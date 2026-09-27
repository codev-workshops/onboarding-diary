package com.onboardingdiary.api.paging

import com.onboardingdiary.api.error.ApiException
import com.onboardingdiary.api.error.DetailCode
import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.ErrorDetail

/** Page envelope shared by every list endpoint (REQ-FUNC-091). */
data class Page<T>(
    val items: List<T>,
    val page: Int,
    val size: Int,
    val totalItems: Long,
) {
    val totalPages: Int = if (totalItems == 0L) 0 else ((totalItems + size - 1) / size).toInt()

    fun <R> map(transform: (T) -> R): Page<R> = Page(items.map(transform), page, size, totalItems)
}

enum class SortDirection { ASC, DESC }

data class Sort(val field: String, val direction: SortDirection)

/**
 * Parsed `page`/`size`/`sort` query parameters. `sort.field` is guaranteed to
 * be a key of the [SortWhitelist] it was parsed against, so [orderBy] can be
 * interpolated into SQL safely.
 */
data class PageRequest(val page: Int, val size: Int, val sort: Sort, private val whitelist: SortWhitelist) {
    val offset: Long get() = page.toLong() * size

    /** `ORDER BY <column> <dir>` fragment; `column` comes from the whitelist, never from the client. */
    val orderBy: String
        get() = "${whitelist.column(sort.field)} ${sort.direction.name}"

    companion object {
        const val DEFAULT_SIZE = 20
        const val MAX_SIZE = 100

        fun parse(page: Int?, size: Int?, sort: String?, whitelist: SortWhitelist): PageRequest {
            val details = mutableListOf<ErrorDetail>()
            val p = page ?: 0
            if (p < 0) details += ErrorDetail("page", DetailCode.OUT_OF_RANGE, "must be >= 0")
            val s = size ?: DEFAULT_SIZE
            if (s < 1 || s > MAX_SIZE) details += ErrorDetail("size", DetailCode.OUT_OF_RANGE, "must be between 1 and $MAX_SIZE")
            val parsedSort = when (sort) {
                null, "" -> whitelist.default
                else -> parseSort(sort, whitelist) ?: run {
                    details += ErrorDetail(
                        "sort", DetailCode.INVALID_FORMAT,
                        "must be '<field>,asc|desc' with field in ${whitelist.fields}",
                    )
                    whitelist.default
                }
            }
            if (details.isNotEmpty()) throw ApiException(ErrorCode.VALIDATION_FAILED, details = details)
            return PageRequest(p, s, parsedSort, whitelist)
        }

        private fun parseSort(raw: String, whitelist: SortWhitelist): Sort? {
            val parts = raw.split(',')
            if (parts.size != 2) return null
            val field = parts[0]
            if (!whitelist.contains(field)) return null
            val dir = when (parts[1].lowercase()) {
                "asc" -> SortDirection.ASC
                "desc" -> SortDirection.DESC
                else -> return null
            }
            return Sort(field, dir)
        }
    }
}

/** Parses an optional enum query parameter; an unknown value is a `VALIDATION_FAILED` / `INVALID_ENUM` detail. */
inline fun <reified E : Enum<E>> enumParam(name: String, raw: String?): E? {
    if (raw.isNullOrBlank()) return null
    return enumValues<E>().firstOrNull { it.name == raw } ?: throw ApiException(
        ErrorCode.VALIDATION_FAILED,
        details = listOf(ErrorDetail(name, DetailCode.INVALID_ENUM, "must be one of ${enumValues<E>().map { it.name }}")),
    )
}

/** Per-resource map of API sort field -> SQL column, plus the documented default. */
class SortWhitelist(private val columns: Map<String, String>, val default: Sort) {
    init {
        require(columns.containsKey(default.field)) { "default sort field must be whitelisted" }
    }

    val fields: Set<String> get() = columns.keys
    fun contains(field: String) = columns.containsKey(field)
    fun column(field: String): String = columns.getValue(field)
}
