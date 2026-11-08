# Contributing — rules of this repository

How ELLP is built and what every change must respect. Read with [architecture.md](architecture.md) and [handover.md](handover.md).

## Working with the owner

- Communication with the owner is in Thai; code, comments, database names, commits and error messages are in English.
- Explain the logic and the impact before writing code; when there are options, compare them and let the owner choose.
- Do not change agreed requirements or architecture on your own; raise the problem and propose first.
- Report honestly: failed tests with their output, skipped steps named, nothing called done that was not checked.
- Commit messages in English, one small change each. Releases are `vX.Y.Z` tags with notes; `frontend/package.json` and
  `backend/Ellp.Api/Ellp.Api.csproj` `<Version>` move together. The public release of 2026-11-08 is 1.0.0; the next versions
  are 1.0.1, 1.0.2 … (TMCL-PR's order: 1.0.0 … 1.0.9, then 1.1.0).
- Add a numbered file under `docs/decisions/` for every important decision; never rewrite an old one.

## Rules

- **No secrets in the repository** (SMTP password, service-account JSON, Firebase private config): environment variables and
  `appsettings.Production.json` (git-ignored). The public Firebase web config goes in `frontend/.env.local`, not in git.
- **No real personal data** in seed, tests or docs: every name, school and email is fictional (`*.example.com`).
- **Email test mode stays on** (`Email:GlobalTestMode` and the tenant switch) until the owner says otherwise; never send real
  mail from a development machine.
- **No emoji as icons**: Octicons via `frontend/src/constants/icons.ts`. **No hex colours in components**: tokens in
  `frontend/src/styles/tokens.css`.
- **No text a person reads in code**: `{ th, en }` pairs in `frontend/src/i18n/dict.ts` or in the data.
- **Children's data**: the birth year only (never a date), fictional seed only; the parent acknowledgement is a record, not yet
  verified consent (decisions 0004 and 0008).
- **The rules live twice**, in TypeScript and C#, and change together with their tests in the same commit:
  - gamification: `frontend/src/lib/gamification.ts` ↔ `backend/Ellp.Api/Modules/Progress/GamificationRules.cs`
  - plans: `lib/access.ts` ↔ `Modules/Access/PlanRules.cs` (public endpoints strip quiz answers)
  - integrity: `lib/integrity.ts` ↔ `Modules/Integrity/IntegrityRules.cs`; the media signing key is `MEDIA_SIGNING_KEY`
    (Development has a built-in one)
  - commerce and mock scoring: `lib/commerce.ts` ↔ `Modules/Commerce/CommerceRules.cs`; payment keys are `OMISE_SECRET_KEY` /
    `OMISE_PUBLIC_KEY`; the demo gateway moves no money and its confirm endpoint is Development-only
  - placement, skills, family: `lib/placement.ts`, `lib/skills.ts`, `lib/family.ts` ↔ `Modules/Placement/PlacementRules.cs`,
    `Modules/Family/FamilyRules.cs`; the weekly-report sentences must be identical on both sides. A parent (`role: parent`)
    reads only children in `childUids` of the same tenant.

## Code conventions

- Backend: `Modules/<Name>/<Name>Controller.cs`, `<Name>Service.cs`; rules as pure static classes with tests in
  `backend/Ellp.Api.Tests/`. Every endpoint answers `ApiResponse<T>`; the client branches on `code`.
- Store access only through `IEllpStore`; the caller only through `ICurrentUser`; tenant checks through `RoleRules.CanManageOwner`.
- Frontend: pages call `api` from `services/index.ts` only; new pages live in `modules/learn`, `modules/admin` or `modules/public`;
  new icons are added to `constants/icons.ts`; new strings to `i18n/dict.ts`.

## Commands

```powershell
cd frontend; npm ci; npm run dev                                   # http://localhost:5174 (demo mode)
cd frontend; npx tsc --noEmit; npm run build
dotnet run --project backend/Ellp.Api                              # http://localhost:5220/swagger (X-Demo-User header)
dotnet build backend/Ellp.sln -c Release
dotnet test backend/Ellp.Api.Tests/Ellp.Api.Tests.csproj -c Release
firebase deploy --only hosting --project ellp-littihai             # the public demo, after npm run build
```

## Open items

See [roadmap.md](roadmap.md). Next: 1.4.x (scheduled weekly reports, verified consent), 1.5 (flashcards, coins, 6/12-month
packages, sales landing), 1.3.x (Omise live test, e-tax receipts) and 1.2.x hardening (Playwright).
