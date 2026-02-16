"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

type Variant = "header" | "grid" | "footer";

interface GhostPatternProps {
  variant: Variant;
  className?: string;
}

const DOODLE_RULES: Record<Variant, string> = {
  header: `
    :doodle {
      @grid: 6 x 3 / 100% 100%;
      overflow: hidden;
    }
    @shape: hypocycloid 3;
    background: rgba(124, 92, 252, @r(0.03, 0.07));
    @size: @r(20px, 50px);
    @place-cell: @r(0%, 100%) @r(0%, 100%);
    border-radius: 50% 50% 40% 60% / 60% 60% 80% 80%;
    animation: ghostFloat @r(18s, 30s) ease-in-out infinite alternate;
    animation-delay: -@r(0s, 15s);

    @keyframes ghostFloat {
      0% { transform: translateY(0px) rotate(0deg) scale(1); }
      50% { transform: translateY(-@r(8px, 20px)) rotate(@r(-5deg, 5deg)) scale(@r(0.95, 1.05)); }
      100% { transform: translateY(@r(-4px, 4px)) rotate(@r(-3deg, 3deg)) scale(1); }
    }
  `,
  grid: `
    :doodle {
      @grid: 8 x 6 / 100% 100%;
      overflow: hidden;
    }
    @size: @r(12px, 28px);
    background: rgba(124, 92, 252, @r(0.02, 0.05));
    border-radius: 50% 50% 35% 65% / 55% 55% 75% 75%;
    @place-cell: @r(0%, 100%) @r(0%, 100%);
    animation: ghostDrift @r(22s, 35s) ease-in-out infinite alternate;
    animation-delay: -@r(0s, 20s);

    ::before {
      content: '';
      position: absolute;
      top: 30%;
      left: 20%;
      width: 15%;
      height: 15%;
      background: rgba(124, 92, 252, @r(0.03, 0.06));
      border-radius: 50%;
      box-shadow: @r(6px, 10px) 0 0 rgba(124, 92, 252, @r(0.03, 0.06));
    }

    @keyframes ghostDrift {
      0% { transform: translate(0, 0) scale(1); opacity: @r(0.3, 0.8); }
      100% { transform: translate(@r(-6px, 6px), @r(-10px, 10px)) scale(@r(0.9, 1.1)); opacity: @r(0.4, 1); }
    }
  `,
  footer: `
    :doodle {
      @grid: 10 x 4 / 100% 100%;
      overflow: hidden;
    }
    @size: @r(14px, 40px);
    background: rgba(124, 92, 252, @r(0.03, 0.08));
    border-radius: 50% 50% @r(30%, 45%) @r(55%, 70%) / @r(50%, 65%) @r(50%, 65%) @r(70%, 85%) @r(70%, 85%);
    @place-cell: @r(0%, 100%) @r(0%, 100%);
    animation: ghostRise @r(20s, 32s) ease-in-out infinite alternate;
    animation-delay: -@r(0s, 18s);

    ::before {
      content: '';
      position: absolute;
      top: 28%;
      left: 22%;
      width: 12%;
      height: 12%;
      background: rgba(255, 255, 255, @r(0.02, 0.05));
      border-radius: 50%;
      box-shadow: @r(5px, 9px) 0 0 rgba(255, 255, 255, @r(0.02, 0.05));
    }

    @keyframes ghostRise {
      0% { transform: translateY(0) rotate(0deg); }
      100% { transform: translateY(@r(-12px, -4px)) rotate(@r(-8deg, 8deg)); }
    }
  `,
};

function GhostPatternInner({ variant, className = "" }: GhostPatternProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import("css-doodle").then(() => setReady(true));
  }, []);

  if (!ready) return <div className={`absolute inset-0 pointer-events-none z-0 ${className}`} />;

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      ref={containerRef}
    >
      <css-doodle
        dangerouslySetInnerHTML={{ __html: DOODLE_RULES[variant] }}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}

// Dynamic import with SSR disabled to avoid hydration issues
const GhostPattern = dynamic(() => Promise.resolve(GhostPatternInner), {
  ssr: false,
});

export { GhostPattern };
export type { Variant, GhostPatternProps };
