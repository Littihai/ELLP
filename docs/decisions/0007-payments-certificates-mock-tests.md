# 0007 — Online payment, certificates, mock tests, and HLS for a streaming provider

Date: 2026-11-08 · Status: accepted (1.3.0)

## Context

1.1 opened plans with a bank transfer an admin confirms. The owner asked for online payment, a course certificate, timed mock
tests for the exam tracks, and the DRM path. The recommended defaults were accepted: Omise (Opn Payments) as the Thai provider,
transfer kept as a fallback, PDF by printing, HLS playback as the door to Cloudflare Stream or Mux.

## Decision

- **A payment gateway interface** with three implementations. `demo` invents a charge, shows a QR-looking tile that is labelled
  as not scannable, and lets the learner press "simulate" (Development only) in place of the provider's webhook. `omise` creates a
  PromptPay source and charge (card tokens come from Omise.js with the public key, so no card number touches the server) and is
  confirmed by Omise's `charge.complete` webhook, which **re-reads the charge** from Omise before settling, so a forged webhook
  cannot mark anything paid. `manual` is the 1.1 transfer flow. Keys live in `OMISE_SECRET_KEY` / `OMISE_PUBLIC_KEY`.
  The Omise path is implemented but **not exercised against a live account** in 1.3.
- **Settling is one method**: active plan for the tenant's `months` (a renewal adds on to a running plan), programs joined,
  receipt number `OWNERCODE-YEAR-0001` from a per-tenant counter (a Firestore transaction in live mode), receipt email through the
  test-mode guard. A learner prints the receipt page to PDF. Refund sends the learner back to free; an expired plan is detected
  on their next visit and a reminder is mailed a week before the end.
- **Certificates** are issued when every published lesson of a program is complete, carry a verification code
  (`ELLP-XXXX-XXXX`, no 0/O/1/I), and have a **public verification page** that doubles as the printable certificate. No PDF
  library: the browser's print dialog produces the PDF, which keeps the server free of fonts and layout code.
- **Mock tests** are sections of questions with a clock; the score is reported in the exam's own scale (TOEIC 10–990 in steps
  of 5 from the fraction right, IELTS bands in halves, percent for ก.พ. with 60 % as the pass mark). The clock runs from the
  stored start time, so a reload cannot reset it; a submission more than a minute late is scored as timed out. Learners never
  receive the answer key (public and learner endpoints strip it). Tab switches during a test are recorded. Pass pays 50 XP,
  finishing 20. Mock tests need Premium by default (per test).
- **HLS**: the player loads hls.js lazily when the lesson URL is an `.m3u8`, so Cloudflare Stream or Mux playback (and their
  signed-token and Widevine options) is a URL change plus provider configuration, not a player rewrite.

## Alternatives considered

- *Stripe* — works in Thailand but PromptPay support and Thai settlement are Omise's home turf; the interface makes a switch cheap.
- *QuestPDF / a PDF service for receipts and certificates* — real PDFs, but a dependency and a licence question for a demo; the
  print path is enough until a tenant asks for e-tax invoices.
- *Grading mock tests on the client* — simpler, but the key would ship to the browser; scoring stays on the server.

## Consequences

- New collections: `payments`, `certificates`, `mockTests`, `mockAttempts`, `counters` (receipt sequences); settings gained
  `pricing` and `paymentProvider`; the learner gained `planExpiresAt`.
- The estimated TOEIC and IELTS scores are approximations for practice and say so in the UI; they are not official conversions.
- Demo state key moved to `ellp.demo.v6`. 13 new xUnit tests (97 in all).
