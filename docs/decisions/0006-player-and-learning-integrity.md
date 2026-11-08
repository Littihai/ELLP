# 0006 — The platform's own player and the learning-integrity rules

Date: 2026-11-08 · Status: accepted (1.2.0)

## Context

For the exam tracks the owner listed conditions a YouTube embed cannot honour: no skipping ahead, playback speed locked,
questions inside the video that must be answered before it continues, a replay limit, real watch time and position, a limit
on concurrent sessions, detection of tab switches, minimising and leaving fullscreen, and a step-wise violation policy rather
than instant penalties. The owner also acknowledged that a web page cannot stop screenshots or screen recording.

## Decision

- **Our own player over `<video>`** (`components/VideoPlayer.tsx`), fed by a **self-hosted video URL** on the lesson. When set
  it wins over the YouTube id; the kids' songs keep YouTube. No player library in 1.2: the HTML5 element and its events are
  enough for the rules, and the file can move to Cloudflare Stream or Mux later (HLS URL in the same field).
- **Signed, short-lived video links**: the player asks the API for `/media/{lesson}?uid&exp&sig` (HMAC-SHA256, 10 minutes, one
  learner); the media endpoint verifies and redirects to storage. The stored URL never reaches the browser in live mode.
- **Proctoring profiles** decide which rules are on: `off` (kids), `standard` (foundations: seek and speed locked, checkpoints,
  attention logged, session limit), `strict` (exams: everything, attention punished, fullscreen, replay limit, watermark, no
  copy). A track has a default; a program may override it.
- **The ladder** (tenant policy, the owner's table as default): attention events warn on the 1st and 2nd strike and **pause the
  lesson** on the 3rd for 10 minutes; a teacher can lift the pause. Sessions: a second live session warns, the next ends the old
  one, the next is refused. An unanswered checkpoint within 60 s scores 0 and the video continues. Seek and speed attempts
  are only recorded (the player simply undoes them).
- **Honest deterrents**: a drifting watermark with the learner's email and the time, no context menu or text selection on
  strict lessons, expiring links. The admin pages say plainly that screenshots and recordings cannot be prevented.
- **Where the rules live**: `lib/integrity.ts` and `Modules/Integrity/IntegrityRules.cs` (ladder, session decision, profile
  tables, seek/replay/pause checks), `VideoTokenRules.cs` (signing), all unit-tested; the engine refuses a paused lesson
  (`LESSON_PAUSED`) and the server recomputes the watched percentage from the reported position.

## Alternatives considered

- *YouTube IFrame API with "snap back" on seek* — fragile, speed and quality menus stay, and YouTube's own UI shows related
  videos; kept only where control does not matter (songs).
- *DRM from day one* — paid and provider-bound; the field accepts an HLS URL so Cloudflare Stream / Mux with Widevine is a 1.3
  switch, not a redesign.
- *Instant lockout on the first tab switch* — rejected by the owner: notifications and accidental clicks happen.

## Consequences

- Lesson gained `videoUrl` and `checkpoints[]`; progress gained `watchedSec`, `lastPositionSec`, `replays`,
  `checkpointResults`, `pausedUntil`; tenant settings gained `integrity`; new collections `violations` and `sessions`.
- Demo state key moved to `ellp.demo.v5`. The seeded exam lessons use a 5-second CC0 sample clip with checkpoints at 2 s and 4 s
  so the mechanics can be seen in a minute; a real course replaces the URL.
- Browsers may refuse `requestFullscreen` outside a click; the player then plays without it and only records the exit events.
