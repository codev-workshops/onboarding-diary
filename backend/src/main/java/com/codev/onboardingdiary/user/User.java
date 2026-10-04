package com.codev.onboardingdiary.user;

import com.codev.onboardingdiary.common.AuditableEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;

/** Login account. Personal details live in {@link Profile}. */
@Entity
@Table(name = "users")
public class User extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(name = "password_hash", nullable = false, length = 100)
  private String passwordHash;

  @Column(nullable = false)
  private boolean enabled = true;

  @Column(name = "must_change_password", nullable = false)
  private boolean mustChangePassword;

  @Column(name = "failed_login_attempts", nullable = false)
  private int failedLoginAttempts;

  @Column(name = "locked_until")
  private Instant lockedUntil;

  @Column(name = "last_login_at")
  private Instant lastLoginAt;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
  @Enumerated(EnumType.STRING)
  @Column(name = "role", length = 20, nullable = false)
  private Set<Role> roles = EnumSet.noneOf(Role.class);

  protected User() {}

  public User(String email, String passwordHash, Set<Role> roles) {
    this.email = email;
    this.passwordHash = passwordHash;
    this.roles = EnumSet.copyOf(roles);
  }

  public boolean isLockedAt(Instant now) {
    return lockedUntil != null && lockedUntil.isAfter(now);
  }

  /** Records a failed login and locks the account once {@code maxAttempts} is reached. */
  public void registerFailedLogin(int maxAttempts, Instant lockUntil) {
    failedLoginAttempts++;
    if (failedLoginAttempts >= maxAttempts) {
      lockedUntil = lockUntil;
      failedLoginAttempts = 0;
    }
  }

  public void registerSuccessfulLogin(Instant now) {
    failedLoginAttempts = 0;
    lockedUntil = null;
    lastLoginAt = now;
  }

  /** Sets an admin-issued temporary password, which must be changed at the next login. */
  public void resetPassword(String temporaryPasswordHash) {
    passwordHash = temporaryPasswordHash;
    mustChangePassword = true;
    failedLoginAttempts = 0;
    lockedUntil = null;
  }

  public void changePassword(String newPasswordHash) {
    passwordHash = newPasswordHash;
    mustChangePassword = false;
  }

  public Long getId() {
    return id;
  }

  public String getEmail() {
    return email;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public boolean isMustChangePassword() {
    return mustChangePassword;
  }

  public void setMustChangePassword(boolean mustChangePassword) {
    this.mustChangePassword = mustChangePassword;
  }

  public Instant getLockedUntil() {
    return lockedUntil;
  }

  public Set<Role> getRoles() {
    return Set.copyOf(roles);
  }

  public void setRoles(Set<Role> roles) {
    this.roles.clear();
    this.roles.addAll(roles);
  }

  public Instant getLastLoginAt() {
    return lastLoginAt;
  }
}
