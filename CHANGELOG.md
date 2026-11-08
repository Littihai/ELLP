# Changelog

All notable changes to ELLP. The format follows Keep a Changelog; versions follow TMCL-PR's order (1.0.0 … 1.0.9, 1.1.0).

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
