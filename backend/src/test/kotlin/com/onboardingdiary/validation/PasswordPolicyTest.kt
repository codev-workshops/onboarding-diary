package com.onboardingdiary.validation

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource

class PasswordPolicyTest {

    @ParameterizedTest
    @ValueSource(strings = ["abcdefghi1", "Password123!", "1234567890a", "x1x1x1x1x1", "  spaces ok 1"])
    fun `accepts 10-128 chars with a letter and a digit`(password: String) {
        assertTrue(PasswordPolicy.isValid(password), password)
    }

    @Test
    fun `accepts exactly 128 characters`() {
        assertTrue(PasswordPolicy.isValid("a1" + "x".repeat(126)))
    }

    @ParameterizedTest
    @ValueSource(strings = ["", "short1", "abcdefghi", "abcdefghijk", "1234567890", "!!!!!!!!!!1", "!!!!!!!!!!a"])
    fun `rejects too short or missing letter or digit`(password: String) {
        assertFalse(PasswordPolicy.isValid(password), password)
    }

    @Test
    fun `rejects more than 128 characters`() {
        assertFalse(PasswordPolicy.isValid("a1" + "x".repeat(127)))
    }

    @Test
    fun `rejects null`() {
        assertFalse(PasswordPolicy.isValid(null))
    }
}
