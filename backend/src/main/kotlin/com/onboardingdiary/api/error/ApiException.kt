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
class NotAssignedException : ApiException(ErrorCode.NOT_ASSIGNED)
class InvalidStateTransitionException(from: String, to: String) : ApiException(
    ErrorCode.INVALID_STATE_TRANSITION,
    details = listOf(ErrorDetail("status", DetailCode.INVALID_TRANSITION, "cannot move from $from to $to")),
)
class NotFoundException : ApiException(ErrorCode.NOT_FOUND)
class EmailAlreadyExistsException : ApiException(
    ErrorCode.EMAIL_ALREADY_EXISTS,
    details = listOf(ErrorDetail("email", DetailCode.INVALID_FORMAT, "is already registered")),
)
class EmailLockedException : ApiException(
    ErrorCode.EMAIL_LOCKED,
    details = listOf(ErrorDetail("email", DetailCode.NOT_ALLOWED, "can only be changed while the user is INVITED")),
)
class CannotDeactivateSelfException : ApiException(ErrorCode.CANNOT_DEACTIVATE_SELF)
class RoleChangeBlockedByAssignmentException : ApiException(
    ErrorCode.ROLE_CHANGE_BLOCKED_BY_ASSIGNMENT,
    details = listOf(ErrorDetail("role", DetailCode.INVALID_TRANSITION, "user is a party to an ACTIVE assignment")),
)
class InvalidAssignmentPartyException(field: String, message: String) : ApiException(
    ErrorCode.INVALID_ASSIGNMENT_PARTY,
    details = listOf(ErrorDetail(field, DetailCode.INVALID_TRANSITION, message)),
)
class AssignmentUnchangedException : ApiException(ErrorCode.ASSIGNMENT_UNCHANGED)
class ConflictException : ApiException(ErrorCode.CONFLICT)
class InvalidCurrentPasswordException : ApiException(
    ErrorCode.INVALID_CURRENT_PASSWORD,
    details = listOf(ErrorDetail("currentPassword", DetailCode.INVALID_FORMAT, "does not match the current password")),
)
