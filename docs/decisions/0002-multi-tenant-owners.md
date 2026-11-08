# 0002 — Owners as tenants, four roles

Date: 2026-11-08 · Status: accepted

## Context

The brief asks for many users, many programs ("many teaching media"), admins who can add or remove owners, control divided by
who uses the system, and email replies to users.

## Decision

An **owner** is a tenant: a school, a publisher or a family. Everything content- or people-related carries an `ownerId`
(lessons through their program). Four roles, one per account:

| Role | Scope | May |
|---|---|---|
| `superadmin` | platform | everything, for every owner; add/remove owners |
| `owner` | one owner | everything an admin may, plus make admins and owners |
| `admin` | one owner | programs, lessons, quests, learners, inbox, mail log, settings |
| `learner` | one owner | learn; see only published content of their owner; write to the inbox |

Email settings (from name/address, reply-to, test mode, allow-list) are per owner, because each school writes to its own parents.
The SMTP connection and password are server-wide (environment), never per tenant.

## Alternatives considered

- *One admin for everything* — too small for "many owners".
- *Programs shared across owners (marketplace)* — valuable, but a 1.2 feature (roadmap); the model allows it later by adding a
  licence collection rather than changing `ownerId`.
- *Firestore rules per tenant for client reads* — would duplicate the role logic; the API is the single enforcement point for now.

## Consequences

- The admin console has a tenant scope in its header (fixed for staff, a picker for the Super Admin).
- Removing an owner removes its programs, lessons, quests, members and messages (the UI warns).
