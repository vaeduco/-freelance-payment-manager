import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profile";
import {
  getSecurityEvents,
  getUnreadAlertCount,
} from "@/lib/data/security-events";
import { SecurityClient } from "@/components/security/security-client";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [profile, alerts, logins, activity, unreadCount] = await Promise.all([
    getProfile(),
    getSecurityEvents({ alertsOnly: true, limit: 50 }),
    getSecurityEvents({ category: "auth", limit: 50 }),
    getSecurityEvents({ limit: 100 }),
    getUnreadAlertCount(),
  ]);

  return (
    <div>
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </Link>

      <PageHeader
        title="Security Center"
        description="Protect your account and keep your data safe."
      />

      <SecurityClient
        email={user?.email ?? ""}
        emailConfirmed={!!user?.email_confirmed_at}
        passwordCheckedAt={profile?.password_checked_at ?? null}
        alerts={alerts}
        logins={logins}
        activity={activity}
        unreadCount={unreadCount}
      />
    </div>
  );
}
