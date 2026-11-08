# 0001 — Stack and scope of V1.0.0

Date: 2026-11-08 · Status: accepted

## Context

The owner wants a gamified English-through-video platform (ELLP) to hand to developers or candidates as a working brief, in
C#, React-TypeScript and Firebase, versioned on GitHub from V1.0.0, with the look of the TMCL-PR platform and a clear split
between learners and admins. The first version is a click-through demo, not a production system.

## Decision

- **Frontend** React 19 + TypeScript + Vite with TMCL-PR's design tokens, i18n and UI conventions copied in (not a shared package:
  the two repositories evolve apart; see TMCL-PR CLAUDE.md on copying code).
- **Backend** ASP.NET Core 9 Web API in TMCL-PR's module shape, with a store interface (`IEllpStore`) so the in-memory store and
  Firestore are interchangeable.
- **Firebase** for Authentication and Firestore; the API is the only Firestore client (Admin SDK). Hosting is optional.
- **Scope of 1.0.0**: both worlds complete on fictional data; gamification rules implemented and tested on both sides; multi-tenant
  owners; email replies with a test-mode guard; documentation for handover. Not in scope: real YouTube position tracking,
  Firebase exercised against a real project, UI tests, parent accounts, billing.

## Consequences

- Two copies of the rules (TS and C#) must be changed together; the tests pin the numbers.
- The demo is honest about what it fakes (the "mark as watched" button says so).
- Versioning follows TMCL-PR's releasing.md order (1.0.0 → 1.0.9 → 1.1.0).
