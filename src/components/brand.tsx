import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-sm",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 16.5L9 11l3.5 3.5L20 7"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 7h5v5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Wordmark({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={size} />
      <span className="text-lg font-bold tracking-tight">
        Freelance<span className="text-primary">Flow</span>
      </span>
    </div>
  );
}
