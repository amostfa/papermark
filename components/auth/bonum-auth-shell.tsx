import Link from "next/link";

import type { ReactNode } from "react";

import { ArrowUpRight, LockKeyhole } from "lucide-react";

import { cn } from "@/lib/utils";

const impactPillars = [
  { number: "01", label: "Fight poverty" },
  { number: "02", label: "Advance justice" },
  { number: "03", label: "Build what lasts" },
] as const;

export function BonumWordmark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/login"
      aria-label="BONUM workspace"
      className={cn(
        "group inline-flex w-fit items-center text-[#14251d]",
        className,
      )}
    >
      <span className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-current transition-transform duration-300 group-hover:rotate-12">
        <span className="h-3 w-3 rounded-full bg-[#b9e86d]" />
      </span>
      <span
        className={cn(
          "font-semibold uppercase tracking-[-0.055em]",
          compact ? "text-xl" : "text-2xl",
        )}
      >
        BONUM
      </span>
      <span className="ml-2 mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.28em] opacity-60">
        Works
      </span>
    </Link>
  );
}

export function BonumAuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#f3f0e6] text-[#14251d] [font-family:var(--font-bonum-sans)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 lg:hidden"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 100% 0%, rgba(185, 232, 109, 0.42), transparent 38%)",
        }}
      />

      <div className="relative grid min-h-dvh lg:grid-cols-[minmax(0,0.88fr)_minmax(32rem,1.12fr)]">
        <section className="relative flex min-h-dvh">
          <div className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col px-6 py-6 sm:px-10 sm:py-8 lg:px-12 xl:px-16">
            <header className="flex items-center justify-between">
              <BonumWordmark />
              <span className="hidden rounded-full border border-[#14251d]/15 px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[#14251d]/60 sm:inline-flex">
                Private workspace
              </span>
            </header>

            <div className="flex flex-1 items-center py-10 sm:py-14 lg:py-10">
              <div className="w-full max-w-[30rem] animate-fade-in">
                <div className="mb-10 border-l-2 border-[#8eb94f] pl-4 lg:hidden">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#42603d]">
                    A venture studio for GOOD
                  </p>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-[#14251d]/70">
                    Building the blueprint for a better world.
                  </p>
                </div>

                <p className="mb-4 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#57704b]">
                  {eyebrow}
                </p>
                <h1 className="max-w-[28rem] text-balance text-[2.8rem] leading-[0.98] tracking-[-0.035em] [font-family:var(--font-bonum-display)] sm:text-[3.6rem]">
                  {title}
                </h1>
                <div className="mt-5 max-w-md text-pretty text-sm leading-6 text-[#3f4d43] sm:text-[0.95rem]">
                  {description}
                </div>

                <div className="mt-9">{children}</div>
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#14251d]/10 pt-4 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-[#14251d]/50">
              <span className="inline-flex items-center gap-2">
                <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                Private by design
              </span>
              <a
                href="https://www.papermark.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-[#14251d]"
              >
                Powered by Papermark
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </a>
            </footer>
          </div>
        </section>

        <ImpactBlueprint />
      </div>
    </main>
  );
}

function ImpactBlueprint() {
  return (
    <aside className="relative hidden min-h-dvh overflow-hidden bg-[#14251d] text-[#f3f0e6] lg:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(243, 240, 230, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(243, 240, 230, 0.07) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div
        className="pointer-events-none absolute -right-28 top-16 h-[28rem] w-[28rem] rounded-full border border-[#b9e86d]/30"
        aria-hidden="true"
      >
        <div className="absolute inset-14 rounded-full border border-[#f3f0e6]/10" />
        <div className="absolute inset-[7.5rem] rounded-full border border-[#f3f0e6]/10" />
        <span className="absolute left-[4.25rem] top-[4.5rem] h-3 w-3 rounded-full bg-[#b9e86d] shadow-[0_0_0_8px_rgba(185,232,109,0.12)]" />
      </div>
      <div
        className="pointer-events-none absolute bottom-[-16rem] left-[-10rem] h-[32rem] w-[32rem] rounded-full bg-[#b9e86d]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full flex-col justify-between px-10 py-10 xl:px-16 xl:py-14 2xl:px-20">
        <div className="flex items-center justify-between border-b border-[#f3f0e6]/15 pb-5 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[#f3f0e6]/65">
          <span>Venture studio / Europe</span>
          <span className="inline-flex items-center gap-2 text-[#b9e86d]">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            For good
          </span>
        </div>

        <div className="max-w-[46rem] py-16 xl:py-20">
          <p className="mb-7 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#b9e86d]">
            Our operating principle
          </p>
          <h2 className="text-balance text-[4.2rem] leading-[0.91] tracking-[-0.035em] [font-family:var(--font-bonum-display)] xl:text-[5.5rem] 2xl:text-[6.5rem]">
            Good is not a side effect.
            <em className="mt-2 block font-normal text-[#b9e86d]">
              It is the system.
            </em>
          </h2>
          <p className="mt-9 max-w-xl text-pretty text-base leading-7 text-[#f3f0e6]/70 xl:text-lg xl:leading-8">
            BONUM builds not only companies, but the blueprint for a better
            world—ventures designed to fight poverty, challenge injustice, and
            make progress last.
          </p>
        </div>

        <div className="grid grid-cols-3 border-y border-[#f3f0e6]/15">
          {impactPillars.map((pillar, index) => (
            <div
              key={pillar.number}
              className={cn(
                "py-5 pr-4",
                index > 0 && "border-l border-[#f3f0e6]/15 pl-5",
              )}
            >
              <span className="block text-[0.6rem] font-semibold tracking-[0.18em] text-[#b9e86d]">
                {pillar.number}
              </span>
              <span className="mt-2 block text-xs font-medium uppercase tracking-[0.12em] text-[#f3f0e6]/80 xl:text-sm">
                {pillar.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
