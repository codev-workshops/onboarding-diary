package com.onboardingdiary.api.report

import com.onboardingdiary.api.error.ApiException
import com.onboardingdiary.api.error.DetailCode
import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.ErrorDetail
import com.onboardingdiary.api.paging.enumParam
import com.onboardingdiary.report.ReportFormat
import com.onboardingdiary.report.ReportRangeValidator
import com.onboardingdiary.report.ReportType
import com.onboardingdiary.security.AuthenticatedUser
import org.springframework.core.io.buffer.DataBuffer
import org.springframework.core.io.buffer.DefaultDataBufferFactory
import org.springframework.http.ContentDisposition
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import reactor.core.publisher.Flux
import java.util.UUID

@RestController
@RequestMapping("/api/v1/reports")
class ReportController(private val service: ReportService) {

    private val buffers = DefaultDataBufferFactory()

    /** operationId: generateReport */
    @GetMapping
    suspend fun generate(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestParam recruitId: UUID?,
        @RequestParam from: String?,
        @RequestParam to: String?,
        @RequestParam type: String?,
        @RequestParam format: String?,
    ): ResponseEntity<Flux<DataBuffer>> {
        val range = ReportRangeValidator.validate(from, to)
        val reportType = requiredEnum<ReportType>("type", type)
        val reportFormat = requiredEnum<ReportFormat>("format", format)

        val report = service.generate(principal, recruitId, range, reportType, reportFormat)

        val headers = HttpHeaders().apply {
            contentType = MediaType.parseMediaType(report.format.mediaType)
            contentDisposition = ContentDisposition.attachment().filename(report.filename).build()
            contentLength = report.bytes.size.toLong()
            if (report.feedbackOmitted) set(OMITTED_HEADER, "feedback")
        }
        return ResponseEntity.ok().headers(headers).body(chunks(report.bytes))
    }

    private fun chunks(bytes: ByteArray): Flux<DataBuffer> =
        Flux.range(0, (bytes.size + CHUNK_SIZE - 1) / CHUNK_SIZE)
            .map { i -> buffers.wrap(bytes.copyOfRange(i * CHUNK_SIZE, minOf(bytes.size, (i + 1) * CHUNK_SIZE))) }

    private inline fun <reified E : Enum<E>> requiredEnum(name: String, raw: String?): E =
        enumParam<E>(name, raw) ?: throw ApiException(
            ErrorCode.VALIDATION_FAILED,
            details = listOf(ErrorDetail(name, DetailCode.REQUIRED, "is required")),
        )

    companion object {
        const val OMITTED_HEADER = "X-Report-Omitted"
        private const val CHUNK_SIZE = 16 * 1024
    }
}
