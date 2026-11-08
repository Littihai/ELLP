# Roadmap

Numbering follows TMCL-PR's order: 1.0.0, 1.0.1 … 1.0.9, then 1.1.0. A number is never reused.

## 1.0.1 — done: conditions by age (decision 0004)

Birth year and age bands, program filtering with a per-learner override, `min_age` / `age_band` unlock rules, per-band pass mark,
leaderboard and streak forgiveness, parent acknowledgement as a first PDPA trace.

## 1.0.x — make the demo trustworthy

- Real watch progress with the **YouTube IFrame API** (position, play/pause, replay) instead of the timer and the demo button.
- Verify every seeded YouTube id and let an admin preview the video in the lesson form.
- Firebase: run the live path end to end against a test project (Auth + Firestore + API) and the emulators; write the first
  integration test.
- UI tests (Playwright) for the two sign-in doors, the Baby Shark → Wheels unlock, and an admin reply.
- Lazy-load the Firebase SDK so the demo bundle stays small.

## 1.1 — classroom features

- **Parent accounts** linked to one or more learners (today a parent uses the child's account), with the verified consent flow
  (emailed link, policy version, withdrawal) that completes the 1.0.1 acknowledgement for PDPA s.20 / COPPA.
- **Screen time** per age band (minutes a day, set by the parent), ending in a gentle "take a break" screen that costs no XP or streak.
- **Parent mode with a PIN** for settings, contact and data deletion, so a child cannot reach them.
- **Quiz forms by age**: pictures and read-aloud prompts with two choices for 3–5 (Web Speech API), typed answers for 9+.
- **Teacher awards**: manual XP and badges with a note (the `manual` XP kind exists).
- **Badge conditions in data** (today *Shark Friend* is a special case in code).
- **Reports**: per learner (lessons, quiz scores, time), per program (completion funnel), export CSV.
- **Notifications**: in-app bell and email digests (weekly progress to parents), on the same outbox and test-mode guard.
- **Content**: lesson types beyond YouTube (uploaded video to Firebase Storage, audio-only, flashcards); subtitles / lyrics
  with word highlighting; speaking practice with the browser's speech recognition.

## 1.2 — platform

- **Owner self-service**: sign-up, plan limits (learners, programs), billing hooks.
- **Program marketplace**: an owner publishes a program others can license (the "many media, many owners" idea in the brief).
- **Avatars and shop**: spend XP on avatar items; seasonal events.
- **Classes and friends leaderboard**; teams/houses.
- **Admin audit log** and impersonation (view as a learner), as TMCL-PR has.
- Public demo hardening: rate limits, CAPTCHA on the public door, per-visitor sandbox.

## Ideas worth looking at first

| Project | Why |
|---|---|
| Duolingo | The reference for XP, streaks, leagues (weekly leaderboard with promotion/relegation), hearts, daily quests |
| Khan Academy Kids | Age-appropriate reward loops and a parent/teacher dashboard for young learners |
| Lingokids | Song and video based English for children; how unlocking and "playtime" are paced |
| Super Simple Songs / Pinkfong (YouTube) | Catalogue of licensable children's songs; vocabulary per song |
| H5P Interactive Video | Quizzes inside the video timeline, an open model for "answer to continue" |
| Open edX / Moodle gamification plugins (Level Up!) | Rules engine ideas for XP per event and level thresholds |
| Classcraft | Quests and team mechanics in a classroom setting |
