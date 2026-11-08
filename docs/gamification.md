# Gamification rules (V1.0.0)

Implemented twice, identically: `frontend/src/lib/gamification.ts` (demo) and `backend/Ellp.Api/Modules/Progress/GamificationRules.cs`
(server, tested in `Ellp.Api.Tests/GamificationRulesTests.cs`). Change both, and the tests, together.

## XP

| Event | XP | When |
|---|---|---|
| Video watched | `lesson.xpReward` (seed: 50–60) | The first time `watchedPct` crosses **80 %**. Once per lesson. |
| Quiz | 10 × right answers, +20 when every answer is right | On submit. A retake pays only the **improvement** over the best score so far (`quizXp(new) − quizXp(best)`), never negative. |
| Streak | 5 × streak days, capped at 25 | On the first activity of a calendar day. |
| Quest | `quest.xpReward` | When the quest's progress reaches its target in the current period. |
| Manual | any | Reserved for a teacher's award (not in the UI yet). |

## Levels

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Total XP | 0 | 100 | 250 | 500 | 900 | 1400 | 2000 | 2800 | 3800 | 5000 |
| Title (en) | Starter | Explorer | Little Singer | Keen Listener | Word Collector | Storyteller | Rising Star | Champion | Legend | Master |

## Streak

`nextStreak(streakDays, lastActiveDate, today)`: unchanged when today already counted; +1 when `lastActiveDate` was yesterday;
reset to 1 otherwise. The streak quests (`streak_days`) take the streak as an absolute value, not an increment.

## Quests

| Goal type | Counts | Scope / period key |
|---|---|---|
| `watch_videos` | each video that crosses 80 % | `daily` → `YYYY-MM-DD`, `weekly` → ISO `YYYY-Www`, `program` → `all` |
| `pass_quizzes` | each lesson whose quiz is passed (≥ 60 %) for the first time | |
| `earn_xp` | XP gained by the activity | |
| `streak_days` | the current streak (absolute) | |

A quest with `programId` only counts events in that program; `null` counts every program of the owner. A completed quest pays its XP
and its badge once per period.

## Lesson completion and unlocking

A lesson is **complete** when the video reached 80 % and, if the lesson has a quiz, the best score is ≥ 60 %. The first completion
awards the badge *First Step*; a perfect Baby Shark quiz awards *Shark Friend* (seeded special case; later versions should move
badge conditions into data).

A lesson is **unlocked** when every rule in `unlock[]` passes (see data-model.md for the shapes). A lesson without rules is open.
The learner sees each rule with a met / not-yet state on the lesson page.

## Leaderboard

Per tenant, learners only, active only. "All time, all programs" ranks by `users.xp`; any other view adds up `xpEvents` in the ISO
week and/or program (quest and streak events, which have no program, count in every program view). The tenant's settings decide
whether learners see it and how many rows.

## Demo-only shortcut

In demo mode the lesson page has "Mark as watched (demo)", which sends `watchedPct = 100`. A timer also credits watch time while
the player is on screen. Live mode should replace both with the YouTube IFrame API's real position (roadmap).
