
import { siteConfig } from "@/lib/site-config";

export default function SiteFooter() {
  return (
    <footer id="about">
      <div className="footer-brand">
        <span className="brand-mark">A</span>
        <span>{siteConfig.name}</span>
      </div>

      <p>
        An independent motorsport quiz project.
        Not affiliated with Formula 1 or the FIA.
      </p>

      <span className="footer-version">
        DEVELOPMENT BUILD · V{siteConfig.version}
      </span>
    </footer>
  );
}
