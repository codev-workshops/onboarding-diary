package com.onboardingdiary.entry

import com.onboardingdiary.api.error.InvalidStateTransitionException

/**
 * Generic, pure lifecycle for an entry status enum. Each slice declares its
 * allowed edges once (`TaskStateMachine`, later `IssueStateMachine`, ...); a
 * self-transition is always allowed so a PUT that does not touch `status`
 * never fails. Disallowed edges surface as `422 INVALID_STATE_TRANSITION`.
 */
class StateMachine<S : Enum<S>>(private val transitions: Map<S, Set<S>>) {

    fun allowedFrom(from: S): Set<S> = transitions[from].orEmpty()

    fun canTransition(from: S, to: S): Boolean = from == to || to in allowedFrom(from)

    fun requireTransition(from: S, to: S) {
        if (!canTransition(from, to)) throw InvalidStateTransitionException(from.name, to.name)
    }
}
