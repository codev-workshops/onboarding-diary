package com.onboardingdiary.validation

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource

class EmailValidatorTest {

    @ParameterizedTest
    @ValueSource(
        strings = [
            "jane@example.com",
            "  Jane.Doe@Example.COM ",
            "first+tag@sub.domain.org",
            "o'reilly@example.co.uk",
            "x@a-b.io",
        ],
    )
    fun `accepts valid addresses (after normalization)`(email: String) {
        assertTrue(EmailValidator.isValidEmail(email), email)
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "",
            "   ",
            "plainaddress",
            "@example.com",
            "jane@",
            "jane@localhost",
            "jane@@example.com",
            "ja ne@example.com",
            "jane@exa mple.com",
            ".jane@example.com",
            "jane.@example.com",
            "ja..ne@example.com",
            "jane@-example.com",
            "jane@example-.com",
            "jane@example..com",
            "jane@example.c-",
        ],
    )
    fun `rejects invalid addresses`(email: String) {
        assertFalse(EmailValidator.isValidEmail(email), email)
    }

    @org.junit.jupiter.api.Test
    fun `rejects addresses longer than 254 characters`() {
        val local = "a".repeat(64)
        val domain = (1..4).joinToString(".") { "b".repeat(60) } + ".com"
        val email = "$local@$domain"
        assertTrue(email.length > 254)
        assertFalse(EmailValidator.isValidEmail(email))
    }
}
