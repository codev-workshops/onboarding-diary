package com.onboardingdiary.security

import com.onboardingdiary.api.error.ForbiddenException
import com.onboardingdiary.user.Role

/**
 * Endpoint role check (AUTHZ-ROLE). [AuthenticatedUser.role] is the value
 * loaded from the DB for this request, never the JWT claim.
 */
fun AuthenticatedUser.requireRole(vararg allowed: Role) {
    if (role !in allowed) throw ForbiddenException()
}
