import Link from "next/link";
import { useRouter } from "next/router";

function shouldShowTokenDisclaimer(pathname) {
  return pathname.startsWith("/axm") || pathname.startsWith("/advanced") || pathname.startsWith("/docs") || pathname.startsWith("/disclosures");
}

export default function Footer() {
  const router = useRouter();
  const showDisclaimer = shouldShowTokenDisclaimer(router.pathname);

  return (
    <footer className="ax-footer">
      <div className="ax-container">
        <div className="ax-footerRow">
          <div className="ax-brand">Axiom</div>
          <div className="ax-footerLinks">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/disclosures">Disclosures</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/docs">Docs</Link>
          </div>
        </div>

        {showDisclaimer && (
          <div className="ax-disclaimer">
            Educational content only. Review disclosures and make informed decisions. Nothing on this site is a guarantee of outcomes.
          </div>
        )}
      </div>
    </footer>
  );
}
