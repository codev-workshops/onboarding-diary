package com.onboardingdiary.validation

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.reflect.KClass

/** Entry dates may not be in the future: server date in UTC plus one day of time-zone tolerance (INV-09). */
@Target(AnnotationTarget.FIELD, AnnotationTarget.VALUE_PARAMETER, AnnotationTarget.PROPERTY_GETTER, AnnotationTarget.TYPE)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [EntryDateValidator::class])
annotation class ValidEntryDate(
    val message: String = "must not be in the future",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = [],
)

class EntryDateValidator : ConstraintValidator<ValidEntryDate, LocalDate?> {
    override fun isValid(value: LocalDate?, context: ConstraintValidatorContext): Boolean =
        value == null || !value.isAfter(latestAllowed())

    companion object {
        fun latestAllowed(): LocalDate = LocalDate.now(ZoneOffset.UTC).plusDays(1)
    }
}
