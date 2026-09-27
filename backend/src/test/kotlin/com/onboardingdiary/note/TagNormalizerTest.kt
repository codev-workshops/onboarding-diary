package com.onboardingdiary.note

import com.onboardingdiary.api.error.ApiException
import com.onboardingdiary.api.error.DetailCode
import com.onboardingdiary.api.error.ErrorCode
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class TagNormalizerTest {

    @Test
    fun `trims lowercases and dedupes preserving first occurrence order (US-10)`() {
        assertEquals(listOf("kotlin", "setup"), TagNormalizer.normalize(listOf("Kotlin", " setup ")))
        assertEquals(listOf("kotlin", "setup"), TagNormalizer.normalize(listOf("Kotlin", "setup", "KOTLIN", " kotlin")))
    }

    @Test
    fun `null or empty means no tags`() {
        assertEquals(emptyList<String>(), TagNormalizer.normalize(null))
        assertEquals(emptyList<String>(), TagNormalizer.normalize(emptyList()))
    }

    @Test
    fun `pattern accepts lowercase alphanumerics and dashes up to 30 chars`() {
        assertTrue(TagNormalizer.isValid("a"))
        assertTrue(TagNormalizer.isValid("spring-boot-4"))
        assertTrue(TagNormalizer.isValid("a".repeat(30)))
        assertFalse(TagNormalizer.isValid(""))
        assertFalse(TagNormalizer.isValid("-leading-dash"))
        assertFalse(TagNormalizer.isValid("has space"))
        assertFalse(TagNormalizer.isValid("under_score"))
        assertFalse(TagNormalizer.isValid("a".repeat(31)))
    }

    @Test
    fun `tag with spaces inside is 400 VALIDATION_FAILED on tags`() {
        val e = assertThrows<ApiException> { TagNormalizer.normalize(listOf("ok", "not ok")) }
        assertEquals(ErrorCode.VALIDATION_FAILED, e.code)
        assertEquals(1, e.details.size)
        assertEquals("tags[1]", e.details[0].field)
        assertEquals(DetailCode.INVALID_FORMAT, e.details[0].code)
    }

    @Test
    fun `more than ten distinct tags is 400 VALIDATION_FAILED on tags`() {
        assertEquals(10, TagNormalizer.normalize((1..10).map { "t$it" }).size)
        val e = assertThrows<ApiException> { TagNormalizer.normalize((1..11).map { "t$it" }) }
        assertEquals(ErrorCode.VALIDATION_FAILED, e.code)
        assertEquals("tags", e.details.single().field)
        assertEquals(DetailCode.OUT_OF_RANGE, e.details.single().code)
    }

    @Test
    fun `duplicates collapse before the count limit applies`() {
        assertEquals(10, TagNormalizer.normalize((1..10).map { "t$it" } + "T1" + " t2 ").size)
    }

    @Test
    fun `filter tag is normalized, blank is no filter, invalid is 400 on tag`() {
        assertEquals("kotlin", TagNormalizer.normalizeFilter(" Kotlin "))
        assertNull(TagNormalizer.normalizeFilter(null))
        assertNull(TagNormalizer.normalizeFilter("   "))
        val e = assertThrows<ApiException> { TagNormalizer.normalizeFilter("bad tag") }
        assertEquals("tag", e.details.single().field)
    }
}
