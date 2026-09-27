package com.onboardingdiary.validation

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import java.time.LocalDate
import kotlin.reflect.KClass

/** Start date may be in the past or at most one year in the future (US-03). */
@Target(AnnotationTarget.FIELD, AnnotationTarget.VALUE_PARAMETER, AnnotationTarget.PROPERTY_GETTER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [StartDateValidator::class])
annotation class ValidStartDate(
    val message: String = "must not be more than one year in the future",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = [],
)

class StartDateValidator : ConstraintValidator<ValidStartDate, LocalDate?> {
    override fun isValid(value: LocalDate?, context: ConstraintValidatorContext): Boolean =
        value == null || !value.isAfter(LocalDate.now().plusYears(1))
}
