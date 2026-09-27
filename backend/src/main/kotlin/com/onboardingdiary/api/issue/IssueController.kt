package com.onboardingdiary.api.issue

import com.onboardingdiary.api.error.ApiException
import com.onboardingdiary.api.error.DetailCode
import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.ErrorDetail
import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.api.paging.enumParam
import com.onboardingdiary.entry.DateRangeFilter
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.issue.IssueSeverity
import com.onboardingdiary.issue.IssueFilter
import com.onboardingdiary.issue.IssueRepository
import com.onboardingdiary.issue.IssueStatus
import jakarta.validation.Valid
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/issues")
class IssueController(private val service: IssueService) {

    /** operationId: listIssues */
    @GetMapping
    suspend fun list(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestParam recruitId: UUID?,
        @RequestParam from: String?,
        @RequestParam to: String?,
        @RequestParam severity: String?,
        @RequestParam status: String?,
        @RequestParam page: Int?,
        @RequestParam size: Int?,
        @RequestParam sort: String?,
    ): Page<IssueResponse> {
        val filter = IssueFilter(
            range = DateRangeFilter.parse(from, to),
            severity = enumParam<IssueSeverity>("severity", severity),
            status = enumParam<IssueStatus>("status", status),
        )
        return service.list(principal, recruitId, filter, PageRequest.parse(page, size, sort, IssueRepository.ISSUE_SORT))
    }

    /** operationId: createIssue */
    @PostMapping
    suspend fun create(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @Valid @RequestBody request: CreateIssueRequest,
    ): ResponseEntity<IssueResponse> = service.create(principal, request).let { ResponseEntity.status(HttpStatus.CREATED).eTag(it.etag()).body(it) }

    /** operationId: getIssue */
    @GetMapping("/{issueId}")
    suspend fun get(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable issueId: UUID,
    ): ResponseEntity<IssueResponse> = service.get(principal, issueId).let { ResponseEntity.ok().eTag(it.etag()).body(it) }

    /**
     * operationId: updateIssue. Optional `If-Match: "<version>"` (the ETag of the
     * representation being edited) turns the replacement into an optimistic-lock
     * write: a stale version is 409 CONFLICT.
     */
    @PutMapping("/{issueId}")
    suspend fun update(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable issueId: UUID,
        @RequestHeader(HttpHeaders.IF_MATCH) ifMatch: String?,
        @Valid @RequestBody request: UpdateIssueRequest,
    ): ResponseEntity<IssueResponse> =
        service.update(principal, issueId, request, parseIfMatch(ifMatch)).let { ResponseEntity.ok().eTag(it.etag()).body(it) }

    /** operationId: deleteIssue */
    @DeleteMapping("/{issueId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    suspend fun delete(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable issueId: UUID,
    ) = service.delete(principal, issueId)

    private fun IssueResponse.etag() = "\"$version\""

    /** Accepts `"3"`, `W/"3"` or `3`; `*` means no precondition. */
    private fun parseIfMatch(raw: String?): Long? {
        val value = raw?.trim()?.takeIf { it.isNotEmpty() && it != "*" } ?: return null
        return value.removePrefix("W/").trim('"').toLongOrNull()
            ?: throw ApiException(
                ErrorCode.VALIDATION_FAILED,
                details = listOf(ErrorDetail("If-Match", DetailCode.INVALID_FORMAT, "must be the issue's ETag")),
            )
    }
}
