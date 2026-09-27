package com.onboardingdiary.api.feedback

import com.onboardingdiary.api.error.ApiException
import com.onboardingdiary.api.error.DetailCode
import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.ErrorDetail
import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.api.paging.enumParam
import com.onboardingdiary.entry.DateRangeFilter
import com.onboardingdiary.feedback.FeedbackFilter
import com.onboardingdiary.feedback.FeedbackRepository
import com.onboardingdiary.feedback.FeedbackType
import com.onboardingdiary.security.AuthenticatedUser
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
@RequestMapping("/api/v1/feedback")
class FeedbackController(private val service: FeedbackService) {

    /** operationId: listFeedback */
    @GetMapping
    suspend fun list(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestParam recruitId: UUID?,
        @RequestParam from: String?,
        @RequestParam to: String?,
        @RequestParam type: String?,
        @RequestParam page: Int?,
        @RequestParam size: Int?,
        @RequestParam sort: String?,
    ): Page<FeedbackResponse> {
        val filter = FeedbackFilter(
            range = DateRangeFilter.parse(from, to),
            type = enumParam<FeedbackType>("type", type),
        )
        return service.list(principal, recruitId, filter, PageRequest.parse(page, size, sort, FeedbackRepository.FEEDBACK_SORT))
    }

    /** operationId: createFeedback */
    @PostMapping
    suspend fun create(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @Valid @RequestBody request: FeedbackRequest,
    ): ResponseEntity<FeedbackResponse> = service.create(principal, request).let { ResponseEntity.status(HttpStatus.CREATED).eTag(it.etag()).body(it) }

    /** operationId: getFeedback */
    @GetMapping("/{feedbackId}")
    suspend fun get(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable feedbackId: UUID,
    ): ResponseEntity<FeedbackResponse> = service.get(principal, feedbackId).let { ResponseEntity.ok().eTag(it.etag()).body(it) }

    /** operationId: updateFeedback. Optional `If-Match: "<version>"` makes a stale write 409 CONFLICT. */
    @PutMapping("/{feedbackId}")
    suspend fun update(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable feedbackId: UUID,
        @RequestHeader(HttpHeaders.IF_MATCH) ifMatch: String?,
        @Valid @RequestBody request: FeedbackRequest,
    ): ResponseEntity<FeedbackResponse> =
        service.update(principal, feedbackId, request, parseIfMatch(ifMatch)).let { ResponseEntity.ok().eTag(it.etag()).body(it) }

    /** operationId: deleteFeedback */
    @DeleteMapping("/{feedbackId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    suspend fun delete(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable feedbackId: UUID,
    ) = service.delete(principal, feedbackId)

    private fun FeedbackResponse.etag() = "\"$version\""

    /** Accepts `"3"`, `W/"3"` or `3`; `*` means no precondition. */
    private fun parseIfMatch(raw: String?): Long? {
        val value = raw?.trim()?.takeIf { it.isNotEmpty() && it != "*" } ?: return null
        return value.removePrefix("W/").trim('"').toLongOrNull()
            ?: throw ApiException(
                ErrorCode.VALIDATION_FAILED,
                details = listOf(ErrorDetail("If-Match", DetailCode.INVALID_FORMAT, "must be the note's ETag")),
            )
    }
}
