package com.onboardingdiary.user

import com.onboardingdiary.security.BootstrapAdminProperties
import com.onboardingdiary.validation.EmailNormalizer
import com.onboardingdiary.validation.EmailValidator
import com.onboardingdiary.validation.PasswordPolicy
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component
import java.time.Instant

/**
 * Seeds the bootstrap Admin (ACTIVE) from APP_BOOTSTRAP_ADMIN_EMAIL/PASSWORD
 * when no ADMIN exists yet. Idempotent: a second start is a no-op. Runs
 * blocking on the startup thread (before the server accepts traffic).
 */
@Component
class BootstrapAdminRunner(
    private val users: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val props: BootstrapAdminProperties,
) : ApplicationRunner {

    private val log = LoggerFactory.getLogger(BootstrapAdminRunner::class.java)

    override fun run(args: ApplicationArguments) {
        if (users.countByRole(Role.ADMIN) > 0) {
            log.info("Bootstrap admin: an ADMIN already exists, nothing to do")
            return
        }
        val email = EmailNormalizer.normalize(props.email)
        val password = props.password
        if (email.isNullOrBlank() || password.isNullOrBlank()) {
            log.warn("Bootstrap admin: no ADMIN exists and APP_BOOTSTRAP_ADMIN_EMAIL/PASSWORD are not set; skipping")
            return
        }
        require(EmailValidator.isValidEmail(email)) { "APP_BOOTSTRAP_ADMIN_EMAIL is not a valid email address" }
        require(PasswordPolicy.isValid(password)) { "APP_BOOTSTRAP_ADMIN_PASSWORD: ${PasswordPolicy.MESSAGE}" }
        val admin = users.insert(
            email = email,
            passwordHash = passwordEncoder.encode(password),
            role = Role.ADMIN,
            status = UserStatus.ACTIVE,
            fullName = props.fullName,
            department = null,
            startDate = null,
            createdById = null,
            activatedAt = Instant.now(),
        )
        log.info("Bootstrap admin created with id {}", admin.id)
    }
}
