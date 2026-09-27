package com.onboardingdiary.config

import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent
import org.springframework.context.ApplicationListener

/**
 * Fails startup before any bean is created when no Spring profile is active
 * (REQ-FUNC-096). Registered in META-INF/spring.factories.
 */
class ProfileGuard : ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    override fun onApplicationEvent(event: ApplicationEnvironmentPreparedEvent) {
        val active = event.environment.activeProfiles
        if (active.isEmpty()) {
            throw IllegalStateException(MESSAGE)
        }
    }

    companion object {
        const val MESSAGE =
            "No active Spring profile. Set SPRING_PROFILES_ACTIVE to one of: dev, qa, prod."
    }
}
