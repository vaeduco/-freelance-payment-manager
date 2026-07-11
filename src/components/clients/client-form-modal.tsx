"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  createClientRecord,
  updateClientRecord,
  type ClientInput,
} from "@/lib/actions/clients";
import type { Client } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ClientFormModal({
  open,
  onClose,
  client,
}: {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!client;

  const [name, setName] = useState(client?.name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [company, setCompany] = useState(client?.company ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [flagged, setFlagged] = useState(client?.is_flagged ?? false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast("Enter a client name", "error");

    const input: ClientInput = {
      name,
      email: email.trim() || null,
      company: company.trim() || null,
      notes: notes.trim() || null,
      is_flagged: flagged,
    };

    setLoading(true);
    const res = isEdit
      ? await updateClientRecord(client!.id, input)
      : await createClientRecord(input);
    setLoading(false);

    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast(isEdit ? "Client updated" : "Client added");
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit client" : "Add client"}
      description={
        isEdit ? "Update this client's details." : "Add someone you work with."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cl-name">Name</Label>
          <Input
            id="cl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cl-email">Email</Label>
            <Input
              id="cl-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-company">Company</Label>
            <Input
              id="cl-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cl-notes">Notes</Label>
          <Textarea
            id="cl-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering about this client"
            rows={2}
          />
        </div>

        <button
          type="button"
          onClick={() => setFlagged((f) => !f)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
            flagged
              ? "border-destructive/30 bg-destructive/10"
              : "border-border hover:bg-secondary",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Flag
              className={cn(
                "h-4 w-4",
                flagged ? "text-destructive" : "text-muted-foreground",
              )}
            />
            Flag as slow payer
          </span>
          <span
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              flagged ? "bg-destructive" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                flagged ? "translate-x-4" : "translate-x-0.5",
              )}
            />
          </span>
        </button>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Add client"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
