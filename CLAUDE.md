# ELLP — English Learning Language Platform

Gamified English learning through video (XP, levels, quests, leaderboard), two worlds (learner `/app`, admin `/admin`), many
owners (tenants). Stack: React 19 + TypeScript (Vite), C# ASP.NET Core 9, Firebase (Auth, Firestore). Look and conventions come
from the TMCL-PR platform (`D:\Ritz\TMCL-PR`), copied in, not shared.

Docs: `docs/architecture.md`, `docs/data-model.md`, `docs/gamification.md`, `docs/dev-setup.md`, `docs/roadmap.md`,
`docs/handover.md`, `docs/decisions/` (add a new numbered file for every important decision; never rewrite an old one).

## Working with the owner

- Communicate, explain and ask in Thai; English for code, comments, database names, commits and error messages.
- Explain logic and impact before writing code; when there are options, compare them and let the owner choose.
- Do not change agreed requirements or architecture on your own; raise the problem and propose first.
- Report honestly: failed tests with output, skipped steps named, nothing called done that was not checked.
- Commit messages in English, one small change each; do not push until told.

## Rules

- No secrets in the repository (SMTP password, service-account JSON, Firebase private config): environment variables and
  `appsettings.Production.json` (git-ignored). Public Firebase web config goes in `.env.local`, not in git.
- No real personal data in seed, tests or docs: every name, school and email is fictional (`*.example.com`).
- Email: test mode stays on (`Email:GlobalTestMode` and the tenant switch) until the owner says otherwise; never send real mail
  from a development machine.
- No emoji as icons: Octicons via `constants/icons.ts`. No hex colours in components: tokens in `styles/tokens.css`.
- No text a person reads in code: `{ th, en }` in `frontend/src/i18n/dict.ts` or in the data.
- Children's data: the birth year only (never a date), fictional seed only; the parent acknowledgement is a record, not yet verified consent (decision 0004).
- The integrity rules live twice too (`frontend/src/lib/integrity.ts`, `backend/.../Modules/Integrity/IntegrityRules.cs`); the media signing key is `MEDIA_SIGNING_KEY` (Development has a built-in one).
- The plan rules live twice too (`frontend/src/lib/access.ts`, `backend/.../Modules/Access/PlanRules.cs`); public endpoints strip quiz answers.
- The gamification rules live twice (`frontend/src/lib/gamification.ts`, `backend/.../GamificationRules.cs`): change both and
  the tests in the same commit.

## Commands

```powershell
cd frontend; npm ci; npm run dev                                   # http://localhost:5174 (demo mode)
cd frontend; npx tsc --noEmit; npm run build
dotnet run --project backend/Ellp.Api                              # http://localhost:5220/swagger (X-Demo-User header)
dotnet build backend/Ellp.sln -c Release
dotnet test backend/Ellp.Api.Tests/Ellp.Api.Tests.csproj -c Release
```

## Code conventions

- Backend: `Modules/<Name>/<Name>Controller.cs`, `<Name>Service.cs`; rules as pure static classes with tests in
  `Ellp.Api.Tests/`. Every endpoint answers `ApiResponse<T>`; the client branches on `code`.
- Store access only through `IEllpStore`; auth only through `ICurrentUser`; tenant checks through `RoleRules.CanManageOwner`.
- Frontend: pages call `api` from `services/index.ts` only; new pages live in `modules/learn` or `modules/admin`; new icons are
  added to `constants/icons.ts`; new strings to `i18n/dict.ts`.
- Versioning: `frontend/package.json` and `Ellp.Api.csproj` `<Version>` move together; releases are `vX.Y.Z` tags with notes.

## Open items

See `docs/roadmap.md`. Next: 1.2.x hardening (HLS, Playwright) and 1.3 payment, certificates, mock tests, DRM.
