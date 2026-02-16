"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/* ── Intersection Observer fade-in ── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("pitch-visible");
          obs.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useFadeIn();
  return (
    <section
      ref={ref}
      id={id}
      className={`pitch-section py-24 md:py-32 px-6 ${className}`}
    >
      <div className="max-w-4xl mx-auto">{children}</div>
    </section>
  );
}

function Divider() {
  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
    </div>
  );
}

function GradientText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent ${className}`}
    >
      {children}
    </span>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-6">
      <div className="font-mono text-3xl md:text-4xl font-bold mb-2">
        <GradientText>{value}</GradientText>
      </div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}

/* ── Ghost SVG Icon ── */
function GhostIcon({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M32 4C18.745 4 8 14.745 8 28v24c0 2 1.5 4 3.5 4s3-2 4-4c1-2 2.5-4 4.5-4s3.5 2 4.5 4c1 2 2 4 4 4s3-2 4-4c1-2 2.5-4 4.5-4s3.5 2 4.5 4c1 2 2 4 3.5 4s3.5-2 3.5-4V28C56 14.745 45.255 4 32 4z"
        fill="url(#ghost-grad)"
        opacity="0.9"
      />
      <circle cx="24" cy="26" r="4" fill="#0a0a0f" />
      <circle cx="40" cy="26" r="4" fill="#0a0a0f" />
      <defs>
        <linearGradient id="ghost-grad" x1="8" y1="4" x2="56" y2="56">
          <stop stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Problem Card ── */
function ProblemCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-6">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── Solution Card ── */
function SolutionCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="border border-purple-500/20 bg-purple-500/5 rounded-xl p-6">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── Flow Step ── */
function FlowStep({
  step,
  icon,
  title,
  desc,
}: {
  step: number;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center text-center max-w-[180px]">
      <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl mb-3">
        {icon}
      </div>
      <div className="text-purple-400 font-mono text-xs mb-1">0{step}</div>
      <h4 className="text-white font-semibold text-sm mb-1">{title}</h4>
      <p className="text-gray-500 text-xs">{desc}</p>
    </div>
  );
}

/* ── Comparison Table ── */
function CompTable() {
  const rows: [string, string, string, string, string][] = [
    ["KYC Required", "Yes (geo-blocked US)", "Full ID + SSN", "No", "No"],
    ["Chain", "Polygon", "Centralized", "Solana", "Solana"],
    ["Oracle", "UMA (human vote)", "Internal", "Switchboard", "Pyth Network"],
    ["Resolution", "24-48h disputes", "Manual", "~Minutes", "Seconds (auto)"],
    ["Market Creation", "Admin only", "Admin only", "Permissioned", "Curated → Permissionless"],
    ["Fund Safety", "Multisig admin keys", "Custodial", "Program-owned", "PDA vaults, no admin keys"],
    ["Fees", "~2%", "~5-10%", "~0.1%", "2%"],
  ];

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-gray-500 font-medium">Feature</th>
            <th className="py-3 px-4 text-gray-400 font-medium">Polymarket</th>
            <th className="py-3 px-4 text-gray-400 font-medium">Kalshi</th>
            <th className="py-3 px-4 text-gray-400 font-medium">Drift BET</th>
            <th className="py-3 px-4 font-medium bg-purple-500/10 rounded-t-lg">
              <GradientText>GhostOdds</GradientText>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([feature, poly, kalshi, drift, ghost], i) => (
            <tr key={i} className="border-b border-white/5">
              <td className="py-3 px-4 text-gray-300 font-medium">{feature}</td>
              <td className="py-3 px-4 text-gray-500 text-center">{poly}</td>
              <td className="py-3 px-4 text-gray-500 text-center">{kalshi}</td>
              <td className="py-3 px-4 text-gray-500 text-center">{drift}</td>
              <td className="py-3 px-4 text-center bg-purple-500/5 text-purple-300 font-medium">
                {ghost}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Roadmap Phase ── */
function Phase({
  phase,
  title,
  when,
  items,
  active,
}: {
  phase: number;
  title: string;
  when: string;
  items: string[];
  active?: boolean;
}) {
  return (
    <div
      className={`border rounded-xl p-6 ${
        active
          ? "border-purple-500/40 bg-purple-500/5"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono font-bold ${
            active
              ? "bg-purple-500 text-white"
              : "bg-white/10 text-gray-400"
          }`}
        >
          {phase}
        </div>
        <div>
          <h3 className="text-white font-semibold">{title}</h3>
          <span className="text-gray-500 text-xs">{when}</span>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-gray-400 text-sm flex items-start gap-2">
            <span className="text-purple-400 mt-0.5">›</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Revenue Row ── */
function RevenueRow({
  volume,
  revenue,
  highlight,
}: {
  volume: string;
  revenue: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-center py-3 px-4 rounded-lg ${
        highlight ? "bg-purple-500/10 border border-purple-500/20" : ""
      }`}
    >
      <span className="text-gray-400">{volume} monthly volume</span>
      <span className={`font-mono font-bold ${highlight ? "text-purple-300 text-lg" : "text-white"}`}>
        {revenue}/mo
      </span>
    </div>
  );
}

/* ── Revenue Calculator ── */
const PRESETS = [
  { label: "Early Stage", traders: 500, txPerTrader: 8, avgTx: 50 },
  { label: "Growth", traders: 5000, txPerTrader: 12, avgTx: 120 },
  { label: "Polymarket Scale", traders: 50000, txPerTrader: 15, avgTx: 200 },
];

function RevenueCalculator() {
  const [traders, setTraders] = useState(5000);
  const [txPerTrader, setTxPerTrader] = useState(12);
  const [avgTx, setAvgTx] = useState(120);
  const [feePct, setFeePct] = useState(2);

  const monthlyVolume = traders * txPerTrader * avgTx;
  const monthlyRevenue = monthlyVolume * (feePct / 100);
  const annualRevenue = monthlyRevenue * 12;

  const fmt = (n: number) => {
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  return (
    <div className="border border-white/10 rounded-2xl p-6 md:p-8 bg-white/[0.02]">
      <h3 className="text-white font-semibold text-lg mb-6">Revenue Calculator</h3>

      {/* Presets */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => { setTraders(p.traders); setTxPerTrader(p.txPerTrader); setAvgTx(p.avgTx); }}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 text-gray-400 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10 transition-all cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">Monthly Active Traders</label>
            <span className="text-sm font-mono text-white">{traders.toLocaleString()}</span>
          </div>
          <input type="range" min={100} max={100000} step={100} value={traders} onChange={(e) => setTraders(Number(e.target.value))}
            className="w-full accent-purple-500 h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer" />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>100</span><span>100K</span></div>
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">Trades per Trader / Month</label>
            <span className="text-sm font-mono text-white">{txPerTrader}</span>
          </div>
          <input type="range" min={1} max={50} step={1} value={txPerTrader} onChange={(e) => setTxPerTrader(Number(e.target.value))}
            className="w-full accent-purple-500 h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer" />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>1</span><span>50</span></div>
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">Avg Transaction Size</label>
            <span className="text-sm font-mono text-white">${avgTx}</span>
          </div>
          <input type="range" min={10} max={1000} step={10} value={avgTx} onChange={(e) => setAvgTx(Number(e.target.value))}
            className="w-full accent-purple-500 h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer" />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>$10</span><span>$1,000</span></div>
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">Protocol Fee</label>
            <span className="text-sm font-mono text-white">{feePct}%</span>
          </div>
          <input type="range" min={0.5} max={5} step={0.5} value={feePct} onChange={(e) => setFeePct(Number(e.target.value))}
            className="w-full accent-purple-500 h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer" />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>0.5%</span><span>5%</span></div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 rounded-xl bg-black/30">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Monthly Volume</div>
          <div className="text-xl md:text-2xl font-mono font-bold text-white">{fmt(monthlyVolume)}</div>
        </div>
        <div className="text-center p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Monthly Revenue</div>
          <div className="text-xl md:text-2xl font-mono font-bold text-purple-300">{fmt(monthlyRevenue)}</div>
        </div>
        <div className="text-center p-4 rounded-xl bg-black/30">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Annual Revenue</div>
          <div className="text-xl md:text-2xl font-mono font-bold text-white">{fmt(annualRevenue)}</div>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ PAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function PitchPage() {
  return (
    <>
      {/* Global styles for animations */}
      <style jsx global>{`
        .pitch-section {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pitch-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @keyframes gradient-shift {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes bar-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        {/* Animated gradient bg */}
        <div
          className="absolute inset-0 animate-gradient opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(99,102,241,0.1) 0%, transparent 50%)",
            backgroundSize: "200% 200%",
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="relative z-10 text-center max-w-3xl">
          <div className="flex justify-center mb-8 animate-float">
            <GhostIcon size={72} />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-4">
            Ghost<GradientText>Odds</GradientText>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 font-light mb-6">
            Predict. Trade. No trace.
          </p>
          <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
            No-KYC prediction markets on Solana with automated oracle resolution
          </p>

          {/* Scroll indicator */}
          <div className="mt-16 flex flex-col items-center gap-2 text-gray-600">
            <span className="text-xs tracking-widest uppercase">Scroll</span>
            <div className="w-px h-8 bg-gradient-to-b from-gray-600 to-transparent" />
          </div>
        </div>
      </section>

      <Divider />

      {/* ── THE OPPORTUNITY ── */}
      <Section id="opportunity">
        <p className="text-purple-400 font-mono text-sm tracking-wider uppercase mb-4">
          The Opportunity
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Prediction markets are the{" "}
          <GradientText>fastest-growing segment</GradientText> in crypto
        </h2>
        <p className="text-gray-400 text-lg leading-relaxed mb-12">
          2024-2025 saw prediction markets explode from niche to mainstream.
          The US election alone drove billions in volume. This market is just
          getting started — and the incumbents are vulnerable.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatCard value="$44B+" label="2025 prediction market volume" />
          <StatCard value="85-90%" label="Polymarket + Kalshi market share" />
          <StatCard value="$11B" label="Kalshi valuation" />
          <StatCard value="$9B" label="Polymarket valuation" />
        </div>
        <p className="text-gray-500 text-center">
          But every major platform has critical flaws.
        </p>
      </Section>

      <Divider />

      {/* ── MARKET SIZE ── */}
      <Section id="market-size">
        <p className="text-purple-400 font-mono text-sm tracking-wider uppercase mb-4">
          Market Size
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          A <GradientText>$44 billion</GradientText> market growing at 200% YoY
        </h2>
        <p className="text-gray-400 text-lg leading-relaxed mb-12">
          Prediction markets are the fastest-growing segment in both crypto and
          fintech — outpacing online gambling (10% CAGR) and online poker (29%
          CAGR) by an order of magnitude. At $44B, prediction market volume is
          already ~34% of the entire online gambling industry despite being a
          fraction of its age.
        </p>

        {/* ── Horizontal bar chart ── */}
        <div className="space-y-6 mb-14">
          {/* Online Gambling */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-white font-semibold">Online Gambling</span>
                <span className="text-gray-600 text-xs ml-2">GlobeNewsWire</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-white font-bold">$130.2B</span>
                <span className="text-gray-500 text-xs ml-2">10% CAGR</span>
              </div>
            </div>
            <div className="h-8 rounded-lg bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-lg bg-gray-600/40"
                style={{ width: "100%" }}
              />
            </div>
            <p className="text-gray-600 text-xs mt-1">→ $143B projected 2026</p>
          </div>

          {/* Prediction Markets */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-white font-semibold">Prediction Markets</span>
                <span className="text-gray-600 text-xs ml-2">Gambling Insider</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold"><GradientText>$44B+</GradientText></span>
                <span className="text-purple-400 text-xs ml-2 font-semibold">~200% YoY 🚀</span>
              </div>
            </div>
            <div className="h-8 rounded-lg bg-white/5 overflow-hidden relative">
              <div
                className="h-full rounded-lg animate-bar-pulse"
                style={{
                  width: "33.8%",
                  background: "linear-gradient(90deg, #7c3aed, #6366f1, #7c3aed)",
                  backgroundSize: "200% 100%",
                  animation: "bar-shimmer 2s ease-in-out infinite",
                }}
              />
            </div>
            <p className="text-gray-600 text-xs mt-1">↑ from ~$15B in 2024 — fastest-growing segment</p>
          </div>

          {/* Crypto Gambling */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-white font-semibold">Crypto Gambling</span>
                <span className="text-gray-600 text-xs ml-2">Blockonomi</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-white font-bold">$10B+</span>
                <span className="text-gray-500 text-xs ml-2">projected 2026</span>
              </div>
            </div>
            <div className="h-8 rounded-lg bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-lg bg-gray-600/40"
                style={{ width: "7.7%" }}
              />
            </div>
          </div>

          {/* Online Poker */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-white font-semibold">Online Poker</span>
                <span className="text-gray-600 text-xs ml-2">MarkNTel</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-white font-bold">$6.3B</span>
                <span className="text-gray-500 text-xs ml-2">29% CAGR</span>
              </div>
            </div>
            <div className="h-8 rounded-lg bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-lg bg-gray-600/40"
                style={{ width: "4.8%" }}
              />
            </div>
            <p className="text-gray-600 text-xs mt-1">→ $37B projected by 2030</p>
          </div>
        </div>

        {/* ── Key stats grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02] text-center">
            <div className="font-mono text-2xl font-bold text-white mb-1">$50B</div>
            <p className="text-gray-500 text-xs">Kalshi annualized volume 2025<br /><span className="text-gray-600">up from $300M prior year</span></p>
          </div>
          <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02] text-center">
            <div className="font-mono text-2xl font-bold text-white mb-1">$701.7M</div>
            <p className="text-gray-500 text-xs">Single-day volume record<br /><span className="text-gray-600">January 2026</span></p>
          </div>
          <div className="border border-purple-500/20 rounded-xl p-5 bg-purple-500/5 text-center col-span-2 md:col-span-1">
            <div className="font-mono text-2xl font-bold mb-1"><GradientText>85-90%</GradientText></div>
            <p className="text-gray-500 text-xs">Polymarket + Kalshi<br /><span className="text-gray-600">control of market volume</span></p>
          </div>
        </div>

        {/* Incoming players */}
        <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
          <p className="text-gray-400 text-sm mb-3">
            <span className="text-white font-semibold">Everyone is entering this space.</span>{" "}
            DraftKings, Gemini, and Crypto.com are all building or acquiring prediction market products.
            The window for a no-KYC, oracle-native alternative is now.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            {["Kalshi — $11B (Sequoia-led)", "Polymarket — $9B", "DraftKings", "Gemini", "Crypto.com"].map((name, i) => (
              <span key={i} className="text-xs font-mono px-3 py-1.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                {name}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── THE PROBLEM ── */}
      <Section id="problem">
        <p className="text-purple-400 font-mono text-sm tracking-wider uppercase mb-4">
          The Problem
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Existing platforms are{" "}
          <span className="text-red-400">broken by design</span>
        </h2>
        <p className="text-gray-400 text-lg mb-10">
          They promise decentralization but deliver centralized control,
          identity requirements, and manipulable oracles.
        </p>
        <div className="grid md:grid-cols-2 gap-5">
          <ProblemCard
            icon="🚫"
            title="KYC Walls"
            desc="Polymarket geo-blocks US users. Kalshi requires full identity verification with SSN. Millions of crypto-native users are locked out of the fastest-growing market."
          />
          <ProblemCard
            icon="⚠️"
            title="Oracle Manipulation"
            desc="Polymarket's UMA oracle was exploited in 2025: a $7M Ukraine minerals bet failed to pay out despite the confirmed outcome. Wealthy token holders overrode the truth."
          />
          <ProblemCard
            icon="⏳"
            title="Slow Resolution"
            desc="24-48 hour dispute windows lock user capital. Traders wait days for outcomes that are obvious within minutes. Capital efficiency is destroyed."
          />
          <ProblemCard
            icon="🔑"
            title="Centralized Control"
            desc='Admin keys, multisigs, manual intervention. Markets can be paused, funds frozen, outcomes overridden. "Decentralized" in name only.'
          />
        </div>
      </Section>

      <Divider />

      {/* ── THE SOLUTION ── */}
      <Section id="solution">
        <p className="text-purple-400 font-mono text-sm tracking-wider uppercase mb-4">
          The Solution
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          GhostOdds eliminates{" "}
          <GradientText>every friction point</GradientText>
        </h2>
        <p className="text-gray-400 text-lg mb-10">
          Truly permissionless prediction markets powered by Pyth oracle feeds
          on Solana.
        </p>
        <div className="grid md:grid-cols-2 gap-5">
          <SolutionCard
            icon="🔓"
            title="No KYC"
            desc="Connect any Solana wallet and trade immediately. No sign-ups, no identity checks, no geo-restrictions. Your wallet is your account."
          />
          <SolutionCard
            icon="⚡"
            title="Pyth Auto-Resolution"
            desc="Markets resolve in seconds using Pyth Network price feeds — trusted by $100B+ in DeFi. 400ms price updates. No human voting, no disputes."
          />
          <SolutionCard
            icon="🔒"
            title="Immutable Smart Contracts"
            desc="No admin drain keys. No multisig overrides. All funds held in PDA-owned vaults controlled solely by program logic. Code is law."
          />
          <SolutionCard
            icon="💨"
            title="Solana Speed"
            desc="Sub-second finality. Sub-cent transaction fees. 2% trading fee — competitive with the best in the market. Built for high-frequency prediction trading."
          />
        </div>
      </Section>

      <Divider />

      {/* ── HOW IT WORKS ── */}
      <Section id="how">
        <p className="text-purple-400 font-mono text-sm tracking-wider uppercase mb-4">
          How It Works
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">
          Five steps. <GradientText>Zero friction.</GradientText>
        </h2>
        <div className="flex flex-wrap justify-center gap-6 md:gap-4 mb-8">
          <FlowStep
            step={1}
            icon="👛"
            title="Connect Wallet"
            desc="Any Solana wallet — Phantom, Solflare, etc."
          />
          <div className="hidden md:flex items-center text-gray-600 text-xl">→</div>
          <FlowStep
            step={2}
            icon="📊"
            title="Browse Markets"
            desc="Crypto prices, DeFi metrics, live odds"
          />
          <div className="hidden md:flex items-center text-gray-600 text-xl">→</div>
          <FlowStep
            step={3}
            icon="💰"
            title="Buy Shares"
            desc="YES or NO — AMM pricing reflects probability"
          />
          <div className="hidden md:flex items-center text-gray-600 text-xl">→</div>
          <FlowStep
            step={4}
            icon="🔮"
            title="Auto-Resolve"
            desc="Pyth reads price at expiry, settles instantly"
          />
          <div className="hidden md:flex items-center text-gray-600 text-xl">→</div>
          <FlowStep
            step={5}
            icon="✅"
            title="Redeem"
            desc="Winners get $1/share. Instant payout."
          />
        </div>
      </Section>

      <Divider />

      {/* ── MARKET TYPES ── */}
      <Section id="markets">
        <p className="text-purple-400 font-mono text-sm tracking-wider uppercase mb-4">
          Market Types
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Every market is <GradientText>unambiguous & automatic</GradientText>
        </h2>
        <p className="text-gray-400 text-lg mb-4">
          No committee votes. No dispute windows. No human judgment. Every market
          resolves deterministically from on-chain oracle data at the exact expiry
          timestamp.
        </p>
        <p className="text-gray-500 text-sm mb-10">
          Pyth Network delivers institutional-grade price feeds with 400ms updates,
          trusted by $100B+ in DeFi. The oracle reads the price → the contract
          compares to the target → winners get paid. Fully automatic, fully
          trustless.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {/* Price Threshold */}
          <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📈</span>
              <h3 className="text-white font-semibold text-lg">Price Threshold</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              &ldquo;Will asset X reach price Y by date Z?&rdquo;
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-green-400">●</span> Will SOL reach $300 by March 2026?
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-green-400">●</span> BTC above $150K by Q2 2026?
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-green-400">●</span> ETH above $5,000 by April?
              </div>
            </div>
            <div className="mt-4 bg-black/30 rounded-lg p-3 text-xs font-mono text-gray-600">
              Oracle: Pyth price feed ≥ target → YES
            </div>
          </div>

          {/* Market Cap */}
          <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">💎</span>
              <h3 className="text-white font-semibold text-lg">Market Cap Milestone</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              &ldquo;Will token X hit market cap Y by date Z?&rdquo;
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-purple-400">●</span> Fartcoin market cap above $5B?
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-purple-400">●</span> DOGE hit $1 (= ~$150B mcap)?
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-purple-400">●</span> Solana ecosystem TVL above $20B?
              </div>
            </div>
            <div className="mt-4 bg-black/30 rounded-lg p-3 text-xs font-mono text-gray-600">
              Oracle: CoinGecko / DeFiLlama feed ≥ target → YES
            </div>
          </div>

          {/* Dominance / Ratio */}
          <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚖️</span>
              <h3 className="text-white font-semibold text-lg">Dominance & Ratios</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              &ldquo;Will metric X cross threshold Y by date Z?&rdquo;
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-orange-400">●</span> Bitcoin dominance below 50%?
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-orange-400">●</span> ETH/BTC ratio above 0.05?
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-orange-400">●</span> Jupiter flip Uniswap in TVL?
              </div>
            </div>
            <div className="mt-4 bg-black/30 rounded-lg p-3 text-xs font-mono text-gray-600">
              Oracle: ratio/dominance feed ≥ or ≤ target → YES/NO
            </div>
          </div>

          {/* Network Performance */}
          <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚡</span>
              <h3 className="text-white font-semibold text-lg">Network Metrics</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              &ldquo;Will network X achieve performance Y by date Z?&rdquo;
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-blue-400">●</span> Solana sustain 100K TPS this month?
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-blue-400">●</span> ETH gas below 5 gwei average?
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-blue-400">●</span> Solana daily txns above 500M?
              </div>
            </div>
            <div className="mt-4 bg-black/30 rounded-lg p-3 text-xs font-mono text-gray-600">
              Oracle: on-chain metric feed ≥ target → YES
            </div>
          </div>
        </div>

        {/* Key differentiator callout */}
        <div className="border border-purple-500/20 rounded-xl p-6 bg-purple-500/5 text-center">
          <h4 className="text-white font-semibold mb-2">Every market follows the same pattern</h4>
          <div className="font-mono text-sm text-purple-300 mb-3">
            Will <span className="text-white">[metric]</span> reach <span className="text-white">[target]</span> by <span className="text-white">[date]</span>?
          </div>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">
            One formula. One oracle read. One comparison. Zero ambiguity.
            The contract checks the feed at expiry — if condition met, YES wins.
            If not, NO wins. No disputes, no votes, no delays.
          </p>
        </div>
      </Section>

      <Divider />

      {/* ── WHAT'S BUILT ── */}
      <Section id="built">
        <p className="text-purple-400 font-mono text-sm tracking-wider uppercase mb-4">
          What&apos;s Built
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          This is <GradientText>real, not vaporware</GradientText>
        </h2>
        <p className="text-gray-400 text-lg mb-10">
          Working software. Deployed contracts. Passing tests.
        </p>

        <div className="space-y-6">
          {/* Smart Contract */}
          <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-green-400 text-xl">✅</span>
              <h3 className="text-white font-semibold text-lg">
                Smart Contract
              </h3>
              <span className="text-xs font-mono bg-green-500/10 text-green-400 px-2 py-0.5 rounded">
                DEPLOYED
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              835 lines of Rust. 8 instructions. AMM with u128 precision math.
              All accounts validated. 16/16 tests passing.
            </p>
            <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-gray-500 overflow-x-auto">
              Program ID:{" "}
              <a href="https://explorer.solana.com/address/FU64EotiwqACVJ9hyhH6XA9iiqQKmWjmPTUmSF1i3ar9?cluster=devnet" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline decoration-purple-400/30 hover:decoration-purple-300/50 transition-colors">
                FU64EotiwqACVJ9hyhH6XA9iiqQKmWjmPTUmSF1i3ar9
              </a>
            </div>
            <div className="mt-2 flex gap-3">
              <a href="https://explorer.solana.com/address/FU64EotiwqACVJ9hyhH6XA9iiqQKmWjmPTUmSF1i3ar9?cluster=devnet" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-purple-400 transition-colors">
                ↗ Solana Explorer
              </a>
              <a href="https://github.com/ghost-odds/ghostodds" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-purple-400 transition-colors">
                ↗ GitHub Source
              </a>
            </div>
          </div>

          {/* Security */}
          <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-green-400 text-xl">✅</span>
              <h3 className="text-white font-semibold text-lg">
                Security Audit
              </h3>
              <span className="text-xs font-mono bg-green-500/10 text-green-400 px-2 py-0.5 rounded">
                PASSED
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              No critical or high-severity issues found. All accounts properly
              validated, no unsafe arithmetic, PDA ownership enforced.
            </p>
          </div>

          {/* Frontend */}
          <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-green-400 text-xl">✅</span>
              <h3 className="text-white font-semibold text-lg">
                Production Frontend
              </h3>
              <span className="text-xs font-mono bg-green-500/10 text-green-400 px-2 py-0.5 rounded">
                LIVE
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Next.js app live at ghostodds.com. 15 demo markets, real-time
              price charts, wallet integration, trading panel, portfolio
              tracking, admin dashboard.
            </p>
          </div>

          {/* Infra + Open Source */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-green-400 text-xl">✅</span>
                <h3 className="text-white font-semibold">Infrastructure</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Cloudflare tunnel, domain configured, CI/CD ready.
              </p>
            </div>
            <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-green-400 text-xl">✅</span>
                <h3 className="text-white font-semibold">Open Source</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Full source at{" "}
                <a
                  href="https://github.com/ghost-odds/ghostodds"
                  className="text-purple-400 hover:text-purple-300 transition"
                  target="_blank"
                  rel="noopener"
                >
                  github.com/ghost-odds/ghostodds
                </a>
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Divider />

      {/* ── COMPETITIVE LANDSCAPE ── */}
      <Section id="competitive">
        <p className="text-purple-400 font-mono text-sm tracking-wider uppercase mb-4">
          Competitive Landscape
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-10">
          How GhostOdds <GradientText>compares</GradientText>
        </h2>
        <CompTable />
      </Section>

      <Divider />

      {/* ── ROADMAP ── */}
      <Section id="roadmap">
        <p className="text-purple-400 font-mono text-sm tracking-wider uppercase mb-4">
          Roadmap
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-10">
          From MVP to <GradientText>market leader</GradientText>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Phase
            phase={1}
            title="MVP"
            when="Now"
            active
            items={[
              "Platform-curated crypto price markets",
              "Pyth auto-resolution",
              "Demo mode + devnet deployment",
            ]}
          />
          <Phase
            phase={2}
            title="Growth"
            when="Q2 2026"
            items={[
              "Mainnet launch",
              "Permissionless market creation",
              "Telegram bot for social/private betting",
              "Multi-asset support",
            ]}
          />
          <Phase
            phase={3}
            title="Scale"
            when="Q3-Q4 2026"
            items={[
              "Governance token",
              "LP yield on deposited collateral",
              "Cross-chain via Wormhole",
              "SDK/API for integrations",
            ]}
          />
        </div>
      </Section>

      <Divider />

      {/* ── WHAT IT TAKES ── */}
      <Section id="launch">
        <p className="text-purple-400 font-mono text-sm tracking-wider uppercase mb-4">
          What It Takes to Launch
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Honest numbers. <GradientText>Clear path.</GradientText>
        </h2>
        <p className="text-gray-400 text-lg mb-10">
          4-6 weeks from funding to production mainnet.
        </p>

        <div className="space-y-4 mb-12">
          {[
            {
              label: "Smart contract audit",
              detail: "Professional audit, ~$15-20K",
              icon: "🔍",
            },
            {
              label: "Initial liquidity",
              detail: "$50-100K USDC to seed markets",
              icon: "💧",
            },
            {
              label: "Resolver crank",
              detail:
                "Node.js service to auto-trigger resolution — built, needs hosting",
              icon: "⚙️",
            },
            {
              label: "Domain & infrastructure",
              detail: "Already configured (ghostodds.com)",
              icon: "🌐",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 border border-white/10 rounded-xl p-5 bg-white/[0.02]"
            >
              <span className="text-xl">{item.icon}</span>
              <div>
                <h3 className="text-white font-semibold">{item.label}</h3>
                <p className="text-gray-400 text-sm">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border border-purple-500/30 rounded-xl p-6 bg-purple-500/5 text-center">
          <p className="text-gray-400 text-sm mb-2">Total budget to production-ready mainnet</p>
          <div className="font-mono text-4xl font-bold">
            <GradientText>$50-100K</GradientText>
          </div>
          <p className="text-gray-500 text-sm mt-2">Timeline: 4-6 weeks</p>
        </div>
      </Section>

      <Divider />

      {/* ── REVENUE MODEL ── */}
      <Section id="revenue">
        <p className="text-purple-400 font-mono text-sm tracking-wider uppercase mb-4">
          Revenue Model
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Simple. <GradientText>Scalable.</GradientText>
        </h2>
        <p className="text-gray-400 text-lg mb-6">
          Configurable fee on all trades (default 2%). Phase 2 adds creator fee split.
        </p>

        {/* Fee Structure */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02] text-center">
            <div className="text-2xl font-mono font-bold text-white mb-1">2%</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Trading Fee</div>
            <div className="text-xs text-gray-600 mt-2">Charged on every buy & sell</div>
          </div>
          <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02] text-center">
            <div className="text-2xl font-mono font-bold text-gray-400 mb-1">1% + 1%</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Phase 2 Split</div>
            <div className="text-xs text-gray-600 mt-2">Creator fee + protocol fee</div>
          </div>
          <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02] text-center">
            <div className="text-2xl font-mono font-bold text-gray-400 mb-1">On-chain</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Configurable</div>
            <div className="text-xs text-gray-600 mt-2">Admin can adjust fee BPS</div>
          </div>
        </div>

        {/* Interactive Calculator */}
        <RevenueCalculator />

        <p className="text-gray-600 text-sm text-center mt-6">
          For reference, Polymarket hit $2B+ monthly volume in late 2024. Kalshi hit $50B annualized in 2025.
        </p>
      </Section>

      <Divider />

      {/* ── FOOTER / CTA ── */}
      <section className="py-24 md:py-32 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center mb-6">
            <GhostIcon size={56} />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to see it?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            The platform is live. The contracts are deployed. Try it yourself.
          </p>
          <a
            href="https://ghostodds.com"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-8 py-3.5 rounded-full transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
          >
            Launch GhostOdds →
          </a>
          <div className="mt-12 space-y-2">
            <a
              href="mailto:team@ghostodds.com"
              className="text-gray-500 hover:text-gray-300 transition text-sm"
            >
              team@ghostodds.com
            </a>
          </div>
          <p className="mt-8 text-gray-700 text-sm">
            Predict. Trade. No trace.
          </p>
        </div>
      </section>
    </>
  );
}
