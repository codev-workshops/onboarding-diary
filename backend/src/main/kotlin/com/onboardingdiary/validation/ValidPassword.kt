package com.onboardingdiary.validation

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import kotlin.reflect.KClass

/** Password policy (REQ-FUNC-004): 10–128 chars, at least one letter and one digit. */
object PasswordPolicy {
    const val MIN_LENGTH = 10
    const val MAX_LENGTH = 128
    const val MESSAGE = "must be 10-128 characters and contain at least one letter and one digit"

    fun isValid(password: String?): Boolean {
        if (password == null) return false
        if (password.length !in MIN_LENGTH..MAX_LENGTH) return false
        return password.any { it.isLetter() } && password.any { it.isDigit() }
    }
}

@Target(AnnotationTarget.FIELD, AnnotationTarget.VALUE_PARAMETER, AnnotationTarget.PROPERTY_GETTER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [PasswordValidator::class])
annotation class ValidPassword(
    val message: String = PasswordPolicy.MESSAGE,
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = [],
)

class PasswordValidator : ConstraintValidator<ValidPassword, String?> {
    override fun isValid(value: String?, context: ConstraintValidatorContext): Boolean =
        value == null || PasswordPolicy.isValid(value)
}
