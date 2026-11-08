# 0005 — Tracks for every audience, plans, self-service sign-up and the admin chat

Date: 2026-11-08 · Status: accepted (1.1.0)

## Context

ELLP started as a children's song platform. The owner widened it to secondary students preparing for university entrance,
adults preparing for TOEIC, IELTS or the Thai civil-service exam (ก.พ.), and anyone rebuilding their foundations. Visitors
must be able to read about the programs, sign up on their own or through an admin, and pay for a Pro or Premium plan. The owner
accepted the recommended defaults for every open question (see the conversation of 2026-11-08).

## Decision

- **Age is not the goal.** The age bands stay (widened to 13–15, 16–18, 18+) for suitability and gentleness; a new **track**
  says what the learner is here for: `kids`, `school`, `toeic`, `ielts`, `kpo`, `foundation`. A program belongs to one track and
  carries a **CEFR level** (pre-A1 … C1, replacing beginner/elementary/intermediate) and an optional **target score**.
- **Three plans.** `free`: the catalog, the first lesson of every program (preview), every free program in full. `pro`: every
  lesson of the pro programs in **one chosen track**. `premium`: everything. A pending or expired plan counts as free. Staff see
  everything. Rules in `lib/access.ts` / `PlanRules.cs`, tested.
- **Payment in 1.1 is manual.** The learner requests a plan (with a note: transfer reference, time), the tenant's payment
  instructions are shown, the admin checks the slip (in the chat or by reference) and approves on the Approvals page. An
  approval joins the learner to the programs the plan covers. Online payment (Omise/Stripe) is 1.3.
- **Three ways in.** The public catalog and program pages need no account. Self-service **sign-up** collects name, email,
  password, birth year, provider (tenant), track and plan; free is live at once, pro/premium become a pending request. The
  **chat** lets a visitor talk to a tenant's admins before signing up (a browser key keeps the thread; it follows the person into
  their account at sign-up), and the admin can **create the account from the chat** (prefilled Members form, thread linked).
  A LINE Official Account link sits beside the chat when the tenant has one.
- **Exam-track lessons may have no video yet** (`youtubeId` empty): the UI shows a tile and the demo button; 1.2 brings the
  self-hosted player these tracks need for the anti-cheat rules.

## Alternatives considered

- *Paid programs instead of plans* — simpler, but the owner asked for Free / Pro / Premium tiers; the program's `plan` field keeps
  per-program pricing possible later.
- *Approval for every sign-up* — rejected: a free account that works at once is the funnel; approval is only where money is.
- *LINE only, no in-app chat* — rejected: the admin needs the thread next to the account and the approval; LINE is offered too.

## Consequences

- Public endpoints strip quiz answers and reduce settings to what a visitor needs.
- Seed: a third tenant (English Pro Academy) with five exam-track programs, teen and adult learners, a pending request and two
  chats. Demo state key moved to `ellp.demo.v3`.
- The plan gate is enforced in the engine (402 PLAN_REQUIRED) as well as in the pages.
