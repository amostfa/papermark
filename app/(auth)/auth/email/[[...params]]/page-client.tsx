"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useEffect, useRef, useState } from "react";

import { ShieldCheck } from "lucide-react";

import { BonumAuthShell } from "@/components/auth/bonum-auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputClassName =
  "h-12 rounded-none border border-[#14251d]/20 bg-[#fffdf7] px-4 text-[0.95rem] text-[#14251d] shadow-none transition-colors placeholder:text-[#14251d]/35 focus:border-[#42603d] focus:ring-2 focus:ring-[#b9e86d]/60 focus:ring-offset-0 disabled:bg-[#e9e5da] dark:border-[#14251d]/20 dark:bg-[#fffdf7]";

export default function EmailVerificationClient() {
  const router = useRouter();
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [emailLocked, setEmailLocked] = useState(false);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    let focusTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      const pendingEmail = sessionStorage.getItem("pendingVerificationEmail");
      if (pendingEmail) {
        setEmail(pendingEmail);
        setEmailLocked(true);
        sessionStorage.removeItem("pendingVerificationEmail");
        focusTimer = setTimeout(() => codeInputRef.current?.focus(), 100);
      }
    } catch {
      // The form remains usable when sessionStorage is unavailable.
    }

    return () => {
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim().toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 410 ||
          response.status === 401 ||
          data.error?.includes("expired") ||
          data.error?.includes("Invalid code")
        ) {
          setIsExpired(true);
          setError("This code has expired or is invalid.");
        } else if (response.status === 429) {
          setError(
            data.error || "Too many attempts. Please wait before trying again.",
          );
        } else {
          setError(data.error || "Verification failed. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      if (data.callbackUrl) {
        router.push(data.callbackUrl);
        return;
      }

      setIsLoading(false);
      setError("Unable to complete sign-in. Please request a new code.");
    } catch {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (isExpired) {
    return (
      <BonumAuthShell
        eyebrow="Access expired"
        title={
          <>
            This code has reached the end of its{" "}
            <em className="font-normal text-[#57704b]">short life.</em>
          </>
        }
        description={
          <p>
            Login codes are single-use and expire after 15 minutes to keep the
            BONUM workspace secure.
          </p>
        }
      >
        <Button
          asChild
          className="h-12 w-full rounded-none bg-[#14251d] px-5 font-semibold text-[#f3f0e6] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#274431]"
        >
          <Link href="/login">Request a new code</Link>
        </Button>
      </BonumAuthShell>
    );
  }

  return (
    <BonumAuthShell
      eyebrow="One final step"
      title={
        <>
          Check your inbox. Then{" "}
          <em className="font-normal text-[#57704b]">let&apos;s build.</em>
        </>
      }
      description={
        emailLocked ? (
          <p>
            We sent a 10-character login code to{" "}
            <span className="break-all font-semibold text-[#14251d]">
              {email}
            </span>
            .
          </p>
        ) : (
          <p>Enter your email and the 10-character code we sent you.</p>
        )
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {!emailLocked ? (
          <div className="space-y-2">
            <Label
              className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#3f4d43]"
              htmlFor="email"
            >
              Work email
            </Label>
            <Input
              id="email"
              placeholder="name@company.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClassName}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label
            className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#3f4d43]"
            htmlFor="code"
          >
            Verification code
          </Label>
          <Input
            ref={codeInputRef}
            id="code"
            placeholder="Enter 10-character code"
            type="text"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            autoCorrect="off"
            disabled={isLoading}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={10}
            className={`${inputClassName} font-mono text-lg font-semibold uppercase tracking-[0.2em] placeholder:font-[family-name:var(--font-bonum-sans)] placeholder:text-sm placeholder:font-normal placeholder:normal-case placeholder:tracking-normal`}
          />
        </div>

        {error ? (
          <p
            className="border-l-2 border-[#b44f3a] bg-[#f5e3d4] px-3 py-2 text-sm text-[#7a3525]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading || !email || code.length < 10}
          className="h-12 w-full rounded-none bg-[#14251d] px-5 font-semibold text-[#f3f0e6] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#274431] disabled:bg-[#14251d] disabled:opacity-50"
        >
          Verify and continue
        </Button>
      </form>

      <div className="mt-6 flex items-start justify-between gap-4 border-t border-[#14251d]/10 pt-5 text-xs leading-5 text-[#536057]">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck
            className="h-4 w-4 flex-none text-[#57704b]"
            aria-hidden="true"
          />
          Single-use code
        </span>
        <Link
          href="/login"
          className="font-semibold text-[#38513a] underline decoration-[#8eb94f] underline-offset-4 hover:text-[#14251d]"
        >
          Send another code
        </Link>
      </div>
    </BonumAuthShell>
  );
}
