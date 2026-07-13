"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  Flag,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { ClientFormModal } from "@/components/clients/client-form-modal";
import {
  deleteClientRecord,
  setClientArchived,
  toggleClientFlag,
} from "@/lib/actions/clients";
import { SLOW_PAYER_DAYS } from "@/lib/constants";
import type { ClientWithStats } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

function isSlowPayer(client: ClientWithStats): boolean {
  return (
    client.is_flagged ||
    (client.avg_days_to_pay != null && client.avg_days_to_pay > SLOW_PAYER_DAYS)
  );
}

export function ClientsClient({
  clients,
  currency,
}: {
  clients: ClientWithStats[];
  currency: string;
}) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const archivedCount = useMemo(
    () => clients.filter((c) => c.is_archived).length,
    [clients],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (!showArchived && c.is_archived) return false;
      if (!q) return true;
      return [c.name, c.company, c.email]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q));
    });
  }, [clients, query, showArchived]);

  const hasClients = clients.some((c) => !c.is_archived) || archivedCount > 0;

  return (
    <div>
      <PageHeader title="Clients" description="Everyone you work with.">
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add Client
        </Button>
      </PageHeader>

      {hasClients && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, company, or email"
              aria-label="Search clients"
              className="pl-9"
            />
          </div>
          {archivedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived((s) => !s)}
              aria-pressed={showArchived}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                showArchived
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
            </button>
          )}
        </div>
      )}

      {!hasClients ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add the people and companies you work with to track payments and spot slow payers."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add Client
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        query.trim() ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description={`No clients match "${query.trim()}".`}
          />
        ) : (
          <EmptyState
            icon={Archive}
            title="No active clients"
            description={`All your clients are archived. Use "Show archived (${archivedCount})" to view them.`}
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} currency={currency} />
          ))}
        </div>
      )}

      <ClientFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}

function ClientCard({
  client,
  currency,
}: {
  client: ClientWithStats;
  currency: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const slow = isSlowPayer(client);

  async function handleArchive() {
    setArchiving(true);
    const res = await setClientArchived(client.id, !client.is_archived);
    setArchiving(false);
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast(client.is_archived ? "Client restored" : "Client archived", "info");
    router.refresh();
  }

  async function handleToggleFlag() {
    setFlagging(true);
    const res = await toggleClientFlag(client.id, !client.is_flagged);
    setFlagging(false);
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast(
      client.is_flagged ? "Flag removed" : "Flagged as slow payer",
      client.is_flagged ? "info" : "success",
    );
    router.refresh();
  }

  async function handleDelete() {
    const res = await deleteClientRecord(client.id);
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast("Client deleted");
    router.refresh();
  }

  return (
    <Card className={cn("flex flex-col p-5", client.is_archived && "opacity-60")}>
      <div className="flex items-start gap-3">
        <Avatar name={client.name} className="h-10 w-10 text-sm" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/clients/${client.id}`}
            className="block truncate font-semibold text-foreground transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
          >
            {client.name}
          </Link>
          {client.company && (
            <p className="truncate text-sm text-muted-foreground">
              {client.company}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {client.is_archived && (
            <Badge variant="secondary" className="shrink-0">
              <Archive className="h-3 w-3" />
              Archived
            </Badge>
          )}
          {slow && (
            <Badge variant="destructive" className="shrink-0">
              <Flag className="h-3 w-3" />
              Slow payer
            </Badge>
          )}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
        <Stat label="Total paid" value={formatCurrency(client.total_paid, currency)} />
        <Stat
          label="Outstanding"
          value={formatCurrency(client.outstanding, currency)}
          emphasis={client.outstanding > 0 ? "destructive" : undefined}
        />
        <Stat label="Invoices" value={String(client.invoice_count)} />
        <Stat
          label="Avg days to pay"
          value={client.avg_days_to_pay != null ? `${client.avg_days_to_pay}d` : "—"}
        />
      </dl>

      <div className="mt-5 flex items-center gap-1 border-t border-border pt-4">
        <Link
          href={`/clients/${client.id}`}
          className={cn(
            "mr-auto inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-foreground",
            "transition-colors hover:bg-secondary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          View
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setEditOpen(true)}
          aria-label={`Edit ${client.name}`}
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleToggleFlag}
          loading={flagging}
          aria-label={
            client.is_flagged
              ? `Remove slow-payer flag from ${client.name}`
              : `Flag ${client.name} as slow payer`
          }
          aria-pressed={client.is_flagged}
          title={client.is_flagged ? "Remove flag" : "Flag as slow payer"}
        >
          {!flagging && (
            <Flag
              className={cn(
                "h-4 w-4",
                client.is_flagged
                  ? "fill-destructive text-destructive"
                  : "text-muted-foreground",
              )}
            />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleArchive}
          loading={archiving}
          aria-label={
            client.is_archived
              ? `Restore ${client.name}`
              : `Archive ${client.name}`
          }
          title={client.is_archived ? "Restore" : "Archive"}
        >
          {!archiving &&
            (client.is_archived ? (
              <ArchiveRestore className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Archive className="h-4 w-4 text-muted-foreground" />
            ))}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          aria-label={`Delete ${client.name}`}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ClientFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        destructive
        title={`Delete ${client.name}?`}
        description="This removes the client permanently. Their invoices and payments are kept but will no longer be linked to a client."
        confirmLabel="Delete client"
      />
    </Card>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "destructive";
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-sm font-semibold tabular-nums",
          emphasis === "destructive" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
