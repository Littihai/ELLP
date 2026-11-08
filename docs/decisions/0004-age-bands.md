# 0004 — Age bands: content filtering, unlock rules and gentler game rules by age

Date: 2026-11-08 · Status: accepted (1.0.1)

## Context

1.0.0 treated every learner the same. The owner asked for conditions by age: content that fits the child, rules that do not
punish the youngest, and the legal side (a parent's consent for a minor). Parent accounts are a 1.1 feature, so 1.0.1 had to
add what works without them.

## Decision

- **Store the birth year only**, never the date: the least data that still gives an age band (data minimisation). The band is
  derived (`ageBandFor(now.year − birthYear)`): `3-5`, `6-8`, `9-12`, `13+`. No birth year = no band.
- **Programs carry `ageBands`** (empty = every age). A learner sees only the programs for their band; the page says how many
  are hidden and that a teacher can open them. A learner with **no birth year is not held back** by program filtering.
- **Two unlock rules**: `min_age` (years) and `age_band` (bands). Unlike filtering, these **fail when the age is unknown**: a
  lesson that says "5 and up" cannot be opened to a child whose age nobody entered; the rule row says to add the birth year.
- **Override** `allowAllAges` on the learner: a teacher or parent who judges the child ready opens every band and every age rule.
- **Per-band game rules** in the tenant's settings (`ageRules`): quiz pass mark, leaderboard visibility, streak forgiveness.
  Defaults: 3–5 → 50 % / hidden / forgiven; 6–8 → 60 % / shown / forgiven; 9–12 and 13+ → 70 % / shown / strict. Unknown age →
  the standard 60 % / shown / strict. "Forgiven" means a broken chain carries on (+1) instead of resetting to 1.
- **Parent acknowledgement** on the learner (`parentConsent`: acknowledged, date, note) as a first trace toward PDPA s.20
  (a minor under 10 needs a guardian's consent). It is a record a teacher keeps, not yet a verified flow; the Members table shows
  who lacks it. The verified flow (parent account, emailed link, policy version) is 1.1.

## Alternatives considered

- *A single minimum age per program* — too coarse: a song set can suit 3–8 while its quiz suits 6+; bands plus per-lesson rules cover both.
- *Hide age-locked lessons entirely* — a child would not understand why the set has gaps; a visible lock with the reason is kinder and
  lets a parent act.
- *Compute age from a full birth date* — more precise by months, but more personal data than the product needs.

## Consequences

- The rules exist twice again (TS and C#) and are pinned by 16 new xUnit tests; the demo store's saved state moved to key
  `ellp.demo.v2`, so an older browser state starts fresh.
- Screen-time limits, a parent PIN and real consent wait for parent accounts (roadmap 1.1).
