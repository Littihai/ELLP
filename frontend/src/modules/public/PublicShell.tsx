import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth, isStaff } from "@/app/providers/AuthProvider";
import { useI18n } from "@/app/providers/I18nProvider";
import { useTheme } from "@/app/providers/ThemeProvider";
import { Icon, LangToggle } from "@/components/ui/kit";
import { ChatWidget } from "@/components/ChatWidget";
import { useAsync } from "@/hooks/useAsync";
import { api, USE_DEMO } from "@/services";

/** The frame of the pages anyone may read: catalog, program details, sign-up. With the chat bubble. */
export function PublicShell() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { resolved, toggle } = useTheme();
  const { data: owners } = useAsync(() => api.publicOwners(), []);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="app-header">
        <div className="app-header-row">
          <Link to="/" className="brand" aria-label="ELLP"><span className="brand-mark"><Icon name="play" size={16} /></span><span>ELLP<small>{t("app.tagline")}</small></span></Link>
          <nav className="learn-nav" style={{ marginLeft: 12 }}>
            <NavLink to="/catalog"><Icon name="book" size={15} />{t("pub.catalog")}</NavLink>
          </nav>
          <span className="hdr-spacer" />
          <LangToggle />
          <button type="button" className="btn-icon" onClick={toggle} aria-label={t("app.theme")}><Icon name={resolved === "dark" ? "sun" : "moon"} size={18} /></button>
          {user ? (
            <Link to={isStaff(user) ? "/admin" : "/app"} className="btn btn-primary btn-sm">{isStaff(user) ? t("adm.console") : t("nav.home")} <Icon name="arrowRight" size={14} /></Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">{t("pub.signIn")}</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">{t("pub.signUp")}</Link>
            </>
          )}
        </div>
      </header>
      <main style={{ flex: 1 }}><Outlet /></main>
      <footer className="app-footer" style={{ paddingBottom: 24 }}>ELLP {t("app.version")} {__APP_VERSION__}{USE_DEMO && <> · {t("app.demoBadge")}: {t("app.demoHint")}</>}</footer>
      {owners && owners.length > 0 && <ChatWidget owners={owners} />}
    </div>
  );
}
