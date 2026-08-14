import { customAlphabet } from "nanoid";

import {
  consumeAuthRateLimit,
  deleteLoginCode,
  storeLoginCode,
} from "@/lib/auth/login-code";
import { sendEmail } from "@/lib/resend";

import VerificationCodeEmail from "@/components/emails/verification-link";

// Generate a 10-character uppercase alphanumeric verification code (like Linear's style)
const generateVerificationCode = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  10,
);

export const sendVerificationRequestEmail = async (params: {
  email: string;
  url: string;
}) => {
  const { url, email } = params;
  const normalizedEmail = email.trim().toLowerCase();

  const sendLimit = await consumeAuthRateLimit({
    scope: "login-code-send",
    subject: normalizedEmail,
    limit: 3,
    windowMs: 10 * 60 * 1000,
  });

  if (!sendLimit.success) {
    throw new Error("Too many login emails requested. Please try again later.");
  }

  // Generate verification code
  const code = generateVerificationCode();

  // Store the short-lived code before sending. This write must complete before
  // the request returns so the code can be used immediately.
  await storeLoginCode({
    email: normalizedEmail,
    code,
    callbackUrl: url,
  });

  const emailTemplate = VerificationCodeEmail({
    email: normalizedEmail,
    code,
  });

  try {
    // Authentication delivery is part of the request: only report success
    // after Resend has accepted the email.
    await sendEmail({
      to: normalizedEmail,
      system: true,
      subject: "Your BONUM login code",
      react: emailTemplate,
      test: process.env.NODE_ENV === "development",
    });
  } catch (error) {
    // Do not leave a usable code behind when its email was never accepted.
    await deleteLoginCode(normalizedEmail, code);
    throw error;
  }
};
