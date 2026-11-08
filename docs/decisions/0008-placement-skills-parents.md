# 0008 — Placement test, skill profile, parent accounts and the weekly report

Date: 2026-11-08 · Status: accepted (1.4.0)

## Context

A look at a Thai competitor (an app-first English school with a free placement test, per-skill progress, a parent dashboard
with a weekly AI summary, coins and avatars, 6- and 12-month packages) showed what ELLP lacked for a parent or an adult
learner deciding whether to pay: *where do I start, what am I getting better at, and what does my child do each week?*
The owner chose the first three for 1.4; flashcards, a coin shop, longer packages and a sales landing page follow in 1.5;
an AI tutor waits until there are paying users.

## Decision

- **Placement test as a ladder.** A tenant's test is a list of questions, each tagged with a skill and a CEFR level. A level
  is passed at 60 % of its questions; the person is placed at the highest level passed *with every lower level passed too*,
  so one lucky hard answer cannot lift them and one slip at the top does not drop them. The result recommends up to three
  published programs at that level or one above, from the person's track when it has a fit. The test is public (answers
  stripped) and scored on the server; a visitor's result waits under their browser key and joins the account at sign-up, a
  learner's is written to their profile (`placementCefr`, `placementAt`). One result per person per tenant; retaking replaces it.
- **Skills are tags on lessons.** Six skills (listening, speaking, reading, writing, grammar, vocabulary). A learner's
  profile per skill is lessons finished over lessons available plus quiz accuracy; no new tables, no new events. Programs
  show the union of their lessons' skills; the placement result's skill scores are drawn as the "before" marker.
- **Parent accounts are a role, not a second login.** `role: parent` with `childUids`; a parent may read a child when the
  child is a learner of the same tenant listed there (`FamilyRules.CanViewChild`). Parents see no lessons of their own: a
  family page with the children, one child's week (XP, lessons, quizzes, active days, minutes, skills) next to the week
  before, and the recent activity. Admins and owners make parent accounts on the Members page.
- **The weekly report is rules, not a model.** Plain sentences built from the week's numbers and the strongest and weakest
  skill, identical in the page and in the email (`FamilyRules.Summarize` and `lib/family.ts summarize` must match). A parent
  emails it to themselves; staff send this week's report to every parent of the tenant. Every email goes through the
  test-mode guard. A language model may write warmer text later without changing the data.
- **Consent gets a second trace.** A parent account can confirm the acknowledgement on the child's record
  (`parentConsent.note = parent:<email>`). It records *who* confirmed; it is still not identity verification (decision 0004).

## Alternatives considered

- *Adaptive (item-response) placement* — better precision, but needs calibrated items and many respondents; the ladder is
  explainable to a parent in one sentence and the tags make it easy to author.
- *Skill XP as its own ledger* — truer "practice" numbers, but another table to keep in sync with the rules; the lesson-tag
  profile answers the question well enough for now.
- *A separate parent app or login door* — cleaner separation, double the shells; a role inside the learner door keeps one
  code path and lets a parent also browse the catalog.
- *An LLM summary now* — would read better, but costs per email and needs a provider key; the numbers are the same either way.

## Consequences

- New collections `placementTests` and `placementResults`; `lessons.skills[]`; `users.childUids[]`, `placementCefr`,
  `placementAt`; `role` gains `parent`. Settings unchanged.
- New rule files that live twice: `lib/placement.ts` ↔ `PlacementRules.cs`, `lib/skills.ts` + `lib/family.ts` ↔
  `FamilyRules.cs`. 12 new xUnit tests (109 in all).
- The weekly send is a button; a scheduled Monday job is roadmap 1.4.x, like plan expiry.
- Demo state key moved to `ellp.demo.v7`. The version numbers in `package.json` and the csproj, which had stayed at 1.0.1
  through 1.1–1.3, now read 1.4.0.
