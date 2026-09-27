package com.onboardingdiary.api.paging

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class PageRequestTest {
    private val whitelist = SortWhitelist(mapOf("name" to "name"), Sort("name", SortDirection.ASC))

    @Test
    fun `offset does not overflow for large page numbers`() {
        val request = PageRequest.parse(page = 21_474_837, size = 100, sort = null, whitelist = whitelist)
        assertEquals(2_147_483_700L, request.offset)
    }

    @Test
    fun `offset is page times size`() {
        assertEquals(40L, PageRequest.parse(page = 2, size = 20, sort = null, whitelist = whitelist).offset)
    }
}
