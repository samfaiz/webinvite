import Link from "next/link";
import { SITE } from "@/lib/seo";

/** Simple public site chrome (header + footer) for CMS pages and the blog. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f4ec] text-slate-800">
      <header className="border-b border-slate-200/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-lg uppercase tracking-[0.14em] text-[#2b3a67]">
            {SITE.name}
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-600 sm:gap-5">
            <Link href="/gallery" className="hover:text-[#2b3a67]">Templates</Link>
            <Link href="/blog" className="hover:text-[#2b3a67]">Blog</Link>
            <Link href="/create" className="rounded-lg bg-[#2b3a67] px-4 py-2 text-white hover:bg-[#23315a]">
              Create yours
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-slate-200/70">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-slate-400 sm:flex-row">
          <span>© {year} {SITE.name}</span>
          <div className="flex gap-4">
            <Link href="/gallery" className="hover:text-slate-600">Templates</Link>
            <Link href="/blog" className="hover:text-slate-600">Blog</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
