'use client';

import React from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
}

export function Navbar({ cartCount, onOpenCart }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#17271C] border-b border-[#C8B288]/30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3 sm:gap-8">
        {/* Zone 1: Official FLOWER rchii Logo Crest + Single-Line Wordmark */}
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 sm:gap-3 text-[#EDE0C9] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8B288] rounded-full pr-1"
        >
          <span className="relative w-9 h-10 sm:w-10 sm:h-11 rounded-full overflow-hidden border border-[#C8B288]/80 bg-[#17271C] shadow-[0_2px_10px_rgba(23,39,28,0.35)] shrink-0">
            <Image
              src="/logo.png"
              alt="FLOWER rchii official logo"
              fill
              priority
              referrerPolicy="no-referrer"
              sizes="44px"
              className="object-cover scale-[1.18]"
            />
          </span>
          <span className="inline-flex items-baseline gap-1 sm:gap-1.5">
            <span className="font-serif text-base sm:text-xl tracking-[0.16em] sm:tracking-[0.18em] font-medium">
              FLOWER
            </span>
            <span className="font-script text-xl sm:text-[26px] text-[#C8B288] leading-none">
              rchii
            </span>
          </span>
        </a>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-8 text-sm font-normal text-[#EDE0C9]/80"
        >
          <a
            href="#atelier"
            className="hover:text-[#EDE0C9] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#C8B288]/60"
          >
            Design Your Bouquet
          </a>
          <a
            href="#collection"
            className="hover:text-[#EDE0C9] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#C8B288]/60"
          >
            Popular Bouquets
          </a>
          <a
            href="#concierge"
            className="hover:text-[#EDE0C9] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#C8B288]/60"
          >
            Custom Order
          </a>
          <a
            href="#craft"
            className="hover:text-[#EDE0C9] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#C8B288]/60"
          >
            Why Us
          </a>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EDE0C9] text-[#17271C] hover:bg-[#FAF7F2] text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8B288] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17271C]"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Bag</span>
            <span className="tabular-nums font-semibold">({cartCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
}
