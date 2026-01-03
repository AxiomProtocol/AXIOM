"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

function shouldShowDisclaimer(pathname: string): boolean {
  return pathname.startsWith("/axm") || pathname.startsWith("/advanced") || pathname.startsWith("/docs") || pathname.startsWith("/disclosures");
}

export function RebuildFooter() {
  const router = useRouter();
  const pathname = router.pathname || "";
  const showDisclaimer = shouldShowDisclaimer(pathname);

  return (
    <footer style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "32px 0", marginTop: 30, background: "#fafafa" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e" }}>Axiom</div>
            <div style={{ fontSize: 12, color: "rgba(18,18,18,0.6)", marginTop: 4 }}>Axiom Nexus, LLC</div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "rgba(18,18,18,0.74)", fontSize: 14 }}>
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms-and-conditions">Terms</Link>
            <Link href="/transparency">Transparency</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/about-us">About</Link>
            <Link href="/team">Team</Link>
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 12, color: "rgba(18,18,18,0.5)" }}>
            © {new Date().getFullYear()} Axiom Nexus, LLC. All rights reserved.
          </div>
        </div>

        {showDisclaimer ? (
          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(18,18,18,0.6)", maxWidth: 900 }}>
            Educational content only. Review disclosures and make informed decisions. Nothing on this site is a guarantee of outcomes.
          </div>
        ) : null}
      </div>
    </footer>
  );
}
