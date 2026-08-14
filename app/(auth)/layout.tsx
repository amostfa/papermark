import { Bricolage_Grotesque, Instrument_Serif } from "next/font/google";

import { AuthProviders } from "./providers";

const bonumSans = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bonum-sans",
});

const bonumDisplay = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-bonum-display",
  weight: "400",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProviders>
      <div className={`${bonumSans.variable} ${bonumDisplay.variable}`}>
        {children}
      </div>
    </AuthProviders>
  );
}
