"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav className="fixed top-0 z-50 w-full">
      <div className="pointer-events-none absolute inset-0 h-24 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-white/95 transition hover:text-white md:text-xl"
        >
          IV Sunsets
        </Link>

        <Link
          href={isHome ? "/how-it-works" : "/"}
          className="group inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-base text-white/85 backdrop-blur-2xl transition hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
        >
          {isHome ? (
            <>
              How does it work?
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          ) : (
            <>
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to forecast
            </>
          )}
        </Link>
      </div>
    </nav>
  );
}
