import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export default function SiteHeader() {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">K</span>
        <span>{siteConfig.name}</span>
      </Link>

      <nav>
        <Link href="/#how-it-works">THE EXAM</Link>
        <Link href="/leaderboard">LEADERBOARD</Link>
        <Link href="/#about">ABOUT</Link>
      </nav>

      <Link className="nav-cta" href="/quiz">
        PLAY QUIZ <span>↗</span>
      </Link>
    </header>
  );
}
