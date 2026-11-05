import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export default function SiteHeader() {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">A</span>
        <span>{siteConfig.name}</span>
      </Link>

      <nav>
        <Link href="/#how-it-works">THE EXAM</Link>
        <Link href="/#leaderboard">LEADERBOARD</Link>
        <Link href="/#about">ABOUT</Link>
      </nav>

      <Link className="nav-cta" href="/#how-it-works">
        ENTER THE GRID <span>↗</span>
      </Link>
    </header>
  );
}
