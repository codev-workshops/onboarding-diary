package com.onboardingdiary.api.feedback

import com.onboardingdiary.feedback.FeedbackNote
import com.onboardingdiary.feedback.FeedbackType
import com.onboardingdiary.validation.ValidEntryDate
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/** `FeedbackCreateRequest` — also the PUT body (full replacement, every field required). */
data class FeedbackRequest(
    @field:NotNull @field:ValidEntryDate val entryDate: LocalDate?,
    @field:NotBlank @field:Size(max = 200) val subject: String?,
    @field:NotNull val type: FeedbackType?,
    @field:NotBlank @field:Size(max = 4000) val details: String?,
)

data class FeedbackResponse(
    val id: UUID,
    val recruitId: UUID,
    val entryDate: LocalDate,
    val subject: String,
    val type: FeedbackType,
    val details: String,
    val version: Long,
    val createdAt: Instant,
    val updatedAt: Instant,
) {
    companion object {
        fun from(f: FeedbackNote) = FeedbackResponse(
            id = f.id,
            recruitId = f.recruitId,
            entryDate = f.entryDate,
            subject = f.subject,
            type = f.type,
            details = f.details,
            version = f.version,
            createdAt = f.createdAt,
            updatedAt = f.updatedAt,
        )
    }
}
