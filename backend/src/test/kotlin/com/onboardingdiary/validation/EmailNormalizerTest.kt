package com.onboardingdiary.validation

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class EmailNormalizerTest {

    @Test
    fun `trims and lowercases`() {
        assertEquals("jane.doe@example.com", EmailNormalizer.normalize("  Jane.Doe@Example.COM  "))
    }

    @Test
    fun `already normalized input is unchanged`() {
        assertEquals("a@b.co", EmailNormalizer.normalize("a@b.co"))
    }

    @Test
    fun `null stays null`() {
        assertNull(EmailNormalizer.normalize(null))
    }

    @Test
    fun `inner whitespace is preserved for the validator to reject`() {
        assertEquals("a b@c.com", EmailNormalizer.normalize(" A B@C.COM"))
    }
}
