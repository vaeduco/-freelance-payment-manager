import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profile";
import { formatCurrency } from "@/lib/utils";

export type CalendarEventType = "due" | "meeting" | "scheduled";

export interface CalendarEvent {
  date: string; // YYYY-MM-DD (in the freelancer's timezone)
  type: CalendarEventType;
  title: string;
  detail?: string;
  href?: string;
}

/** The freelancer-calendar date (YYYY-MM-DD) of a UTC instant in a timezone. */
function dateInTz(iso: string, tz: string): string {
  // en-CA renders as YYYY-MM-DD.
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });
}

/**
 * Events for the dashboard Calendar widget: invoice due dates (outstanding
 * only), confirmed bookings (meetings), and scheduled-to-send invoices.
 */
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const profile = await getProfile();
  const currency = profile?.currency ?? "USD";
  const tz = profile?.timezone || "UTC";

  const [{ data: invoices }, { data: bookings }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, service_description, amount, due_date, status, scheduled_send_at, client:clients(name)",
      )
      .eq("user_id", user.id),
    supabase
      .from("bookings")
      .select("guest_name, requested_start_at")
      .eq("user_id", user.id)
      .eq("status", "confirmed"),
  ]);

  const events: CalendarEvent[] = [];

  for (const inv of (invoices ?? []) as Array<Record<string, unknown>>) {
    const client = inv.client as { name?: string } | null;
    const who = client?.name ? ` · ${client.name}` : "";
    // Due date — outstanding invoices only (overdue is derived, stored as 'sent').
    if ((inv.status === "sent" || inv.status === "overdue") && inv.due_date) {
      events.push({
        date: inv.due_date as string,
        type: "due",
        title: `Invoice due: ${inv.service_description as string}`,
        detail: `${formatCurrency(Number(inv.amount), currency)}${who}`,
        href: `/invoices/${inv.id as string}`,
      });
    }
    // Scheduled to send — any invoice with a scheduled_send_at set.
    if (inv.scheduled_send_at) {
      events.push({
        date: dateInTz(inv.scheduled_send_at as string, tz),
        type: "scheduled",
        title: `Scheduled invoice: ${inv.service_description as string}`,
        detail: `${formatCurrency(Number(inv.amount), currency)}${who}`,
        href: `/invoices/${inv.id as string}`,
      });
    }
  }

  for (const b of (bookings ?? []) as Array<Record<string, unknown>>) {
    const time = new Date(b.requested_start_at as string).toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
    events.push({
      // Freelancer-tz date (matches the time detail + the /bookings view), not
      // the guest-tz requested_date — otherwise cross-midnight bookings land on
      // the wrong calendar day.
      date: dateInTz(b.requested_start_at as string, tz),
      type: "meeting",
      title: `Call with ${b.guest_name as string}`,
      detail: time,
      href: "/bookings",
    });
  }

  return events;
}
