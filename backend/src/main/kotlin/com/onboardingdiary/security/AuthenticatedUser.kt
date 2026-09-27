package com.onboardingdiary.security

import com.onboardingdiary.user.Role
import com.onboardingdiary.user.User
import org.springframework.security.core.Authentication
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import java.util.UUID

/**
 * Request principal. Built on every request from the user row loaded by `sub`,
 * so `role` reflects the stored value, never the JWT claim.
 */
class AuthenticatedUser(val id: UUID, val email: String, val role: Role) : Authentication {

    constructor(user: User) : this(user.id, user.email, user.role)

    private val authorities = listOf(SimpleGrantedAuthority("ROLE_${role.name}"))

    override fun getName(): String = id.toString()
    override fun getAuthorities(): Collection<GrantedAuthority> = authorities
    override fun getCredentials(): Any? = null
    override fun getDetails(): Any? = null
    override fun getPrincipal(): Any = this
    override fun isAuthenticated(): Boolean = true
    override fun setAuthenticated(isAuthenticated: Boolean) {
        if (isAuthenticated) throw IllegalArgumentException("immutable")
    }

    override fun toString(): String = "AuthenticatedUser(id=$id, role=$role)"
}

/** Unverified bearer token as extracted from the `Authorization` header. */
class BearerToken(val token: String) : Authentication {
    override fun getName(): String = ""
    override fun getAuthorities(): Collection<GrantedAuthority> = emptyList()
    override fun getCredentials(): Any = token
    override fun getDetails(): Any? = null
    override fun getPrincipal(): Any? = null
    override fun isAuthenticated(): Boolean = false
    override fun setAuthenticated(isAuthenticated: Boolean) {}
    override fun toString(): String = "BearerToken(****)"
}
