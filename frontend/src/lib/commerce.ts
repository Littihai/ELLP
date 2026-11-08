import type { Lesson, LessonProgress, MockAttempt, MockTest, Plan, Pricing } from "@/types";

/**
 * Commerce, certificate and mock-test rules (1.3, decision 0007), pure functions mirrored in
 * backend Modules/Commerce/CommerceRules.cs and Modules/Mock/MockScoringRules.cs.
 */

export const DEFAULT_PRICING: Pricing = { pro: 1290, premium: 2490, currency: "THB", months: 1 };

export function priceFor(pricing: Pricing, plan: Plan): number {
  return plan === "pro" ? pricing.pro : plan === "premium" ? pricing.premium : 0;
}

/** The plan runs `months` from the payment (or from the current expiry when it is still in the future: a renewal adds on). */
export function planExpiry(fromIso: string, months: number, currentExpiresAt: string | null): string {
  const from = new Date(fromIso);
  const base = currentExpiresAt && new Date(currentExpiresAt) > from ? new Date(currentExpiresAt) : from;
  const d = new Date(base);
  d.setMonth(d.getMonth() + Math.max(1, months));
  return d.toISOString();
}

export type ExpiryStatus = "none" | "active" | "expiring" | "expired";
export const EXPIRING_DAYS = 7;

export function expiryStatus(expiresAt: string | null, nowMs = Date.now()): ExpiryStatus {
  if (!expiresAt) return "none";
  const left = new Date(expiresAt).getTime() - nowMs;
  if (left <= 0) return "expired";
  if (left <= EXPIRING_DAYS * 86400000) return "expiring";
  return "active";
}

export function daysLeft(expiresAt: string | null, nowMs = Date.now()): number {
  return expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - nowMs) / 86400000)) : 0;
}

/** Receipt numbers per tenant and year: EPA-2026-0001. */
export function receiptNo(ownerCode: string, year: number, seq: number): string {
  return `${ownerCode}-${year}-${String(seq).padStart(4, "0")}`;
}

/** A verification code a parent or an employer can type: ELLP-XXXX-XXXX (no 0/O/1/I). */
export function certificateCode(rand: () => number = Math.random): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const grp = () => Array.from({ length: 4 }, () => A[Math.floor(rand() * A.length)]).join("");
  return `ELLP-${grp()}-${grp()}`;
}

/** A program is complete when every published lesson is complete. */
export function programComplete(lessons: Lesson[], progress: LessonProgress[]): boolean {
  const pub = lessons.filter((l) => l.published);
  return pub.length > 0 && pub.every((l) => progress.some((p) => p.lessonId === l.id && p.completed));
}

/** The fake PromptPay payload the demo gateway shows (the real one comes from the provider). */
export function demoQrPayload(paymentId: string, amount: number): string {
  return `00020101021230370016A000000677010111${paymentId.slice(-8).padStart(8, "0")}5303764540${amount.toFixed(2).length}${amount.toFixed(2)}5802TH6304DEMO`;
}

// ── mock tests ──

export interface MockScore {
  raw: number;
  total: number;
  sectionScores: { sectionId: string; raw: number; total: number }[];
  scaled: number;
  scaledLabel: string;
  passed: boolean;
}

/** TOEIC: 10–990 in steps of 5 from the fraction right; IELTS: a band 1.0–9.0 in halves; percent: 0–100. */
export function scoreMock(test: MockTest, answers: Record<string, number>): MockScore {
  const sectionScores = test.sections.map((s) => ({ sectionId: s.id, raw: s.questions.filter((q) => answers[q.id] === q.answer).length, total: s.questions.length }));
  const raw = sectionScores.reduce((n, s) => n + s.raw, 0);
  const total = sectionScores.reduce((n, s) => n + s.total, 0);
  const frac = total > 0 ? raw / total : 0;
  let scaled: number, scaledLabel: string;
  switch (test.scoring) {
    case "toeic": scaled = Math.round((10 + frac * 980) / 5) * 5; scaledLabel = `${scaled} / 990`; break;
    case "ielts": scaled = Math.max(1, Math.round(frac * 9 * 2) / 2); scaledLabel = `Band ${scaled.toFixed(1)}`; break;
    default: scaled = Math.round(frac * 100); scaledLabel = `${scaled} %`;
  }
  return { raw, total, sectionScores, scaled, scaledLabel, passed: scaled >= test.passMark };
}

export function mockTimeLeftSec(attempt: MockAttempt, test: MockTest, nowMs = Date.now()): number {
  return Math.max(0, Math.round((new Date(attempt.startedAt).getTime() + test.durationMin * 60000 - nowMs) / 1000));
}

/** XP for a mock test: 50 for a pass, 20 for finishing. */
export const MOCK_XP_PASS = 50;
export const MOCK_XP_DONE = 20;
