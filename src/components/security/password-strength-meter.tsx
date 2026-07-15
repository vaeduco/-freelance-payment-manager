"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordScore {
  /** 0 (very weak) … 4 (strong). */
  score: number;
  label: string;
  suggestions: string[];
}

const COMMON = [
  "password",
  "letmein",
  "qwerty",
  "admin",
  "welcome",
  "iloveyou",
  "monkey",
  "dragon",
];

/** Lightweight, dependency-free password strength heuristic (0–4). */
export function scorePassword(pw: string): PasswordScore {
  if (!pw) return { score: 0, label: "", suggestions: [] };
  const suggestions: string[] = [];
  let score = 0;
  const len = pw.length;

  if (len >= 8) score++;
  else suggestions.push("Use at least 8 characters");
  if (len >= 12) score++;
  else if (len >= 8) suggestions.push("12+ characters is much stronger");

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(pw),
  ).length;
  if (classes >= 3) score++;
  else suggestions.push("Mix upper- & lower-case, numbers, and symbols");
  if (classes === 4 && len >= 12) score++;

  const lower = pw.toLowerCase();
  const weak =
    /^(.)\1+$/.test(pw) ||
    /0123|1234|2345|3456|4567|5678|6789|abcd|qwer/.test(lower) ||
    COMMON.some((w) => lower.includes(w));
  if (weak) {
    score = Math.min(score, 1);
    suggestions.push("Avoid common words, sequences, or repeated characters");
  }

  score = Math.max(0, Math.min(4, score));
  const label = ["Very weak", "Weak", "Fair", "Good", "Strong"][score];
  return { score, label, suggestions };
}

const BAR = ["bg-destructive", "bg-destructive", "bg-warning", "bg-success", "bg-success"];
const TEXT = ["text-destructive", "text-destructive", "text-warning", "text-success", "text-success"];

/**
 * Live password strength meter. Pass the current `password`; optionally pass a
 * `breachCount` (from checkPasswordPwned) to surface a breach warning.
 */
export function PasswordStrengthMeter({
  password,
  breachCount,
  className,
}: {
  password: string;
  breachCount?: number | null;
  className?: string;
}) {
  if (!password) return null;
  const { score, label, suggestions } = scorePassword(password);
  const breached = (breachCount ?? 0) > 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= score - 1 && !breached ? BAR[score] : "bg-muted",
              breached && "bg-destructive",
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-medium", breached ? "text-destructive" : TEXT[score])}>
          {breached ? "Compromised password" : `Strength: ${label}`}
        </span>
      </div>
      {breached ? (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Found in {breachCount!.toLocaleString()} known data breach
          {breachCount === 1 ? "" : "es"}. Choose a different password.
        </p>
      ) : breachCount === 0 ? (
        <p className="flex items-start gap-1.5 text-xs text-success">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Not found in known breaches.
        </p>
      ) : suggestions.length > 0 ? (
        <p className="text-xs text-muted-foreground">{suggestions[0]}</p>
      ) : null}
    </div>
  );
}
