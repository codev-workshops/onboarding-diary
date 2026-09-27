package com.onboardingdiary.api.error

/**
 * Domain / application error mapped 1:1 to an [ErrorCode]. Thrown from
 * services; rendered by [GlobalErrorHandler].
 */
open class ApiException(
    val code: ErrorCode,
    message: String = code.defaultMessage,
    val details: List<ErrorDetail> = emptyList(),
) : RuntimeException(message)

class NotInvitedException : ApiException(ErrorCode.NOT_INVITED)
class AccountAlreadyActivatedException : ApiException(ErrorCode.ACCOUNT_ALREADY_ACTIVATED)
class InvalidCredentialsException : ApiException(ErrorCode.INVALID_CREDENTIALS)
class UnauthenticatedException(message: String = ErrorCode.UNAUTHENTICATED.defaultMessage) :
    ApiException(ErrorCode.UNAUTHENTICATED, message)
class ForbiddenException : ApiException(ErrorCode.FORBIDDEN)
class NotFoundException : ApiException(ErrorCode.NOT_FOUND)
class InvalidCurrentPasswordException : ApiException(
    ErrorCode.INVALID_CURRENT_PASSWORD,
    details = listOf(ErrorDetail("currentPassword", DetailCode.INVALID_FORMAT, "does not match the current password")),
)
