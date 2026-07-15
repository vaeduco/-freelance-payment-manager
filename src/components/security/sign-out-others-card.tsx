"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { signOutOtherDevices } from "@/lib/actions/security";

export function SignOutOthersCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    const res = await signOutOtherDevices();
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast("Signed out of all other devices");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active devices</CardTitle>
        <CardDescription>
          Signed in somewhere you don&apos;t recognize? Sign out everywhere except
          this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <LogOut className="h-4 w-4" />
          Sign out all other devices
        </Button>
      </CardContent>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Sign out all other devices?"
        description="Every other session will be signed out. This device stays signed in. Anyone using your account elsewhere will need to sign in again."
        confirmLabel="Sign out others"
      />
    </Card>
  );
}
