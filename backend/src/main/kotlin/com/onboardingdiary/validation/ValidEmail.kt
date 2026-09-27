package com.onboardingdiary.validation

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import kotlin.reflect.KClass

/**
 * RFC-5322-style email (REQ-FUNC-002): non-empty local part, a single `@`,
 * a domain with at least one dot, no whitespace, max 254 chars. The value is
 * normalized (trim + lowercase) before it is checked.
 */
@Target(AnnotationTarget.FIELD, AnnotationTarget.VALUE_PARAMETER, AnnotationTarget.PROPERTY_GETTER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [EmailValidator::class])
annotation class ValidEmail(
    val message: String = "must be a valid email address",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = [],
)

class EmailValidator : ConstraintValidator<ValidEmail, String?> {
    override fun isValid(value: String?, context: ConstraintValidatorContext): Boolean {
        if (value == null) return true // presence is @NotBlank's job
        return isValidEmail(value)
    }

    companion object {
        const val MAX_LENGTH = 254
        private val LOCAL = Regex("^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$")
        private val LABEL = Regex("^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$")

        fun isValidEmail(raw: String): Boolean {
            val email = EmailNormalizer.normalize(raw) ?: return false
            if (email.isEmpty() || email.length > MAX_LENGTH) return false
            if (email.any { it.isWhitespace() }) return false
            val at = email.indexOf('@')
            if (at <= 0 || at != email.lastIndexOf('@') || at == email.length - 1) return false
            val local = email.substring(0, at)
            val domain = email.substring(at + 1)
            if (local.length > 64 || !LOCAL.matches(local)) return false
            val labels = domain.split('.')
            if (labels.size < 2) return false
            return labels.all { LABEL.matches(it) }
        }
    }
}
