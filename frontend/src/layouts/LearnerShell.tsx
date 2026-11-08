import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { useTheme } from "@/app/providers/ThemeProvider";
import { Avatar, Icon, LangToggle } from "@/components/ui/kit";
import { useViewport } from "@/hooks/useAsync";
import { levelInfo } from "@/lib/gamification";
import { api, USE_DEMO } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { ChatWidget } from "@/components/ChatWidget";
import type { IconName } from "@/constants/icons";

const NAV: { to: string; key: string; icon: IconName; end?: boolean }[] = [
  { to: "/app", key: "nav.home", icon: "home", end: true },
  { to: "/app/programs", key: "nav.programs", icon: "video" },
  { to: "/app/quests", key: "nav.quests", icon: "rocket" },
  { to: "/app/leaderboard", key: "nav.leaderboard", icon: "trophy" },
  { to: "/app/plan", key: "nav.plan", icon: "star" },
  { to: "/app/profile", key: "nav.profile", icon: "person" },
  { to: "/app/contact", key: "nav.contact", icon: "comment" },
];

/** The learner frame: brand, pill navigation (a bottom bar on a phone), the XP chip, theme and language, sign out. */
export function LearnerShell() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const { resolved, toggle } = useTheme();
  const { mobile } = useViewport();
  const nav = useNavigate();
  const { data: owners } = useAsync(() => api.owners(), [user?.ownerId]);
  if (!user) return null;
  const lv = levelInfo(user.xp);
  const myOwner = owners?.filter((o) => o.id === user.ownerId) ?? [];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="app-header">
        <div className="app-header-row">
          <NavLink to="/app" className="brand" aria-label="ELLP">
            <span className="brand-mark"><Icon name="play" size={16} /></span>
            <span>ELLP<small>{t("app.tagline")}</small></span>
          </NavLink>
          {!mobile && (
            <nav className="learn-nav" aria-label="main" style={{ marginLeft: 16 }}>
              {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end}><Icon name={n.icon} size={15} />{t(n.key)}</NavLink>)}
            </nav>
          )}
          <span className="hdr-spacer" />
          <span className="xp-chip" title={`${user.xp} XP`}>
            <span className="lvl">{lv.level}</span>{user.xp} XP
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--tone-warn-fg)" }}><Icon name="flame" size={13} />{user.streakDays}</span>
          </span>
          {!mobile && <LangToggle />}
          <button type="button" className="btn-icon" onClick={toggle} aria-label={t("app.theme")} title={t("app.theme")}><Icon name={resolved === "dark" ? "sun" : "moon"} size={18} /></button>
          <button type="button" className="btn-icon" onClick={() => nav("/app/profile")} aria-label={t("nav.profile")} style={{ padding: 3 }}><Avatar name={user.displayName} color={user.avatarColor} size={30} /></button>
          <button type="button" className="btn-icon" onClick={() => signOut().then(() => nav("/login"))} aria-label={t("app.signOut")} title={t("app.signOut")}><Icon name="signOut" size={18} /></button>
        </div>
      </header>
      <main className="page" style={{ flex: 1 }}><Outlet /></main>
      <footer className="app-footer">
        ELLP {t("app.version")} {__APP_VERSION__}{USE_DEMO && <> · {t("app.demoBadge")}: {t("app.demoHint")}</>}
        {mobile && <div style={{ marginTop: 8 }}><LangToggle /></div>}
      </footer>
      {myOwner.length > 0 && <ChatWidget owners={myOwner} />}
      {mobile && (
        <nav className="learn-bottom" aria-label="main">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end}><Icon name={n.icon} size={18} />{t(n.key)}</NavLink>)}
        </nav>
      )}
    </div>
  );
}
