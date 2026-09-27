package com.onboardingdiary.api.error

import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.server.ServerWebExchange
import reactor.core.publisher.Mono
import tools.jackson.databind.ObjectMapper

/** Serializes an [ErrorResponse] onto the exchange; shared by the exception handler and the security entry points. */
@Component
class ErrorResponseWriter(private val objectMapper: ObjectMapper) {

    fun write(
        exchange: ServerWebExchange,
        code: ErrorCode,
        message: String = code.defaultMessage,
        details: List<ErrorDetail> = emptyList(),
    ): Mono<Void> {
        val response = exchange.response
        if (response.isCommitted) return Mono.error(IllegalStateException("response already committed"))
        response.statusCode = code.status
        response.headers.contentType = MediaType.APPLICATION_JSON
        if (code.status.value() == 401) response.headers.set(HttpHeaders.WWW_AUTHENTICATE, "Bearer")
        val body = ErrorResponse(
            code = code,
            message = message,
            details = details,
            path = exchange.request.path.value(),
        )
        val bytes = objectMapper.writeValueAsBytes(body)
        return response.writeWith(Mono.just(response.bufferFactory().wrap(bytes)))
    }
}
