"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateLogoPath } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB (matches the bucket limit)

export function LogoUploader({
  initialLogoUrl,
}: {
  initialLogoUrl: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialLogoUrl);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      toast("Use a PNG, JPG, WebP, or SVG image.", "error");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast("Logo must be 2 MB or smaller.", "error");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast("You need to be signed in.", "error");
        return;
      }
      // Fixed per-user key so replacements overwrite (no orphaned files); the
      // first path segment must equal auth.uid() to satisfy the storage policy.
      const path = `${user.id}/logo`;
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (upErr) {
        toast(upErr.message, "error");
        return;
      }
      const res = await updateLogoPath(path);
      if ("error" in res) {
        toast(res.error, "error");
        return;
      }
      setPreview(URL.createObjectURL(file));
      toast("Logo updated");
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const res = await updateLogoPath(null);
      if ("error" in res) {
        toast(res.error, "error");
        return;
      }
      setPreview(null);
      toast("Logo removed");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Business logo"
            className="h-full w-full object-contain"
          />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          onChange={handleFile}
          className="hidden"
          id="logo-file"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {preview ? "Change logo" : "Upload logo"}
        </Button>
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={handleRemove}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        )}
        <p className="w-full text-xs text-muted-foreground">
          PNG, JPG, WebP, or SVG · up to 2 MB
        </p>
      </div>
    </div>
  );
}
