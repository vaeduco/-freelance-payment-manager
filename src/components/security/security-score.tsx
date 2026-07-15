"use client";

import { Check, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Check {
  key: string;
  label: string;
  weight: number;
  met: boolean;
  rec: string;
}

function ring(score: number) {
  if (score >= 80) return { stroke: "hsl(var(--success))", text: "text-success", label: "Strong" };
  if (score >= 50) return { stroke: "hsl(var(--warning))", text: "text-warning", label: "Fair" };
  return { stroke: "hsl(var(--destructive))", text: "text-destructive", label: "At risk" };
}

export function SecurityScore({
  mfaEnabled,
  emailConfirmed,
  passwordCheckedAt,
}: {
  mfaEnabled: boolean;
  emailConfirmed: boolean;
  passwordCheckedAt: string | null;
}) {
  const pwOk =
    !!passwordCheckedAt &&
    Date.now() - new Date(passwordCheckedAt).getTime() < 90 * 864e5;

  const checks: Check[] = [
    {
      key: "2fa",
      label: "Two-factor authentication",
      weight: 45,
      met: mfaEnabled,
      rec: "Enable 2FA below — it's the biggest single boost to your account security.",
    },
    {
      key: "email",
      label: "Email address confirmed",
      weight: 25,
      met: emailConfirmed,
      rec: "Confirm your email so you can recover your account if needed.",
    },
    {
      key: "pw",
      label: "Password checked against breaches",
      weight: 30,
      met: pwOk,
      rec: "Set or re-verify your password below; we check it against known breaches.",
    },
  ];

  const score = checks.reduce((s, c) => s + (c.met ? c.weight : 0), 0);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const band = ring(score);
  const recommendations = checks.filter((c) => !c.met);

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
        {/* Score ring */}
        <div className="relative mx-auto h-36 w-36 shrink-0 sm:mx-0">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r={r}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="12"
            />
            <circle
              cx="64"
              cy="64"
              r={r}
              fill="none"
              stroke={band.stroke}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - score / 100)}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-bold tabular-nums", band.text)}>
              {score}
            </span>
            <span className="text-xs font-medium text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Checklist + recommendations */}
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Security score
            </p>
            <p className={cn("text-lg font-semibold", band.text)}>{band.label}</p>
          </div>
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-sm">
                {c.met ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    c.met ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {c.label}
                  {!c.met && (
                    <span className="block text-xs text-muted-foreground">
                      {c.rec}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {recommendations.length === 0 && (
            <p className="text-sm text-success">
              Nice — your account is well protected.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
