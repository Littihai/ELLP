# Data model

One Firestore collection per type; the document id is the `id` (or `uid`) field. The C# models (`Shared/Models.cs`) and the
TypeScript types (`src/types/index.ts`) are the same shapes; JSON is camelCase. Dates are ISO-8601 UTC strings.

| Collection | Document id | Key fields | Notes |
|---|---|---|---|
| `owners` | `own_*` | code, name{th,en}, contactEmail, plan (free/school/enterprise), active | A tenant |
| `programs` | `prg_*` | ownerId, title, description, level, color, published | A teaching medium |
| `lessons` | `les_*` | programId, order, title, summary, youtubeId, durationSec, xpReward, vocabulary[], quiz[], unlock[], published | `unlock[]` is a list of rules, all must pass |
| `quests` | `qst_*` | ownerId, programId (null = all), scope (daily/weekly/program), goal{type,target}, xpReward, badgeId, active | |
| `badges` | `bdg_*` | name, description, icon (Octicon name) | Global for V1 |
| `users` | Firebase uid | displayName, email, role, ownerId (null for superadmin), enrolledProgramIds[], xp, streakDays, lastActiveDate, badgeIds[], avatarColor, active | The profile; the Auth user is the identity |
| `progress` | `<uid>_<lessonId>` | uid, lessonId, watchedPct, completed, quizScore, quizTotal, completedAt | One per learner per lesson |
| `questProgress` | `<uid>_<questId>_<periodKey>` | uid, questId, periodKey (YYYY-MM-DD / YYYY-Www / all), progress, completed | One per learner per quest per period |
| `xpEvents` | `xe_*` | uid, ownerId, programId, kind (video/quiz/quest/streak/manual), xp, note, at | The ledger; the leaderboard adds it up |
| `messages` | `msg_*` | ownerId, fromUid, fromName, fromEmail, subject, body, status (open/answered/closed), replies[] | Learner → admins |
| `mailLog` | `mail_*` | ownerId, to, subject, body, status (sent/redirected/suppressed/failed), testMode, at | What left (or did not) |
| `settings` | ownerId | email{fromName, fromAddress, replyTo, testMode, allowedRecipients[]}, leaderboard{visible, size} | Per tenant |

## Unlock rule shapes

```json
{ "type": "lesson_completed", "lessonId": "les_babyshark" }
{ "type": "min_level", "level": 3 }
{ "type": "min_xp", "xp": 100 }
{ "type": "quest_completed", "questId": "qst_watch3" }
{ "type": "streak_days", "days": 2 }
```

## Indexes

`firebase/firestore.indexes.json` declares the composite indexes the queries need (xpEvents by owner/uid and time, messages by
owner and time, lessons by program and order). Firestore prints the exact index link in the error when one is missing.

## Tenant isolation

Every document that belongs to a tenant carries `ownerId` (lessons through their program). The API filters by it on every read and
checks `RoleRules.CanManageOwner` on every write. Firestore client rules are closed (`firebase/firestore.rules`), so isolation is
enforced in one place: the API.
