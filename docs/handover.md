# Handover — for the developer (or candidate) who picks this up

What you are getting, what to look at first, and what we would ask you to do next.

## In one hour

1. `cd frontend && npm ci && npm run dev` → http://localhost:5174. Sign in as **Nong Pim (new)** (`pim.parent@example.com`, `ellp-demo`).
2. Home → *Baby Shark* → "Mark as watched (demo)" → answer the quiz → watch the celebration → go back to the program:
   *The Wheels on the Bus* is now open; *ABC Song* still wants 100 XP.
3. Quests, Leaderboard, Profile: see what the activity changed.
4. Contact: send a message. Sign out; sign in at `/admin/login` as **Teacher Ann** → Inbox → reply → see the mail log say
   *redirected (test)* because the tenant is in test mode with an allow-list.
5. Admin › Lessons → edit *Twinkle Twinkle* → look at the unlock-rule and quiz editors. Admin › Settings → test mode.
6. Sign in as **Platform Admin** → Owners → add an owner → switch the header scope to it → it is empty, as it should be.
7. Sign in as **น้องปุ๊กกี้** (`pukkie.parent@example.com`, age 4): the body program is hidden, the leaderboard is off for the band,
   the quiz passes at 50 %. In Admin › Members tick "open every age band" for her and look again. Admin › Settings has the per-band table.
8. Open http://localhost:5174/ signed out: the landing page and catalog by track; open *TOEIC 600+* → the preview lesson and the
   plan it needs. Sign up (any email, a 6-character password, birth year 1999, TOEIC, Pro) → you land on the learner home with a
   pending Pro request; lesson 2 of TOEIC is locked behind the plan. Open the chat bubble and write to the academy.
9. Sign in at `/admin/login` as **ครูเบนซ์** → Approvals: approve your request → the learner now opens lesson 2. Chats: reply
   to the visitor, or "create account from chat".
10. Sign in as **คุณแอน** (`ann.k@example.com`, Premium) → *IELTS Writing Task 2* lesson 1: the platform's player with the
    strict rules listed beside it. Press play: at 2 s the video stops for an in-video question with a countdown; try to drag the
    bar ahead (it snaps back); switch tabs three times (warning, warning, pause). As **ครูเบนซ์** open Admin › Learning integrity:
    the events, the live sessions, and the pause to lift. Open the same learner in a second tab to see the session ladder.
11. Sign in as **คุณเจ** → Plan: pick Premium → PromptPay → a demo QR appears → "simulate" → Premium is active with an end date and a
    receipt (EPA-2026-000x, printable). Mock tests → TOEIC Mini → answer → submit → a 10–990 estimate. Certificates: **คุณแอน**
    holds one; open `/verify` signed out and type ELLP-7K3M-QX2P. As **ครูเบนซ์**: Admin › Payments (confirm a transfer, refund),
    Admin › Mock tests (editor), Admin › Certificates.
12. Open `/placement` signed out: pick **English Pro Academy**, answer the 12 questions → an estimated CEFR level and the
    programs that fit; sign up from the result page and the level is on your profile. Sign in as **คุณพ่อสมชาย**
    (`somchai@example.com`): the family page with two children, the week next to the week before, the skills, "email this
    report" (redirected in test mode). As **ครูเบนซ์**: Admin › Placement (editor and results), Admin › Parent reports (send to all).
13. `dotnet test backend/Ellp.Api.Tests/Ellp.Api.Tests.csproj`: 109 tests on the rules and the engine.

## Where the newest code is (decision 0008)

Placement test (`Modules/Placement`, `lib/placement.ts`), skill tags and the per-skill profile (`lib/skills.ts`), parent accounts
and the weekly report (`Modules/Family`, `lib/family.ts`). The admin pages are Placement and Parent reports; the learner pages
are `/app/placement` and `/app/family`; `/placement` is public.

## A good first task

Take the Omise gateway live against a test account: set `OMISE_SECRET_KEY` / `OMISE_PUBLIC_KEY`, point the webhook at
`/api/v1/payments/webhook/omise`, add the Omise.js card tokenisation to `PlanPage`, and write decision record 0009 with what the
test account showed. Or, smaller: a scheduled Monday job that sends the parents' weekly reports (today a button). Then the Playwright tests the roadmap lists (checkout, mock test, certificate verify).

## Read in this order

1. [architecture.md](architecture.md) — the shape and the principles
2. `frontend/src/lib/gamification.ts` and `backend/.../GamificationRules.cs` side by side — the same rules twice
3. `frontend/src/services/demoStore.ts` — the demo engine; `backend/.../ProgressService.cs` is its server twin
4. [data-model.md](data-model.md) — the collections
5. [decisions/](decisions) — why things are the way they are

## What is deliberately simple

- One profile per account. A parent has their own account and reads the children listed on it; the consent record says who confirmed, not who they are (roadmap: verified consent).
- Badge conditions are code (two special cases); quests already pay badges from data.
- Watch progress is a timer in demo mode. Live mode should use the YouTube IFrame API.
- Firestore rules are closed; all access is via the API. Keep it that way unless a client-only feature needs a read.

## Conventions to keep

- Thai and English for everything a person reads: `{ th, en }` in `i18n/dict.ts` or in the data. No text in components.
- Octicons only. Tokens only (no hex in components). Light and dark must both look right.
- Backend module = `Modules/<Name>/<Name>Controller.cs` + `<Name>Service.cs`; rules in a static class with tests.
- `ApiResponse<T>` on every endpoint; the client reads `code`.
- Secrets never in the repository. Test mode stays on until someone deliberately turns both switches off.
- Commits in English, one change each; release as `vX.Y.Z` with notes. The full list of rules: [contributing.md](contributing.md).

## Also worth doing

Replace the watch timer with the YouTube IFrame API in `LessonPage.tsx` (`Player`) for the kids track, and add a Playwright test
that walks steps 2 and 8 above.
