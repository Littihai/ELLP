# Data model

One Firestore collection per type; the document id is the `id` (or `uid`) field. The C# models (`Shared/Models.cs`) and the
TypeScript types (`src/types/index.ts`) are the same shapes; JSON is camelCase. Dates are ISO-8601 UTC strings.

| Collection | Document id | Key fields | Notes |
|---|---|---|---|
| `owners` | `own_*` | code, name{th,en}, contactEmail, plan (free/school/enterprise), active | A tenant |
| `programs` | `prg_*` | ownerId, title, description, track, cefr, targetScore, plan, proctoring (off/standard/strict or null = track default), ageBands[], color, published | `plan` = the lowest plan that opens every lesson; the first lesson is always a free preview |
| `lessons` | `les_*` | programId, order, title, summary, youtubeId, videoUrl, checkpoints[{id, atSec, prompt, choices, answer}], durationSec, xpReward, vocabulary[], quiz[], unlock[], published | `videoUrl` set = the platform's player; `unlock[]` all must pass |
| `quests` | `qst_*` | ownerId, programId (null = all), scope (daily/weekly/program), goal{type,target}, xpReward, badgeId, active | |
| `badges` | `bdg_*` | name, description, icon (Octicon name) | Global for V1 |
| `users` | Firebase uid | displayName, email, role, ownerId (null for superadmin), enrolledProgramIds[], birthYear, track, plan, planStatus (active/pending/expired), planTrack, planNote, planRequestedAt, planExpiresAt, allowAllAges, parentConsent{acknowledged, at, note}, xp, streakDays, lastActiveDate, badgeIds[], avatarColor, active | The profile; the Auth user is the identity. The year only, never a birth date |
| `progress` | `<uid>_<lessonId>` | uid, lessonId, watchedPct, completed, quizScore, quizTotal, completedAt, watchedSec, lastPositionSec, replays, checkpointResults{id → bool}, pausedUntil | One per learner per lesson |
| `questProgress` | `<uid>_<questId>_<periodKey>` | uid, questId, periodKey (YYYY-MM-DD / YYYY-Www / all), progress, completed | One per learner per quest per period |
| `xpEvents` | `xe_*` | uid, ownerId, programId, kind (video/quiz/quest/streak/manual), xp, note, at | The ledger; the leaderboard adds it up |
| `messages` | `msg_*` | ownerId, fromUid, fromName, fromEmail, subject, body, status (open/answered/closed), replies[] | Learner → admins |
| `mailLog` | `mail_*` | ownerId, to, subject, body, status (sent/redirected/suppressed/failed), testMode, at | What left (or did not) |
| `settings` | ownerId | email{fromName, fromAddress, replyTo, testMode, allowedRecipients[]}, leaderboard{visible, size}, ageRules{band → {quizPassPct, leaderboardVisible, streakFreeze}}, lineUrl, paymentInstructions{th,en}, integrity{…}, pricing{pro, premium, currency, months}, paymentProvider (demo/omise/manual) | Per tenant |
| `payments` | `pay_*` | uid, ownerId, plan, planTrack, amount, currency, months, method (promptpay/card/transfer), provider, status (pending/paid/failed/expired/refunded), reference, qrPayload, receiptNo, note, createdAt, paidAt | 1.3 |
| `counters` | `<ownerId>_<year>` | seq | Receipt numbers, written in a transaction |
| `certificates` | `cert_*` | code, uid, learnerName, ownerId, ownerName, programId, programTitle, track, cefr, lessons, xpEarned, issuedAt | Verified at /certificate/{code} |
| `mockTests` | `mock_*` | ownerId, track, title, description, durationMin, scoring (toeic/ielts/percent), passMark, requiredPlan, sections[{id, title, questions[{id, prompt, choices, answer}]}], published | Answer keys never leave the server |
| `mockAttempts` | `att_*` | uid, testId, ownerId, startedAt, submittedAt, answers, raw, total, sectionScores[], scaled, scaledLabel, passed, timedOut | |
| `violations` | `vio_*` | uid, ownerId, lessonId, type, action (logged/warned/paused/kicked_old/refused), detail, at | The integrity log (1.2) |
| `sessions` | `ses_*` | uid, deviceLabel, startedAt, lastSeenAt, active | A learner's live tabs/devices; alive for 90 s after a heartbeat |
| `chats` | `chat_*` | ownerId, uid or visitorKey, name, email, status (open/closed), linkedUid, messages[{from: visitor/admin, byName, text, at}] | Visitor or learner ↔ the tenant's admins (1.1) |

## Unlock rule shapes

```json
{ "type": "lesson_completed", "lessonId": "les_babyshark" }
{ "type": "min_level", "level": 3 }
{ "type": "min_xp", "xp": 100 }
{ "type": "quest_completed", "questId": "qst_watch3" }
{ "type": "streak_days", "days": 2 }
{ "type": "min_age", "years": 5 }
{ "type": "age_band", "bands": ["6-8", "9-12"] }
```

## Indexes

`firebase/firestore.indexes.json` declares the composite indexes the queries need (xpEvents by owner/uid and time, messages by
owner and time, lessons by program and order). Firestore prints the exact index link in the error when one is missing.

## Tenant isolation

Every document that belongs to a tenant carries `ownerId` (lessons through their program). The API filters by it on every read and
checks `RoleRules.CanManageOwner` on every write. Firestore client rules are closed (`firebase/firestore.rules`), so isolation is
enforced in one place: the API.
