import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { Loading } from "@/components/ui/kit";

/** Learner routes: anyone signed in (staff may preview the learner view too). */
export function RequireUser() {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <Outlet />;
}

/** Admin routes: owners, admins and the Super Admin only. A learner is sent to their own home. */
export function RequireStaff() {
  const { user, ready, staff } = useAuth();
  const loc = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  if (!staff) return <Navigate to="/app" replace />;
  return <Outlet />;
}

/** The Super Admin only (owners page). */
export function RequireSuper() {
  const { user } = useAuth();
  if (user?.role !== "superadmin") return <Navigate to="/admin" replace />;
  return <Outlet />;
}
