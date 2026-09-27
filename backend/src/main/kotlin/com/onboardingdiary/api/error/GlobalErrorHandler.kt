package com.onboardingdiary.api.error

import jakarta.validation.ConstraintViolation
import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.core.annotation.Order
import org.springframework.http.HttpStatus
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.stereotype.Component
import org.springframework.validation.FieldError
import org.springframework.web.server.MethodNotAllowedException
import org.springframework.web.server.ResponseStatusException
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.ServerWebInputException
import org.springframework.web.server.WebExceptionHandler
import org.springframework.web.bind.support.WebExchangeBindException
import reactor.core.publisher.Mono
import tools.jackson.databind.exc.InvalidFormatException
import tools.jackson.databind.exc.UnrecognizedPropertyException

/**
 * Maps every exception escaping a handler to the [ErrorResponse] envelope
 * (REQ-FUNC-090). Runs before Spring's default handlers (order -2) so no raw
 * Spring error body ever reaches a client; 5xx never leak stack traces.
 */
@Component
@Order(-2)
class GlobalErrorHandler(private val writer: ErrorResponseWriter) : WebExceptionHandler {

    private val log = LoggerFactory.getLogger(GlobalErrorHandler::class.java)

    override fun handle(exchange: ServerWebExchange, ex: Throwable): Mono<Void> {
        val path = exchange.request.path.value()
        return when (ex) {
            is ApiException -> writer.write(exchange, ex.code, ex.message ?: ex.code.defaultMessage, ex.details)

            is WebExchangeBindException -> writer.write(
                exchange, ErrorCode.VALIDATION_FAILED, details = ex.fieldErrors.map { it.toDetail() },
            )

            is ConstraintViolationException -> writer.write(
                exchange, ErrorCode.VALIDATION_FAILED, details = ex.constraintViolations.map { it.toDetail() },
            )

            is ServerWebInputException -> {
                val unknown = ex.findCause<UnrecognizedPropertyException>()
                val badValue = ex.findCause<InvalidFormatException>()
                when {
                    unknown != null -> writer.write(
                        exchange, ErrorCode.VALIDATION_FAILED,
                        details = listOf(
                            ErrorDetail(unknown.propertyName, DetailCode.NOT_ALLOWED, "is not an editable field"),
                        ),
                    )
                    badValue != null -> writer.write(
                        exchange, ErrorCode.VALIDATION_FAILED, details = listOf(badValue.toDetail()),
                    )
                    else -> writer.write(exchange, ErrorCode.MALFORMED_REQUEST)
                }
            }

            is AuthenticationException -> writer.write(exchange, ErrorCode.UNAUTHENTICATED)
            is AccessDeniedException -> writer.write(exchange, ErrorCode.FORBIDDEN)

            is MethodNotAllowedException -> writer.write(exchange, ErrorCode.NOT_FOUND)

            is ResponseStatusException -> when (ex.statusCode) {
                HttpStatus.NOT_FOUND -> writer.write(exchange, ErrorCode.NOT_FOUND)
                HttpStatus.BAD_REQUEST -> writer.write(exchange, ErrorCode.MALFORMED_REQUEST)
                HttpStatus.UNAUTHORIZED -> writer.write(exchange, ErrorCode.UNAUTHENTICATED)
                HttpStatus.FORBIDDEN -> writer.write(exchange, ErrorCode.FORBIDDEN)
                else -> internal(exchange, path, ex)
            }

            else -> internal(exchange, path, ex)
        }
    }

    private fun internal(exchange: ServerWebExchange, path: String, ex: Throwable): Mono<Void> {
        log.error("Unhandled error on {} {}", exchange.request.method, path, ex)
        return writer.write(exchange, ErrorCode.INTERNAL_ERROR)
    }

    private inline fun <reified T : Throwable> Throwable.findCause(): T? =
        generateSequence(this) { it.cause?.takeIf { c -> c !== it } }.filterIsInstance<T>().firstOrNull()

    private fun FieldError.toDetail() = ErrorDetail(
        field = field,
        code = detailCodeFor(code),
        message = defaultMessage ?: "is invalid",
    )

    /** A body field whose JSON value cannot be coerced (unknown enum constant, bad ISO date, ...). */
    private fun InvalidFormatException.toDetail(): ErrorDetail {
        val field = path.lastOrNull()?.propertyName ?: "body"
        val target = targetType
        return if (target != null && target.isEnum) {
            ErrorDetail(field, DetailCode.INVALID_ENUM, "must be one of ${target.enumConstants.map { it.toString() }}")
        } else {
            ErrorDetail(field, DetailCode.INVALID_FORMAT, "is not a valid ${target?.simpleName ?: "value"}")
        }
    }

    private fun ConstraintViolation<*>.toDetail() = ErrorDetail(
        field = propertyPath.toString().substringAfterLast('.'),
        code = detailCodeFor(constraintDescriptor.annotation.annotationClass.simpleName),
        message = message,
    )

    companion object {
        fun detailCodeFor(constraint: String?): String = when (constraint) {
            "NotNull", "NotBlank", "NotEmpty" -> DetailCode.REQUIRED
            "Size", "Length" -> DetailCode.TOO_LONG
            "Min", "Max", "Past", "PastOrPresent", "Future", "FutureOrPresent", "ValidStartDate", "ValidEntryDate" -> DetailCode.OUT_OF_RANGE
            "typeMismatch" -> DetailCode.INVALID_ENUM
            else -> DetailCode.INVALID_FORMAT
        }
    }
}
