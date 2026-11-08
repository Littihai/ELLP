import { useEffect, type ButtonHTMLAttributes, type ComponentType, type CSSProperties, type ReactNode } from "react";
import type { OcticonProps } from "@primer/octicons-react";
import { ICON, TONE, type IconName } from "@/constants/icons";
import type { StatusTone } from "@/types";
import { initials } from "@/lib/format";
import { useI18n } from "@/app/providers/I18nProvider";

/* ── Icon: GitHub Octicon by name, the only icon primitive ── */
export function Icon({ name, size = 16, color = "currentColor", style, className }: { name: IconName; size?: number; color?: string; style?: CSSProperties; className?: string }) {
  const Glyph = ICON[name] as ComponentType<OcticonProps>;
  return <Glyph size={size} fill={color} aria-hidden="true" className={className} style={{ flex: "none", verticalAlign: "middle", ...style }} />;
}

/* ── Button ── */
type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "success" | "danger";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: "sm" | "md" | "lg"; busy?: boolean; count?: number; icon?: IconName; children?: ReactNode }
export function Button({ variant = "primary", size = "md", className, children, busy, count, disabled, icon, ...rest }: ButtonProps) {
  const cls = ["btn", `btn-${variant}`, size !== "md" ? `btn-${size}` : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <button type="button" {...rest} className={cls} disabled={disabled || busy} aria-busy={busy || undefined}>
      {busy ? <span aria-hidden style={{ width: 12, height: 12, border: "2px solid currentColor", borderRightColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite" }} /> : icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
      {!!count && <span className="btn-count">{count > 99 ? "99+" : count}</span>}
    </button>
  );
}

/* ── Card ── */
export function Card({ children, style, pad = "16px 18px", className, title, actions }: { children: ReactNode; style?: CSSProperties; pad?: string; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={className} style={{ background: "var(--color-surface)", border: "1px solid var(--color-neutral-200)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-sm)", padding: pad, ...style }}>
      {(title || actions) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          {title && <h3 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 600 }}>{title}</h3>}
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Badge (status pill) ── */
export function Badge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  const t = TONE[tone];
  return <span style={{ whiteSpace: "nowrap", fontSize: 11.5, fontWeight: 600, borderRadius: 999, padding: "3px 10px", background: t.bg, color: t.fg, display: "inline-flex", alignItems: "center", gap: 5 }}>{children}</span>;
}

/* ── PageHeader ── */
export function PageHeader({ pretitle, title, sub, actions }: { pretitle?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
      <div style={{ minWidth: 0 }}>
        {pretitle && <div className="eyebrow" style={{ marginBottom: 2 }}>{pretitle}</div>}
        <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: 600, lineHeight: 1.4 }}>{title}</h1>
        {sub && <div style={{ fontSize: "var(--text-sm)", color: "var(--color-neutral-600)", marginTop: 3 }}>{sub}</div>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

/* ── StatCard ── */
const TINT: Record<StatusTone, { bg: string; fg: string }> = {
  neutral: { bg: "var(--color-neutral-100)", fg: "var(--color-neutral-600)" },
  accent: { bg: "var(--color-accent-100)", fg: "var(--color-accent)" },
  ok: { bg: "var(--tone-ok-bg)", fg: "var(--tone-ok-solid)" },
  warn: { bg: "var(--tone-warn-bg)", fg: "var(--tone-warn-solid)" },
  stop: { bg: "var(--tone-stop-bg)", fg: "var(--tone-stop-solid)" },
};
export function StatCard({ icon, label, value, sub, tone = "accent", onClick }: { icon: IconName; label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: StatusTone; onClick?: () => void }) {
  const t = TINT[tone];
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, background: t.bg, color: t.fg }}><Icon name={icon} size={18} /></span>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-neutral-600)", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: "var(--text-3xl)", fontWeight: 700, lineHeight: 1.1, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: "var(--text-xs)", color: "var(--color-neutral-600)", marginTop: 4 }}>{sub}</div>}
    </>
  );
  const style: CSSProperties = { background: "var(--color-surface)", border: "1px solid var(--color-neutral-200)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-sm)", padding: "14px 16px", textAlign: "left", font: "inherit", color: "inherit", width: "100%" };
  return onClick ? <button type="button" onClick={onClick} className="row-click" style={{ ...style, cursor: "pointer" }}>{inner}</button> : <div style={style}>{inner}</div>;
}

/* ── ProgressBar ── */
export function Bar({ pct, tone, large, label }: { pct: number; tone?: "ok" | "warn"; large?: boolean; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={`bar${large ? " bar-lg" : ""}`} data-tone={tone} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}

/* ── Avatar ── */
export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  return <span className="avatar" style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.38) }} aria-hidden>{initials(name)}</span>;
}

/* ── Switch ── */
export function Switch({ checked, onChange, disabled, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; ariaLabel?: string }) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} aria-label={ariaLabel} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden />
    </span>
  );
}

/* ── Modal ── */
export function Modal({ title, children, onClose, wide, actions }: { title: ReactNode; children: ReactNode; onClose: () => void; wide?: boolean; actions?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`dialog${wide ? " dialog-wide" : ""}`} role="dialog" aria-modal="true">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <h2>{title}</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="close"><Icon name="x" size={18} /></button>
        </div>
        {children}
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}

/* ── EmptyState ── */
export function EmptyState({ icon = "inbox", title, sub, action }: { icon?: IconName; title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--color-neutral-600)" }}>
      <span style={{ display: "inline-grid", placeItems: "center", width: 52, height: 52, borderRadius: "50%", background: "var(--color-neutral-100)", marginBottom: 12 }}><Icon name={icon} size={24} /></span>
      <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{title}</div>
      {sub && <div style={{ fontSize: "var(--text-sm)", marginTop: 4 }}>{sub}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

/* ── Field ── */
export function Field({ label, hint, error, children, span2 }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; span2?: boolean }) {
  return (
    <label className={`field${span2 ? " span-2" : ""}`}>
      <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-neutral-700)" }}>{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

/* ── LangToggle ── */
export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div role="group" aria-label="Language" style={{ display: "inline-flex", flexShrink: 0, border: "1px solid var(--color-neutral-300)", borderRadius: "var(--radius-md)", overflow: "hidden", fontFamily: "var(--font-heading)" }}>
      {(["th", "en"] as const).map((c) => (
        <button key={c} type="button" onClick={() => setLang(c)} aria-pressed={lang === c}
          style={{ border: 0, padding: "4px 10px", fontSize: 12, fontWeight: 600, lineHeight: 1.4, background: lang === c ? "var(--color-text)" : "transparent", color: lang === c ? "var(--color-surface)" : "var(--color-neutral-600)" }}>
          {c === "th" ? "ไทย" : "EN"}
        </button>
      ))}
    </div>
  );
}

/* ── Loading / Error ── */
export function Loading() {
  const { t } = useI18n();
  return <div style={{ padding: 40, textAlign: "center", color: "var(--color-neutral-600)" }} role="status">{t("app.loading")}</div>;
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div style={{ padding: 16, borderRadius: "var(--radius-lg)", background: "var(--tone-stop-bg)", color: "var(--tone-stop-fg)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <Icon name="alert" /> <span style={{ flex: 1 }}>{t("app.error")}: {message}</span>
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>{t("app.retry")}</Button>}
    </div>
  );
}
