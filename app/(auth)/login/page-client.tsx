"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useState } from "react";

import { SSOLogin } from "@/ee/features/security/sso";
import { signInWithPasskey } from "@teamhanko/passkeys-next-auth-provider/client";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";

import { BonumAuthShell } from "@/components/auth/bonum-auth-shell";
import { LastUsed, useLastUsed } from "@/components/hooks/useLastUsed";
import Google from "@/components/shared/icons/google";
import LinkedIn from "@/components/shared/icons/linkedin";
import Passkey from "@/components/shared/icons/passkey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const authMethods = ["google", "email", "linkedin", "passkey"] as const;
type AuthMethod = (typeof authMethods)[number];

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, { message: "Please enter a valid email." })
  .email({ message: "Please enter a valid email." });

const inputClassName =
  "h-12 rounded-none border border-[#14251d]/20 bg-[#fffdf7] px-4 text-[0.95rem] text-[#14251d] shadow-none transition-colors placeholder:text-[#14251d]/35 focus:border-[#42603d] focus:ring-2 focus:ring-[#b9e86d]/60 focus:ring-offset-0 disabled:bg-[#e9e5da] dark:border-[#14251d]/20 dark:bg-[#fffdf7]";

const providerButtonClassName =
  "h-12 w-full rounded-none border border-[#14251d]/15 bg-transparent font-medium text-[#14251d] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#14251d]/35 hover:bg-[#fffdf7] hover:text-[#14251d]";

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") ?? undefined;
  const authError = searchParams?.get("error");
  const isSSORequired = authError === "require-saml-sso";
  const isPasskeyAuthConfigured = Boolean(
    process.env.NEXT_PUBLIC_HANKO_TENANT_ID,
  );

  const [lastUsed, setLastUsed] = useLastUsed();
  const [clickedMethod, setClickedMethod] = useState<AuthMethod>();
  const [email, setEmail] = useState("");
  const [emailButtonText, setEmailButtonText] = useState("Continue with email");

  const emailValidation = emailSchema.safeParse(email);

  return (
    <BonumAuthShell
      eyebrow="BONUM workspace"
      title={
        <>
          Welcome back to the{" "}
          <em className="font-normal text-[#57704b]">work that matters.</em>
        </>
      }
      description={
        <p>
          Sign in to the secure workspace for BONUM founders, partners, and
          builders shaping ventures for good.
        </p>
      }
    >
      {isSSORequired ? (
        <div className="mb-5 flex items-start gap-3 border border-[#c87745]/30 bg-[#f5e3d4] px-4 py-3 text-[#6d361c]">
          <AlertCircle
            className="mt-0.5 h-5 w-5 flex-shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold">Your team requires SSO</p>
            <p className="mt-1 text-sm leading-5 opacity-80">
              Continue with your organization&apos;s identity provider below.
            </p>
          </div>
        </div>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!emailValidation.success) {
            toast.error(emailValidation.error.errors[0].message);
            return;
          }

          setClickedMethod("email");
          signIn("email", {
            email: emailValidation.data,
            redirect: false,
            ...(next && next.length > 0 ? { callbackUrl: next } : {}),
          }).then((response) => {
            if (response?.ok && !response.error) {
              setLastUsed("credentials");
              try {
                sessionStorage.setItem(
                  "pendingVerificationEmail",
                  emailValidation.data,
                );
              } catch {
                // The verification page also supports entering the email.
              }
              router.push("/auth/email");
              return;
            }

            setEmailButtonText("Could not send code — try again");
            toast.error("We couldn't send your login code. Please try again.");
            setClickedMethod(undefined);
          });
        }}
      >
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
            disabled={clickedMethod === "email"}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={cn(
              inputClassName,
              email.length > 0 && !emailValidation.success
                ? "border-[#b44f3a] focus:border-[#b44f3a] focus:ring-[#e5a18f]/40"
                : "border-[#14251d]/20",
            )}
          />
        </div>

        <div className="relative">
          <Button
            type="submit"
            loading={clickedMethod === "email"}
            disabled={!emailValidation.success || Boolean(clickedMethod)}
            className="h-12 w-full rounded-none bg-[#14251d] px-5 font-semibold text-[#f3f0e6] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#274431] disabled:bg-[#14251d] disabled:opacity-50"
          >
            {emailButtonText}
          </Button>
          {lastUsed === "credentials" ? (
            <LastUsed className="bg-[#dbe9c8] text-[#14251d]" />
          ) : null}
        </div>
      </form>

      <div className="my-6 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-[#14251d]/10" />
        <span className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[#14251d]/40">
          Or continue with
        </span>
        <span className="h-px flex-1 bg-[#14251d]/10" />
      </div>

      <div className="space-y-2.5">
        <div className="relative">
          <Button
            type="button"
            onClick={() => {
              setClickedMethod("google");
              setLastUsed("google");
              signIn("google", {
                ...(next && next.length > 0 ? { callbackUrl: next } : {}),
              }).then(() => setClickedMethod(undefined));
            }}
            loading={clickedMethod === "google"}
            disabled={Boolean(clickedMethod && clickedMethod !== "google")}
            className={providerButtonClassName}
          >
            <Google className="h-5 w-5" />
            <span>Continue with Google</span>
            {clickedMethod !== "google" && lastUsed === "google" ? (
              <LastUsed className="bg-[#dbe9c8] text-[#14251d]" />
            ) : null}
          </Button>
        </div>

        <div className="relative">
          <Button
            type="button"
            onClick={() => {
              setClickedMethod("linkedin");
              setLastUsed("linkedin");
              signIn("linkedin", {
                ...(next && next.length > 0 ? { callbackUrl: next } : {}),
              }).then(() => setClickedMethod(undefined));
            }}
            loading={clickedMethod === "linkedin"}
            disabled={Boolean(clickedMethod && clickedMethod !== "linkedin")}
            className={providerButtonClassName}
          >
            <LinkedIn />
            <span>Continue with LinkedIn</span>
            {clickedMethod !== "linkedin" && lastUsed === "linkedin" ? (
              <LastUsed className="bg-[#dbe9c8] text-[#14251d]" />
            ) : null}
          </Button>
        </div>

        {isPasskeyAuthConfigured ? (
          <div className="relative">
            <Button
              type="button"
              onClick={() => {
                setLastUsed("passkey");
                setClickedMethod("passkey");
                signInWithPasskey({
                  tenantId: process.env.NEXT_PUBLIC_HANKO_TENANT_ID as string,
                }).then(() => setClickedMethod(undefined));
              }}
              variant="outline"
              loading={clickedMethod === "passkey"}
              disabled={Boolean(clickedMethod && clickedMethod !== "passkey")}
              className={providerButtonClassName}
            >
              <Passkey className="h-4 w-4" />
              <span>Continue with a passkey</span>
              {lastUsed === "passkey" ? (
                <LastUsed className="bg-[#dbe9c8] text-[#14251d]" />
              ) : null}
            </Button>
          </div>
        ) : null}

        <div className="relative">
          <SSOLogin autoExpand={isSSORequired} />
        </div>
      </div>

      <div className="mt-7 flex items-start gap-3 border-t border-[#14251d]/10 pt-5 text-xs leading-5 text-[#536057]">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 flex-none text-[#57704b]"
          aria-hidden="true"
        />
        <p>
          Passwordless access. We&apos;ll email you a single-use code that
          expires in 15 minutes.
        </p>
      </div>
    </BonumAuthShell>
  );
}
