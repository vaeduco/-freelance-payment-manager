import Link from "next/link";
import {
  FileText,
  BarChart3,
  Users,
  Calculator,
  Receipt,
  TrendingUp,
  CreditCard,
  Percent,
  type LucideIcon,
} from "lucide-react";
import { Wordmark, Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

interface Feature {
  icon: LucideIcon;
  corner: LucideIcon;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    icon: FileText,
    corner: Receipt,
    title: "Invoices",
    desc: "Create, send, and track every invoice.",
  },
  {
    icon: BarChart3,
    corner: TrendingUp,
    title: "Income",
    desc: "See what you earned, charted month by month.",
  },
  {
    icon: Users,
    corner: CreditCard,
    title: "Clients",
    desc: "Flag slow payers before they cost you.",
  },
  {
    icon: Calculator,
    corner: Percent,
    title: "Taxes",
    desc: "Auto-set aside the right amount.",
  },
];

export function AuthShell({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0a1b3c 0%, #123f74 46%, #185fa5 100%)",
        }}
      >
        {/* Faint dot + grid texture */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px, 96px 96px, 96px 96px",
          }}
        />
        {/* Soft circular glow near the center-right edge */}
        <div className="pointer-events-none absolute right-[-7rem] top-1/2 h-[26rem] w-[26rem] -translate-y-1/2 rounded-full bg-[#3d8bff]/30 blur-3xl" />

        {/* Wordmark */}
        <div className="relative z-10 flex items-center gap-2.5">
          <Logo size={36} />
          <span className="text-xl font-medium tracking-tight">
            FreelanceFlow
          </span>
        </div>

        {/* Headline + features */}
        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight">
              Get paid faster.
              <br />
              Stress about taxes less.
            </h1>
            <p className="max-w-md text-base text-white/70">
              The all-in-one payment and income manager built for freelancers.
            </p>
          </div>

          <div className="grid max-w-lg grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="relative overflow-hidden rounded-xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-sm"
              >
                <f.corner className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 text-white/[0.07]" />
                <div className="relative">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/10">
                    <f.icon className="h-[18px] w-[18px]" />
                  </div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/60">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-white/50">
          © {new Date().getFullYear()} FreelanceFlow
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col items-center justify-center bg-background p-6 sm:p-10">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle className="!border-transparent !bg-slate-900 !text-white hover:!bg-slate-800" />
        </div>
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <Link href="/">
              <Wordmark />
            </Link>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">{heading}</h2>
            <p className="text-sm text-muted-foreground">{subheading}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
