package com.onboardingdiary.api.auth

import com.onboardingdiary.security.AuthenticatedUser
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(private val authService: AuthService) {

    /** operationId: signup */
    @PostMapping("/signup")
    suspend fun signup(@Valid @RequestBody request: SignupRequest): AuthResponse = authService.signup(request)

    /** operationId: login */
    @PostMapping("/login")
    suspend fun login(@Valid @RequestBody request: LoginRequest): AuthResponse = authService.login(request)

    /** operationId: logout — stateless acknowledgement; the client discards its token. */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    suspend fun logout(@AuthenticationPrincipal principal: AuthenticatedUser) {
    }
}

@RestController
@RequestMapping("/api/v1/me")
class MeController(private val authService: AuthService) {

    /** operationId: getMyProfile */
    @GetMapping
    suspend fun getMyProfile(@AuthenticationPrincipal principal: AuthenticatedUser): UserProfile =
        authService.profile(principal.id)

    /** operationId: updateMyProfile */
    @PatchMapping
    suspend fun updateMyProfile(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @Valid @RequestBody request: ProfileUpdateRequest,
    ): UserProfile = authService.updateProfile(principal.id, request)

    /** operationId: changeMyPassword */
    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    suspend fun changeMyPassword(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @Valid @RequestBody request: ChangePasswordRequest,
    ) = authService.changePassword(principal.id, request)
}
