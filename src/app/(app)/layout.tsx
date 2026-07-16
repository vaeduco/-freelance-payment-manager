import { redirect } from "next/navigation";
import { ToastProvider } from "@/components/ui/toast";
import { SettingsProvider } from "@/components/settings/settings-provider";
import { Sidebar } from "@/components/app/sidebar";
import { MobileTopBar, MobileBottomNav } from "@/components/app/mobile-nav";
import { Footer } from "@/components/app/footer";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profile";
import { getUserSettings } from "@/lib/data/user-settings";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense-in-depth: enforce auth server-side, not just in middleware.
  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile();

  // First-run gate: send users who haven't finished (or skipped) onboarding to
  // /onboarding. All public/standalone routes live outside this (app) group, so
  // /onboarding, /reset-password, /terms, /privacy, and the print pages never
  // trigger this redirect (no loop).
  if (!profile?.onboarded_at) {
    redirect("/onboarding");
  }

  const name =
    profile?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "there";
  const u = { name, email: user?.email ?? "" };

  const settings = await getUserSettings();

  return (
    <SettingsProvider initial={settings}>
      <ToastProvider>
        <div className="min-h-dvh bg-background">
          <Sidebar user={u} />
          <MobileTopBar user={u} />
          <main className="lg:pl-64">
            <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
              {children}
              <Footer />
            </div>
          </main>
          <MobileBottomNav />
        </div>
      </ToastProvider>
    </SettingsProvider>
  );
}
