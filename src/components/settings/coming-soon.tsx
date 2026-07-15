import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/ui/misc";

/**
 * Shared placeholder for Settings sub-pages that are stubbed for now
 * (Notifications, Appearance, Integrations). Keeps the routes real so the
 * sidebar's Settings dropdown never links to a 404.
 */
export function ComingSoon({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title={`${title} — coming soon`}
        description="This section isn't available yet. Check back soon."
      />
    </div>
  );
}
