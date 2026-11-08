# 0003 — Demo mode on both sides

Date: 2026-11-08 · Status: accepted

## Context

The first version must be clickable by anyone the owner hands it to (a candidate, a developer, a teacher) without a Firebase
project, an SMTP account or a server. It also has to be the same product that later runs for real.

## Decision

- **Frontend**: one `EllpApi` interface with two implementations. `demoApi` keeps every collection in memory, persists to
  `localStorage`, and runs the full gamification engine; `liveApi` calls the C# API with a Firebase ID token. `VITE_USE_DEMO`
  picks one at build time; pages cannot tell them apart.
- **Backend**: `IEllpStore` with `InMemoryStore` (seeded) and `FirestoreStore`; `ICurrentUser` with a Development-only
  `X-Demo-User` header mode next to Firebase tokens; `IEmailService` with a log-only sender next to SMTP. Outside Development the
  API refuses the demo store and the demo header (fail closed).
- The seed data (ids, names, progress) is the same on both sides so a story told in the demo can be re-told against the API.

## Consequences

- The gamification rules exist twice (TS, C#) and are pinned by tests; the demo store and `ProgressService` mirror each other
  method by method.
- The demo says what it fakes: "Mark as watched (demo)" and the footer's demo badge.
- Progress in the demo is per browser; "Reset demo data" is in Admin › Settings.
