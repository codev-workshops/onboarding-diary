package com.onboardingdiary.api.note

import com.onboardingdiary.note.AdditionalNote
import com.onboardingdiary.validation.ValidEntryDate
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/**
 * `NoteCreateRequest` — also the PUT body (full replacement). `tags` are
 * normalized by `TagNormalizer` in the service (count / pattern rules live
 * there so the error details name the offending element).
 */
data class NoteRequest(
    @field:NotNull @field:ValidEntryDate val entryDate: LocalDate?,
    @field:NotBlank @field:Size(max = 200) val title: String?,
    @field:NotBlank @field:Size(max = 10000) val content: String?,
    val tags: List<String>? = null,
)

data class NoteResponse(
    val id: UUID,
    val recruitId: UUID,
    val entryDate: LocalDate,
    val title: String,
    val content: String,
    val tags: List<String>,
    val version: Long,
    val createdAt: Instant,
    val updatedAt: Instant,
) {
    companion object {
        fun from(n: AdditionalNote) = NoteResponse(
            id = n.id,
            recruitId = n.recruitId,
            entryDate = n.entryDate,
            title = n.title,
            content = n.content,
            tags = n.tags,
            version = n.version,
            createdAt = n.createdAt,
            updatedAt = n.updatedAt,
        )
    }
}
