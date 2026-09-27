package com.onboardingdiary.api.auth

import com.onboardingdiary.api.error.AccountAlreadyActivatedException
import com.onboardingdiary.api.error.InvalidCredentialsException
import com.onboardingdiary.api.error.InvalidCurrentPasswordException
import com.onboardingdiary.api.error.NotInvitedException
import com.onboardingdiary.api.error.UnauthenticatedException
import com.onboardingdiary.security.JwtService
import com.onboardingdiary.user.User
import com.onboardingdiary.user.UserRepository
import com.onboardingdiary.user.UserStatus
import com.onboardingdiary.validation.EmailNormalizer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class AuthService(
    private val users: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
) {
    private val log = LoggerFactory.getLogger(AuthService::class.java)

    /** Hash of a random secret, only used to equalise timing when the looked-up user has no hash. */
    private val dummyHash: String by lazy { passwordEncoder.encode(UUID.randomUUID().toString())!! }

    private suspend fun encode(raw: String): String = withContext(Dispatchers.Default) { passwordEncoder.encode(raw)!! }

    private suspend fun matches(raw: String, hash: String): Boolean =
        withContext(Dispatchers.Default) { passwordEncoder.matches(raw, hash) }

    /** Completes an INVITED account (REQ-FUNC-001/001a). Never creates a user. */
    suspend fun signup(request: SignupRequest): AuthResponse {
        val email = EmailNormalizer.normalize(request.email)!!
        val hash = encode(request.password!!)
        val activated = withContext(Dispatchers.IO) {
            val user = users.findByEmail(email) ?: throw NotInvitedException()
            if (user.status != UserStatus.INVITED) throw AccountAlreadyActivatedException()
            users.activate(
                id = user.id,
                passwordHash = hash,
                fullName = request.fullName?.trim(),
                department = request.department?.trim()?.takeIf { it.isNotEmpty() },
                startDate = request.startDate,
            ) ?: throw AccountAlreadyActivatedException()
        }
        log.info("User {} completed signup", activated.id)
        return authResponse(activated)
    }

    /** Uniform 401 for unknown email, INVITED, DEACTIVATED or wrong password (REQ-FUNC-005). */
    suspend fun login(request: LoginRequest): AuthResponse {
        val email = EmailNormalizer.normalize(request.email)!!
        val user = withContext(Dispatchers.IO) { users.findByEmail(email) }
        val hash = user?.passwordHash
        val matches = if (hash != null) {
            matches(request.password!!, hash)
        } else {
            matches(request.password!!, dummyHash)
            false
        }
        if (user == null || !matches || user.status != UserStatus.ACTIVE) {
            log.info("Login failed")
            throw InvalidCredentialsException()
        }
        log.info("User {} logged in", user.id)
        return authResponse(user)
    }

    suspend fun profile(userId: UUID): UserProfile = withContext(Dispatchers.IO) {
        val user = users.findById(userId) ?: throw UnauthenticatedException()
        toProfile(user)
    }

    suspend fun updateProfile(userId: UUID, request: ProfileUpdateRequest): UserProfile = withContext(Dispatchers.IO) {
        val user = users.findById(userId) ?: throw UnauthenticatedException()
        val updated = users.updateProfile(
            id = user.id,
            fullName = request.fullName?.trim() ?: user.fullName,
            department = when (val d = request.department) {
                null -> user.department
                else -> d.map { it.trim() }.filter { it.isNotEmpty() }.orElse(null)
            },
            startDate = when (val s = request.startDate) {
                null -> user.startDate
                else -> s.orElse(null)
            },
        )
        toProfile(updated)
    }

    suspend fun changePassword(userId: UUID, request: ChangePasswordRequest) {
        val user = withContext(Dispatchers.IO) { users.findById(userId) } ?: throw UnauthenticatedException()
        val current = user.passwordHash ?: throw UnauthenticatedException()
        if (!matches(request.currentPassword!!, current)) throw InvalidCurrentPasswordException()
        val newHash = encode(request.newPassword!!)
        withContext(Dispatchers.IO) { users.updatePasswordHash(user.id, newHash) }
        log.info("User {} changed password", user.id)
    }

    private fun toProfile(user: User): UserProfile {
        val createdBy = user.createdById?.let { users.findById(it) }
        return UserProfile.from(user, createdBy)
    }

    private suspend fun authResponse(user: User): AuthResponse {
        val issued = jwtService.issue(user.id, user.email, user.role)
        val profile = withContext(Dispatchers.IO) { toProfile(user) }
        return AuthResponse(issued.token, issued.expiresAt, profile)
    }
}
