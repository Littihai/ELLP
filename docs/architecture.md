# Architecture

```
 Browser (React + TS, Vite)
 ┌──────────────────────────────────────────────────────────────┐
 │  /login  → LearnerShell  → Home · Programs · Lesson · Quests │
 │                            Leaderboard · Profile · Contact   │
 │  /admin/login → AdminShell → Dashboard · Owners · Programs   │
 │                            Lessons · Quests · Members · Inbox│
 │                            Mail log · Settings               │
 │                                                              │
 │  services/api.ts  (EllpApi interface)                        │
 │     ├─ demoStore.ts   in-memory + localStorage  (VITE_USE_DEMO=true)
 │     └─ liveApi.ts     fetch /api/v1/*  + Firebase Auth token │
 └──────────────┬───────────────────────────────┬───────────────┘
                │ ID token (Bearer)             │ sign-in
                ▼                               ▼
 ┌──────────────────────────────┐     ┌─────────────────────┐
 │  C# ASP.NET Core 9 Web API   │     │  Firebase Auth      │
 │  Modules/                    │     └─────────────────────┘
 │   Content (catalog)          │
 │   Progress (watch, quiz,     │  IEllpStore
 │     leaderboard, rules)      │────┬─ InMemoryStore (dev, seeded)
 │   Inbox (messages, replies)  │    └─ FirestoreStore (Admin SDK) ──► Cloud Firestore
 │   Tenants (admin, owners)    │
 │   Health                     │  IEmailService
 │  Shared/ Api · Auth · Data · │────┬─ SmtpEmailService (MailKit, test-mode guard)
 │          Email               │    └─ LogOnlyEmailService (dev)
 └──────────────────────────────┘
```

## Principles (carried over from TMCL-PR)

- **One envelope**: every API answer is `ApiResponse<T>` with `success`, `message`, `data`, `code`. The client branches on `code`.
- **Rules are pure**: `GamificationRules`, `EmailGuardRules`, `RoleRules` are static classes with no I/O and have xUnit tests. The
  frontend has the same rules in `lib/gamification.ts`, so the demo behaves like the server.
- **One data door**: pages call `api` (`services/index.ts`), which is either the demo store or the live API. A page never knows which.
- **Tokens, not hex**: colours, radii and type live in `styles/tokens.css` (copied from TMCL-PR). Light/dark is one attribute on `<html>`.
- **No text in code**: every string a person reads is a `{ th, en }` pair in `i18n/dict.ts` or in the data.
- **Icons are Octicons**: no emoji as icons.
- **Secrets in the environment**: `EMAIL_PASSWORD`, `GOOGLE_APPLICATION_CREDENTIALS`; `appsettings.Production.json` is git-ignored.
- **Fail closed**: outside Development the API refuses `Auth:Mode=Demo` and `Store:Mode=InMemory`.

## Request flow (live mode)

1. The browser signs in with Firebase Auth (email/password) and receives an ID token.
2. `POST /api/v1/auth/session` with the token: the API validates it against Google's keys (issuer `securetoken.google.com/<project>`),
   finds `users/<uid>` or creates a learner profile; an admin-created member is matched by email and moved to the Firebase uid.
3. Every later call carries the token; `ICurrentUser` resolves the profile once per request.
4. Learner activities (`/me/watch`, `/me/quiz`) go through `ProgressService`, which applies the rules and writes XP events,
   progress, quest progress and the profile.
5. A staff reply (`/admin/inbox/{id}/reply`) goes through `InboxService` → `IEmailService`: the tenant's email settings decide
   test mode and the allow-list; the outcome is written to `mailLog`.

## Authorisation

`RoleRules`: a learner reads their tenant's published content and their own data; an admin manages their tenant's content, learners
and inbox; an owner also makes admins; the Super Admin does everything for every tenant. Every admin endpoint resolves the tenant
of the thing being touched and checks `CanManageOwner`.

## Where the code is

| Area | Frontend | Backend |
|---|---|---|
| Types / models | `src/types/index.ts` | `Shared/Models.cs` |
| Rules | `src/lib/gamification.ts` | `Modules/Progress/GamificationRules.cs`, `Shared/Email/EmailService.cs` (guard), `Shared/Auth/CurrentUser.cs` (roles) |
| Data door | `src/services/{api,demoStore,liveApi,firebase}.ts` | `Shared/Data/{IEllpStore,InMemoryStore,FirestoreStore,SeedData}.cs` |
| Learner | `src/modules/learn/*` | `Modules/Progress/MeController.cs`, `Modules/Content/CatalogController.cs` |
| Admin | `src/modules/admin/*` | `Modules/Tenants/{AdminController,OwnersController}.cs`, `Modules/Inbox/InboxService.cs` |
| Frames | `src/layouts/{LearnerShell,AdminShell,Guards}.tsx` | `Program.cs` |
| Seed | `src/data/seed.ts` | `Shared/Data/SeedData.cs` |
