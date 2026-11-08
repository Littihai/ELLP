import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider";
import { I18nProvider } from "./providers/I18nProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { RequireStaff, RequireSuper, RequireUser } from "@/layouts/Guards";
import { LearnerShell } from "@/layouts/LearnerShell";
import { AdminShell } from "@/layouts/AdminShell";
import { LoginPage } from "@/modules/auth/LoginPage";
import { HomePage } from "@/modules/learn/HomePage";
import { ProgramPage, ProgramsPage } from "@/modules/learn/ProgramsPage";
import { LessonPage } from "@/modules/learn/LessonPage";
import { QuestsPage } from "@/modules/learn/QuestsPage";
import { LeaderboardPage } from "@/modules/learn/LeaderboardPage";
import { ProfilePage } from "@/modules/learn/ProfilePage";
import { ContactPage } from "@/modules/learn/ContactPage";
import { DashboardPage } from "@/modules/admin/DashboardPage";
import { OwnersPage } from "@/modules/admin/OwnersPage";
import { ProgramsAdminPage } from "@/modules/admin/ProgramsAdminPage";
import { LessonsAdminPage } from "@/modules/admin/LessonsAdminPage";
import { QuestsAdminPage } from "@/modules/admin/QuestsAdminPage";
import { MembersPage } from "@/modules/admin/MembersPage";
import { InboxPage } from "@/modules/admin/InboxPage";
import { MailLogPage } from "@/modules/admin/MailLogPage";
import { SettingsPage } from "@/modules/admin/SettingsPage";
import { ApprovalsPage } from "@/modules/admin/ApprovalsPage";
import { ChatAdminPage } from "@/modules/admin/ChatAdminPage";
import { IntegrityPage } from "@/modules/admin/IntegrityPage";
import { PlanPage } from "@/modules/learn/PlanPage";
import { PublicShell } from "@/modules/public/PublicShell";
import { LandingPage } from "@/modules/public/LandingPage";
import { PublicProgramPage } from "@/modules/public/PublicProgramPage";
import { SignupPage } from "@/modules/public/SignupPage";

/** Two worlds behind two doors: /login → /app/* (learners) and /admin/login → /admin/* (staff). */
export function App() {
  useEffect(() => { const b = document.getElementById("boot"); if (b) { b.classList.add("boot-out"); window.setTimeout(() => b.remove(), 300); } }, []);
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<PublicShell />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/catalog" element={<LandingPage catalogOnly />} />
                  <Route path="/catalog/:programId" element={<PublicProgramPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                </Route>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin/login" element={<LoginPage admin />} />

                <Route element={<RequireUser />}>
                  <Route path="/app" element={<LearnerShell />}>
                    <Route index element={<HomePage />} />
                    <Route path="programs" element={<ProgramsPage />} />
                    <Route path="programs/:programId" element={<ProgramPage />} />
                    <Route path="lessons/:lessonId" element={<LessonPage />} />
                    <Route path="quests" element={<QuestsPage />} />
                    <Route path="leaderboard" element={<LeaderboardPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="plan" element={<PlanPage />} />
                    <Route path="contact" element={<ContactPage />} />
                  </Route>
                </Route>

                <Route element={<RequireStaff />}>
                  <Route path="/admin" element={<AdminShell />}>
                    <Route index element={<DashboardPage />} />
                    <Route element={<RequireSuper />}><Route path="owners" element={<OwnersPage />} /></Route>
                    <Route path="programs" element={<ProgramsAdminPage />} />
                    <Route path="lessons" element={<LessonsAdminPage />} />
                    <Route path="quests" element={<QuestsAdminPage />} />
                    <Route path="members" element={<MembersPage />} />
                    <Route path="approvals" element={<ApprovalsPage />} />
                    <Route path="chat" element={<ChatAdminPage />} />
                    <Route path="integrity" element={<IntegrityPage />} />
                    <Route path="inbox" element={<InboxPage />} />
                    <Route path="mail" element={<MailLogPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
