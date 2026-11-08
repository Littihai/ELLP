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
10. `dotnet test backend/Ellp.Api.Tests/Ellp.Api.Tests.csproj`: 72 tests on the rules and the engine.

## A good first task (1.2)

Build the self-hosted player for the exam tracks (roadmap 1.2): a `VideoPlayer` component over `<video>` with video.js or plyr,
fed by a signed URL from a new API endpoint, reporting position every 15 s to `api.recordWatch`, with seek-forward blocked
beyond the furthest watched second and the speed menu removed. Keep the YouTube path for the kids track. Then the first two
player rules: in-video quiz checkpoints and the tab-switch warning. Decision record 0006 should say which streaming provider
was picked and why.

## Read in this order

1. [architecture.md](architecture.md) — the shape and the principles
2. `frontend/src/lib/gamification.ts` and `backend/.../GamificationRules.cs` side by side — the same rules twice
3. `frontend/src/services/demoStore.ts` — the demo engine; `backend/.../ProgressService.cs` is its server twin
4. [data-model.md](data-model.md) — the collections
5. [decisions/](decisions) — why things are the way they are

## What is deliberately simple

- One profile per account; a parent uses the child's account (roadmap: parent accounts).
- Badge conditions are code (two special cases); quests already pay badges from data.
- Watch progress is a timer in demo mode. Live mode should use the YouTube IFrame API.
- Firestore rules are closed; all access is via the API. Keep it that way unless a client-only feature needs a read.

## Conventions to keep

- Thai and English for everything a person reads: `{ th, en }` in `i18n/dict.ts` or in the data. No text in components.
- Octicons only. Tokens only (no hex in components). Light and dark must both look right.
- Backend module = `Modules/<Name>/<Name>Controller.cs` + `<Name>Service.cs`; rules in a static class with tests.
- `ApiResponse<T>` on every endpoint; the client reads `code`.
- Secrets never in the repository. Test mode stays on until someone deliberately turns both switches off.
- Commits in English, one change each; release as `vX.Y.Z` with notes.

## Also worth doing

Replace the watch timer with the YouTube IFrame API in `LessonPage.tsx` (`Player`) for the kids track, and add a Playwright test
that walks steps 2 and 8 above.
