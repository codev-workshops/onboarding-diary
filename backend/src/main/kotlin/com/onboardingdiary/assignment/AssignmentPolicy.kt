package com.onboardingdiary.assignment

import com.onboardingdiary.api.error.AssignmentUnchangedException
import com.onboardingdiary.api.error.InvalidAssignmentPartyException
import com.onboardingdiary.user.Role
import com.onboardingdiary.user.User
import com.onboardingdiary.user.UserStatus
import java.util.UUID

/** What `POST /assignments` has to do given the recruit's current ACTIVE assignment. */
sealed interface AssignmentTransition {
    /** No ACTIVE assignment: insert. */
    data object Assign : AssignmentTransition

    /** ACTIVE assignment to another manager: end it and insert (REQ-FUNC-018). */
    data class Reassign(val previous: Assignment) : AssignmentTransition
}

/**
 * Pure assignment rules (INV-05, REQ-FUNC-016..018). No I/O so the state
 * transition and party validation are unit-testable.
 */
object AssignmentPolicy {

    /** Recruit must be an ACTIVE `NEW_RECRUIT`, manager an ACTIVE `MANAGER`, and they must differ. */
    fun validateParties(recruit: User, manager: User) {
        if (recruit.id == manager.id) {
            throw InvalidAssignmentPartyException("managerId", "manager must differ from recruit")
        }
        if (recruit.role != Role.NEW_RECRUIT || recruit.status != UserStatus.ACTIVE) {
            throw InvalidAssignmentPartyException("recruitId", "recruit must be an ACTIVE NEW_RECRUIT")
        }
        if (manager.role != Role.MANAGER || manager.status != UserStatus.ACTIVE) {
            throw InvalidAssignmentPartyException("managerId", "manager must be an ACTIVE MANAGER")
        }
    }

    /** Same manager already ACTIVE -> `409 ASSIGNMENT_UNCHANGED`. */
    fun transition(current: Assignment?, managerId: UUID): AssignmentTransition = when {
        current == null -> AssignmentTransition.Assign
        current.status != AssignmentStatus.ACTIVE -> AssignmentTransition.Assign
        current.managerId == managerId -> throw AssignmentUnchangedException()
        else -> AssignmentTransition.Reassign(current)
    }
}
