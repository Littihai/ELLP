# Changelog

All notable changes to ELLP. The format follows Keep a Changelog; versions follow TMCL-PR's order (1.0.0 … 1.0.9, 1.1.0).

## [1.4.0] — 2026-11-08

Placement test, skill profile, parent accounts and the weekly report (decision 0008).

### Added
- Placement test per tenant: questions tagged by skill and CEFR level, scored on the server as a ladder (a level passes at
  60 % with every lower level passed), up to three recommended programs. Public at `/placement` (answers stripped; a
  visitor's result follows them into the account at sign-up) and at `/app/placement` for learners (saved to the profile).
  Admin › Placement edits tests and lists results. A "free placement test" button on the landing page.
- Skills on lessons (listening, speaking, reading, writing, grammar, vocabulary) with chips on programs and lessons, a
  skill profile (lessons finished per skill, quiz accuracy) on Home and Profile with the placement result as the "before" marker.
- Parent accounts (`role: parent`, `childUids`): a family page with the children, one child's week next to the week before
  (XP, lessons, quizzes, active days, minutes), skills, recent activity, programs and certificates; the weekly report in
  plain sentences built from the numbers; "email this report" to the parent; "confirm parental consent" on the child's record.
  Admin › Members assigns the parent role and the children; Admin › Parent reports sends this week's report to every parent.
- Seed: skills on every lesson, two placement tests (adults, kids), one result, two parent accounts, a little recent activity.
  12 new xUnit tests (109 in all).

### Changed
- Demo state key moved to `ellp.demo.v7`. `package.json` and the csproj version now read 1.4.0 (they had stayed at 1.0.1).
- Sign-up sends the browser key so a chat or a placement result made before the account is linked to it (live API too).

## [1.3.0] — 2026-11-08

Online payment, certificates, mock tests, HLS (decision 0007).

### Added
- Payments: a gateway interface with `demo` (simulated PromptPay / card, Development-only "simulate" button), `omise` (Opn
  Payments: PromptPay source + charge, webhook that re-reads the charge before settling; not yet exercised live) and `manual`
  (transfer). Settling activates the plan for the tenant's months (renewals add on), joins programs, numbers a receipt
  (`CODE-YEAR-0001`) and mails it through the test-mode guard. Printable receipt page; payment history; plan expiry with a
  reminder a week before and an `expired` status; Admin › Payments (confirm, refund, fail) and revenue on the dashboard.
- Certificates on program completion with a verification code and a public, printable verification page; Admin › Certificates.
- Mock tests: sections of questions, a clock from the stored start time, server-side scoring in the exam's scale (TOEIC 10–990,
  IELTS bands, percent), pass marks, XP, attempt history, tab switches recorded; Admin › Mock tests editor; Premium by default.
- Tenant settings: plan prices and months, payment provider. hls.js loaded lazily for `.m3u8` lessons (Cloudflare Stream / Mux).
- Seed: payments, a certificate, three mock tests (TOEIC, IELTS, ก.พ.). 13 new xUnit tests (97 in all).

### Changed
- Demo state key moved to `ellp.demo.v6`.

## [1.2.0] — 2026-11-08

The platform's own player and the learning-integrity rules (decision 0006).

### Added
- `VideoPlayer` over `<video>` for self-hosted lessons (`videoUrl`): no seeking past the furthest point watched, speed locked to
  1×, in-video questions (`checkpoints`) that pause the video and must be answered within the time limit (0 on timeout), replay
  limit, fullscreen on strict lessons, drifting watermark, no download / picture-in-picture, real position and played seconds
  reported every 15 s.
- Proctoring profiles `off` / `standard` / `strict` with a default per track and a per-program override; the lesson page lists
  the rules in force.
- Attention events (tab switch, window blur, fullscreen exit) and the ladder: warn, warn, pause the lesson (tenant policy);
  seek / speed / pause-spam / timeout events recorded; a teacher lifts a pause on the new Learning-integrity page.
- Concurrent-session limit with heartbeat: warn, end the old session, refuse the new one.
- Signed short-lived video links (`/media/{lesson}?uid&exp&sig`, HMAC) and a media endpoint that verifies them.
- Tenant integrity policy in Settings (pause threshold and length, max sessions, max replays, checkpoint time and XP).
- Seed: the exam lessons use a 5-second CC0 sample clip with checkpoints at 2 s and 4 s. 12 new xUnit tests (84 in all).

### Changed
- The engine refuses a paused lesson (`LESSON_PAUSED`) and recomputes the watched percentage from the reported position.
- Demo state key moved to `ellp.demo.v5`.

## [1.1.0] — 2026-11-08

Every audience, plans, sign-up and chat (decision 0005).

### Added
- Tracks: kids, school (university entrance), TOEIC, IELTS, ก.พ., foundations. Programs carry a track, a CEFR level (replacing
  beginner/elementary/intermediate) and an optional target score. Age bands widened to 13–15, 16–18 and 18+.
- Plans Free / Pro / Premium with a free first-lesson preview on every program; the plan gate in the pages and in the engine
  (402 `PLAN_REQUIRED`); a plan page for the learner with the tenant's payment instructions; an Approvals page for admins
  (approve, decline, end, set by hand; approval joins the learner to the covered programs).
- Public pages without sign-in: landing with catalog by track, program details with the preview video and lesson list.
- Self-service sign-up (name, email, password, birth year, provider, track, plan, parent box for under-18s).
- Chat with the tenant's admins for visitors and learners (chat bubble on public and learner pages), an admin chat page, "create
  account from chat", and a LINE Official Account button per tenant.
- Seed: a third tenant (English Pro Academy) with five exam-track programs (no video yet), teen and adult learners, a pending
  Pro request and two chats. 14 new xUnit tests (72 in all).

### Changed
- Lessons without a YouTube id show a coloured tile instead of a broken thumbnail.
- Demo state key moved to `ellp.demo.v3`.

## [1.0.1] — 2026-11-08

Conditions by age (decision 0004).

### Added
- Learners carry a birth year (the year only) and an age band (3–5 / 6–8 / 9–12 / 13+); programs carry the bands they are for.
  A learner sees only the programs for their band, with a hint about the hidden ones; a teacher can open every band per learner.
- Two unlock rules: `min_age` and `age_band`, in the lesson editor and on the lesson page with their met / not-yet state.
- Per-band game rules in tenant settings: quiz pass mark, leaderboard visibility, streak forgiveness; gentler defaults for 3–5.
- Parent acknowledgement on the learner (checkbox, date, note) shown on the Members page and the profile.
- A kindergarten demo learner (น้องปุ๊กกี้, 4) and age rules in the seed; 16 new xUnit tests (58 in all).

### Fixed
- The in-memory store now copies the seed objects, so one test (or one request) can no longer change another's data.
- The header tagline no longer wraps on narrow screens.

## [1.0.0] — 2026-11-08

First release: a complete click-through demo of the platform on fictional data.

### Added
- Learner world: sign-in, home (level, XP, streak, next lesson, quests, badges, recent XP), programs and lessons, YouTube player
  with unlock rules, vocabulary chips, quiz with celebration, quests (daily / weekly / long-term), leaderboard (week / all time,
  per program), profile (badges, XP history), contact (messages and replies).
- Admin console: dashboard, owners (Super Admin), programs, lessons with quiz and unlock-rule editors, quests, members with roles
  and enrolment, inbox with email reply, mail log, tenant settings (email identity, test mode, allow-list, leaderboard).
- Gamification rules (XP, levels, streaks, quests, badges, unlocking) in TypeScript and C#, with 42 xUnit tests.
- C# API: catalog, me (session, progress, watch, quiz, messages, enroll), leaderboard, admin, owners, health; in-memory and
  Firestore stores; Firebase ID-token or demo-header auth; SMTP with a test-mode guard or log-only email.
- Firebase configuration: closed Firestore rules, indexes, hosting rewrite, emulator ports, setup notes.
- Documentation: README (en/th), architecture, data model, gamification, dev setup, roadmap, handover, three decision records.
- CI workflow (frontend type check and build, backend build and tests), Dependabot.

### Known limits
- Watch progress in demo mode is a timer plus a "mark as watched" button.
- Firebase live mode is implemented but not yet exercised against a real project.
- No UI tests yet.
