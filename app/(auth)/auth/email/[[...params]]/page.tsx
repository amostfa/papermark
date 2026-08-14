import { Metadata } from "next";

import EmailVerificationClient from "./page-client";

const data = {
  description: "Verify your secure login to the BONUM workspace.",
  title: "Verify your login | BONUM",
  url: "/auth/email",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.bonumworks.com"),
  title: data.title,
  description: data.description,
  openGraph: {
    title: data.title,
    description: data.description,
    url: data.url,
    siteName: "BONUM",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: data.title,
    description: data.description,
  },
};

export default async function EmailVerificationPage() {
  return <EmailVerificationClient />;
}
