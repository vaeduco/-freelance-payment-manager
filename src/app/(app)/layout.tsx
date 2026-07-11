import { ToastProvider } from "@/components/ui/toast";
import { Sidebar } from "@/components/app/sidebar";
import { MobileTopBar, MobileBottomNav } from "@/components/app/mobile-nav";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfile();

  const name =
    profile?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "there";
  const u = { name, email: user?.email ?? "" };

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-background">
        <Sidebar user={u} />
        <MobileTopBar user={u} />
        <main className="lg:pl-64">
          <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
            {children}
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </ToastProvider>
  );
}
