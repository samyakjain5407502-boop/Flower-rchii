import Link from 'next/link';
import { ArrowLeft, Flower2 } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#17271C] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center rounded-[32px] border border-[#C8B288]/70 bg-[#FAF7F2] px-8 py-12 shadow-[0_18px_48px_rgba(23,39,28,0.08)]">
        <div className="mx-auto mb-6 w-14 h-20 rounded-full border border-[#C8B288] bg-[#17271C] flex items-center justify-center">
          <Flower2 className="w-6 h-6 text-[#EDE0C9]" />
        </div>
        <p className="text-xs tracking-[0.24em] uppercase text-[#4F6D52] font-medium mb-2">
          FLOWER rchii
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#17271C] mb-3">
          Bloom Not Found
        </h1>
        <p className="text-sm text-[#4F6D52] leading-relaxed mb-7">
          The page you are looking for has drifted away. Return to our 3D Floral
          Atelier to sculpt a bespoke bouquet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#17271C] text-[#EDE0C9] border border-[#C8B288]/70 hover:bg-[#4F6D52] text-xs sm:text-sm font-semibold tracking-wide transition-colors"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Return to The Atelier</span>
        </Link>
      </div>
    </main>
  );
}
