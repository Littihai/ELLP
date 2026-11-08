# Changelog

All notable changes to ELLP. The format follows Keep a Changelog; versions follow TMCL-PR's order (1.0.0 … 1.0.9, 1.1.0).

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
