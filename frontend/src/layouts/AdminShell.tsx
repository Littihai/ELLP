import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { useTheme } from "@/app/providers/ThemeProvider";
import { Avatar, Icon, LangToggle } from "@/components/ui/kit";
import { useAsync, useViewport } from "@/hooks/useAsync";
import { api, USE_DEMO } from "@/services";
import type { IconName } from "@/constants/icons";
import type { Owner } from "@/types";

/**
 * The owner the console is looking at. An owner or admin sees their own tenant only; the Super Admin picks one in the header
 * (or "all owners" for the dashboard and the owners page). Pages read it with useScope().
 */
interface Scope { ownerId: string | null; owners: Owner[]; setOwnerId: (id: string | null) => void; canPick: boolean; reloadOwners: () => void }
const ScopeContext = createContext<Scope | null>(null);
export function useScope(): Scope {
  const c = useContext(ScopeContext);
  if (!c) throw new Error("useScope outside AdminShell");
  return c;
}

const LINKS: { to: string; key: string; icon: IconName; superOnly?: boolean; end?: boolean }[] = [
  { to: "/admin", key: "adm.dashboard", icon: "graph", end: true },
  { to: "/admin/owners", key: "adm.owners", icon: "organization", superOnly: true },
  { to: "/admin/programs", key: "adm.programs", icon: "book" },
  { to: "/admin/lessons", key: "adm.lessons", icon: "video" },
  { to: "/admin/quests", key: "adm.quests", icon: "rocket" },
  { to: "/admin/members", key: "adm.members", icon: "people" },
  { to: "/admin/inbox", key: "adm.inbox", icon: "inbox" },
  { to: "/admin/mail", key: "adm.mail", icon: "mail" },
  { to: "/admin/settings", key: "adm.settings", icon: "gear" },
];

export function AdminShell() {
  const { user, signOut } = useAuth();
  const { t, pick } = useI18n();
  const { resolved, toggle } = useTheme();
  const { tight } = useViewport();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const isSuper = user?.role === "superadmin";
  const { data: owners, reload } = useAsync(() => api.owners(), []);
  const [ownerId, setOwnerId] = useState<string | null>(user?.ownerId ?? null);
  useEffect(() => { if (!isSuper) setOwnerId(user?.ownerId ?? null); }, [isSuper, user?.ownerId]);
  // the Super Admin starts on the first owner so the tenant pages have something to show
  useEffect(() => { if (isSuper && ownerId === null && owners && owners.length > 0) setOwnerId(owners[0].id); }, [isSuper, ownerId, owners]);
  const scope = useMemo<Scope>(() => ({ ownerId, owners: owners ?? [], setOwnerId, canPick: isSuper, reloadOwners: reload }), [ownerId, owners, isSuper, reload]);
  if (!user) return null;

  const links = LINKS.filter((l) => !l.superOnly || isSuper);
  const menu = (
    <nav aria-label="admin">
      <div className="group eyebrow">{t("adm.console")}</div>
      {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className="side-link" onClick={() => setOpen(false)}><Icon name={l.icon} size={16} />{t(l.key)}</NavLink>)}
      <div className="group eyebrow" style={{ marginTop: 10 }}>{t("role.learner")}</div>
      <NavLink to="/app" className="side-link"><Icon name="play" size={16} />{t("adm.toLearner")}</NavLink>
    </nav>
  );

  return (
    <ScopeContext.Provider value={scope}>
      <div style={{ minHeight: "100vh" }}>
        <header className="app-header">
          <div className="app-header-row">
            {tight && <button type="button" className="btn-icon" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={t("nav.menu")}><Icon name={open ? "x" : "threeBars"} size={20} /></button>}
            <NavLink to="/admin" className="brand" aria-label="ELLP admin">
              <span className="brand-mark"><Icon name="shieldLock" size={16} /></span>
              <span>ELLP<small>{t("adm.console")}</small></span>
            </NavLink>
            <span className="hdr-spacer" />
            <span className="scope-pill" title={t("adm.ownerScope")}>
              <Icon name="organization" size={14} />
              {isSuper ? (
                <select value={ownerId ?? ""} onChange={(e) => setOwnerId(e.target.value || null)} aria-label={t("adm.ownerScope")}>
                  <option value="">{t("adm.allOwners")}</option>
                  {(owners ?? []).map((o) => <option key={o.id} value={o.id}>{pick(o.name)}</option>)}
                </select>
              ) : (
                <span style={{ padding: "0 6px" }}>{pick(owners?.find((o) => o.id === user.ownerId)?.name) || "—"}</span>
              )}
            </span>
            {!tight && <LangToggle />}
            <button type="button" className="btn-icon" onClick={toggle} aria-label={t("app.theme")}><Icon name={resolved === "dark" ? "sun" : "moon"} size={18} /></button>
            <span className="row" style={{ gap: 8, paddingLeft: 4 }}>
              <Avatar name={user.displayName} color={user.avatarColor} size={30} />
              {!tight && <span style={{ fontSize: "var(--text-xs)", lineHeight: 1.2 }}><b>{user.displayName}</b><br /><span className="muted">{t(`role.${user.role}`)}</span></span>}
            </span>
            <button type="button" className="btn-icon" onClick={() => signOut().then(() => nav("/admin/login"))} aria-label={t("app.signOut")} title={t("app.signOut")}><Icon name="signOut" size={18} /></button>
          </div>
        </header>
        <div className="adm-body">
          {!tight && <aside className="adm-side">{menu}</aside>}
          {tight && open && (<><div className="adm-scrim" onClick={() => setOpen(false)} /><aside className="adm-drawer">{menu}</aside></>)}
          <div className="adm-main">
            <main className="page"><Outlet /></main>
            <footer className="app-footer" style={{ paddingBottom: 24 }}>ELLP {t("app.version")} {__APP_VERSION__}{USE_DEMO && <> · {t("app.demoBadge")}</>}</footer>
          </div>
        </div>
      </div>
    </ScopeContext.Provider>
  );
}

/** A page section wrapper used by the tenant pages when the Super Admin has "all owners" selected but the page needs one. */
export function NeedOwner({ children }: { children: ReactNode }) {
  const { ownerId } = useScope();
  const { t, pick } = useI18n();
  const { owners, setOwnerId } = useScope();
  if (ownerId) return <>{children}</>;
  return (
    <div className="stack">
      <div className="muted">{t("adm.ownerScope")}:</div>
      <div className="row">{owners.map((o) => <button key={o.id} type="button" className="chip" onClick={() => setOwnerId(o.id)}>{pick(o.name)}</button>)}</div>
    </div>
  );
}
