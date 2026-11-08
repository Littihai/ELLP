# Roadmap

Numbering follows TMCL-PR's order: 1.0.0, 1.0.1 … 1.0.9, then 1.1.0. A number is never reused.

## 1.0.1 — done: conditions by age (decision 0004)

Birth year and age bands, program filtering with a per-learner override, `min_age` / `age_band` unlock rules, per-band pass mark,
leaderboard and streak forgiveness, parent acknowledgement as a first PDPA trace.

## 1.1.0 — done: every audience, plans, sign-up, chat (decision 0005)

Tracks (kids, school, TOEIC, IELTS, ก.พ., foundation), CEFR levels, age bands to 18+, public catalog and program pages,
self-service sign-up, Free / Pro / Premium with admin approval, chat with admins (+ LINE link), create account from chat.

## 1.2.0 — done: the player and the learning-integrity rules (decision 0006)

Own player for self-hosted video, signed links, proctoring profiles, seek/speed locks, in-video questions, replay limit,
fullscreen, watermark, attention ladder (warn, warn, pause), session limit (warn, end old, refuse), integrity log and policy.
Left for later: a streaming provider with DRM, a player library for HLS, and Playwright tests of the player.

## 1.2.x — hardening
- HLS playback (hls.js) for Cloudflare Stream / Mux URLs; thumbnails from the stream.
- Real fullscreen enforcement on mobile Safari (no Fullscreen API on iPhone: fall back to a "stay on this page" banner).
- Playwright tests: checkpoint, seek snap-back, tab-switch ladder, session refuse.

## 1.2 — the original plan (kept for reference)

- **Self-hosted video** for the exam tracks (Firebase Storage first; Cloudflare Stream or Mux when DRM is wanted) with our own
  player (video.js / plyr): real watch position, signed URLs with expiry, no direct file URL.
- **Player rules per proctoring profile** (off for kids, standard for foundations, strict for exams): no seeking past the
  furthest point watched, playback speed locked to 1×, **in-video quiz checkpoints** that pause the video and must be answered
  (60 s per question by default, 0 when the time runs out), replay limit, forced lesson order (already there), watch time and
  last position saved every 15 s.
- **Attention events**: tab / window switch (Page Visibility), minimise / blur, leaving fullscreen, unusual pause frequency;
  **concurrent-session limit** with a heartbeat (warn, kick the old session, refuse a new one).
- **Violation log and policy** per tenant, with the owner's table as default: warn, warn, pause the lesson; sessions: warn,
  end the old one, refuse the new one. Admin page to review and lift a pause.
- **Deterrents, honestly labelled**: dynamic watermark (email + time) over the video, no context menu / copy on lesson pages,
  "the web cannot stop screenshots or screen recording" stated in the admin help.

## 1.3 — money and proof

- **Online payment** (Omise or Stripe) replacing transfer + slip; receipts; plan expiry and renewal reminders by email.
- **Course certificate** (PDF) on completion; **mock tests** for TOEIC / IELTS / ก.พ. with timing and a score report.
- DRM (Widevine) through the streaming provider for premium content.

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
