import Link from "next/link";
import { Wordmark, Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { FileText, TrendingUp, Users, Calculator } from "lucide-react";

const FEATURES = [
  { icon: FileText, title: "Invoices", desc: "Create, send, and track every invoice." },
  { icon: TrendingUp, title: "Income", desc: "See what you earned, charted month by month." },
  { icon: Users, title: "Clients", desc: "Flag slow payers before they cost you." },
  { icon: Calculator, title: "Taxes", desc: "Auto-set aside the right amount." },
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
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-10 flex items-center gap-2.5">
          <Logo size={38} className="bg-white/15 backdrop-blur" />
          <span className="text-xl font-bold tracking-tight">FreelanceFlow</span>
        </div>
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-tight">
              Get paid faster.
              <br />
              Stress about taxes less.
            </h1>
            <p className="max-w-md text-white/80">
              The all-in-one payment and income manager built for freelancers.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
              >
                <f.icon className="mb-2 h-5 w-5" />
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-white/70">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-sm text-white/60">
          © {new Date().getFullYear()} FreelanceFlow
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
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
