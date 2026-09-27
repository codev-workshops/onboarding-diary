package com.onboardingdiary.assignment

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * Manager-scope check (REQ-FUNC-022, AUTHZ-ASSIGN). Every call hits the
 * database: a reassignment must take effect on the very next request, so
 * there is deliberately no cache of any kind here.
 */
@Component
class AssignmentGuard(private val assignments: AssignmentRepository) {

    suspend fun isActivelyAssigned(managerId: UUID, recruitId: UUID): Boolean =
        withContext(Dispatchers.IO) { assignments.existsActive(managerId, recruitId) }
}
