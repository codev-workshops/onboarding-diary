package com.onboardingdiary.api.issue

import com.onboardingdiary.issue.IssueEntry
import com.onboardingdiary.issue.IssueSeverity
import com.onboardingdiary.issue.IssueStatus
import com.onboardingdiary.validation.ValidEntryDate
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/** `IssueCreateRequest`: `status` is optional and defaults to OPEN. */
data class CreateIssueRequest(
    @field:NotNull @field:ValidEntryDate val entryDate: LocalDate?,
    @field:NotBlank @field:Size(max = 200) val title: String?,
    @field:Size(max = 4000) val description: String? = null,
    @field:NotNull val severity: IssueSeverity?,
    val status: IssueStatus? = null,
    @field:Size(max = 4000) val resolutionNotes: String? = null,
)

/** `IssueUpdateRequest`: full replacement, every field required except `description` / `resolutionNotes`. */
data class UpdateIssueRequest(
    @field:NotNull @field:ValidEntryDate val entryDate: LocalDate?,
    @field:NotBlank @field:Size(max = 200) val title: String?,
    @field:Size(max = 4000) val description: String? = null,
    @field:NotNull val severity: IssueSeverity?,
    @field:NotNull val status: IssueStatus?,
    @field:Size(max = 4000) val resolutionNotes: String? = null,
)

data class IssueResponse(
    val id: UUID,
    val recruitId: UUID,
    val entryDate: LocalDate,
    val title: String,
    val description: String?,
    val severity: IssueSeverity,
    val status: IssueStatus,
    val resolutionNotes: String?,
    val version: Long,
    val createdAt: Instant,
    val updatedAt: Instant,
) {
    companion object {
        fun from(i: IssueEntry) = IssueResponse(
            id = i.id,
            recruitId = i.recruitId,
            entryDate = i.entryDate,
            title = i.title,
            description = i.description,
            severity = i.severity,
            status = i.status,
            resolutionNotes = i.resolutionNotes,
            version = i.version,
            createdAt = i.createdAt,
            updatedAt = i.updatedAt,
        )
    }
}
