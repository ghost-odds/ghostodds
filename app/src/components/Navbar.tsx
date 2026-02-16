"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Ghost, BarChart3, Briefcase, Settings } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { GhostPattern } from "./GhostPattern";

const links = [
  { href: "/", label: "Markets", icon: BarChart3 },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/admin", label: "Admin", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border overflow-hidden">
      <GhostPattern variant="header" className="opacity-40" />
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <Ghost className="w-6 h-6 text-primary group-hover:text-primary-hover transition-colors" />
            <span className="text-lg font-bold text-text-primary">
              GhostOdds
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "text-primary bg-primary/10"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <WalletButton />
      </div>
    </nav>
  );
}
