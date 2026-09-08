# 10. No outbound email in the MVP

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

Early drafts included self-service password reset, and the extension list proposed a weekly
digest to managers. Both require a mail transport, deliverability configuration, and tokens
stored server-side. The project owner ruled real email delivery out of scope.

## Decision

The MVP sends **no email**. There is no self-service password reset, no email verification, no
weekly digest, and no mailer abstraction. An authenticated user can change their own password;
account recovery beyond that is handled out of band by an admin.

## Consequences

- No SMTP configuration, no reset-token table, and no delivery failure modes to handle.
- A user who forgets their password cannot recover it through the application.
- Notifications, if wanted later, are in-app only unless a new ADR reverses this.

## Alternatives considered

- **Stubbed mailer that logs messages** — keeps the reset flow implementable, but it still
  requires reset tokens and expiry handling, and was ruled out with the rest of the email scope.
