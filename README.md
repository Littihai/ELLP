# ELLP — English Learning Language Platform

Gamified English learning through video: watch a song, pass a short quiz, earn XP, climb levels, finish quests, and unlock
the next video. Built for young learners and the teachers who guide them. **Version 1.0.1** is a click-through demo for
evaluation and handover: every screen works on fictional data, no account or server needed.

Thai version: [README.th.md](README.th.md) · Handover notes for developers: [docs/handover.md](docs/handover.md)

## Two worlds, two doors

| | Learner (`/login` → `/app`) | Admin console (`/admin/login` → `/admin`) |
|---|---|---|
| Who | Children (and parents on their account) | Platform admin, owners, teachers |
| Home | Level, XP bar, streak, next lesson, today's quests, badges | Dashboard: learners, active today, open messages, XP over 14 days |
| Content | Programs → lessons → YouTube player, vocabulary chips, quiz | Owners (tenants), programs, lessons with quiz and unlock-rule editor, quests |
| Game | Quests (daily / weekly / long-term), leaderboard, profile with badges and XP history | Members (roles, enrolment), settings (email, leaderboard) |
| Contact | Write to the teacher; read replies | Inbox: reply by email; mail log shows what was sent, redirected or suppressed |

## Gamification in one paragraph

Watching a video to **80 %** pays its XP (50–60). A quiz pays **10 XP per right answer + 20 for a perfect score**, and a retake
pays only the improvement. The first activity of a day moves the **streak** (+5 XP per day, capped at 25). **Levels** 1–10 sit at
0 / 100 / 250 / 500 / 900 / 1400 / 2000 / 2800 / 3800 / 5000 XP. **Quests** count videos, passed quizzes, XP or streak days per
day, week or forever, and pay XP and badges. A lesson's **unlock rules** (finish lesson X, reach level N, have N XP, complete
quest Q, hold an N-day streak) all have to pass before its video opens. The demo opens with **Baby Shark**; finishing it unlocks
*The Wheels on the Bus*, and so on. Full rules: [docs/gamification.md](docs/gamification.md).

## Conditions by age (1.0.1)

A learner's **birth year** (the year only) gives an age band: 3–5, 6–8, 9–12, 13+. Programs say which bands they are for, lessons can
require `min_age` or `age_band`, and each band has its own pass mark, leaderboard visibility and streak forgiveness in the tenant's
settings (gentler for the youngest). A teacher can open every band to one child. A parent's acknowledgement is recorded per learner
as a first trace toward PDPA. Decision: [docs/decisions/0004-age-bands.md](docs/decisions/0004-age-bands.md).

## Multi-tenant

An **owner** (a school, a publisher, a family) has its own programs, lessons, quests, members, inbox and email settings. The
**Super Admin** adds and removes owners; an **owner** manages admins and learners; an **admin** (teacher) manages content and
answers messages. Learners only ever see their own tenant. Decision: [docs/decisions/0002-multi-tenant-owners.md](docs/decisions/0002-multi-tenant-owners.md).

## Stack

- **Frontend**: React 19, TypeScript, Vite, react-router; design tokens and UI conventions adopted from the TMCL-PR platform
  (light/dark theme, Thai/English dictionary, Octicons, no text in code).
- **Backend**: C# / ASP.NET Core 9 Web API, Firebase Admin SDK (ID-token verification, Firestore), MailKit (SMTP with a test-mode
  guard), xUnit. Rules are pure static classes with tests.
- **Firebase**: Authentication (email/password), Firestore (data, via the API's service account), Hosting (optional).
- **Demo mode**: the frontend runs on an in-memory store persisted in localStorage; the API has an in-memory store and a
  `X-Demo-User` header mode. Decision: [docs/decisions/0003-demo-mode.md](docs/decisions/0003-demo-mode.md).

## Run it

Prerequisites: Node.js 22+, .NET SDK 9 (the API is optional for the demo).

```bash
cd frontend && npm ci && npm run dev
```

Open http://localhost:5174. Pick a demo account on the sign-in page (the password is shown there: `ellp-demo`).

| Account | Email | Role |
|---|---|---|
| น้องมิ้นท์ | mint.parent@example.com | Learner, mid-way through Set 1 |
| Nong Pim (new) | pim.parent@example.com | Learner with nothing done yet, no parent acknowledgement |
| น้องปุ๊กกี้ | pukkie.parent@example.com | Learner aged 4 (band 3–5): filtered programs, hidden leaderboard, 50 % pass mark |
| Teacher Ann | ann@sunshine.example.com | Admin of Sunshine Kindergarten |
| คุณครูใหญ่ สมศรี | principal@sunshine.example.com | Owner of Sunshine Kindergarten |
| Platform Admin | super@ellp.example.com | Super Admin (owners page, every tenant) |

API (optional, in-memory store, Swagger at http://localhost:5220/swagger):

```bash
dotnet run --project backend/Ellp.Api
```

Tests and checks:

```bash
dotnet test backend/Ellp.Api.Tests/Ellp.Api.Tests.csproj
```

```bash
cd frontend && npx tsc --noEmit && npm run build
```

Going live with Firebase: [firebase/README.md](firebase/README.md) and [docs/dev-setup.md](docs/dev-setup.md).

## Documents

[docs/architecture.md](docs/architecture.md) · [docs/data-model.md](docs/data-model.md) · [docs/gamification.md](docs/gamification.md) ·
[docs/dev-setup.md](docs/dev-setup.md) · [docs/roadmap.md](docs/roadmap.md) · [docs/handover.md](docs/handover.md) ·
[docs/decisions](docs/decisions) · [CHANGELOG.md](CHANGELOG.md)

## Honest limits of 1.0.0

- The demo's watch progress is a timer plus a "mark as watched" button; live mode should use the YouTube IFrame API's real position.
- The YouTube ids in the seed point at well-known children's songs; verify each before a release and respect the owner's licences.
- The Firestore store and Firebase sign-in are implemented but were not exercised against a real project in this version.
- Email goes through a log-only sender until SMTP is configured; test mode stays on by default.
- No automated UI tests yet; the backend has 58 rule and engine tests.

## License

Not yet chosen. Until a license file is added, all rights are reserved by the author.
