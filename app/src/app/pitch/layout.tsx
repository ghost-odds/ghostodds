import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GhostOdds — Investor Pitch",
  description: "No-KYC prediction markets on Solana with automated oracle resolution",
};

export default function PitchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {children}
    </div>
  );
}
