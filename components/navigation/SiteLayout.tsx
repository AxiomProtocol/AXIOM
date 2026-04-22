"use client";

import React from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

interface SiteLayoutProps {
  children: React.ReactNode;
  showWallet?: boolean;
  showFooter?: boolean;
}

export function SiteLayout({ children, showWallet = true, showFooter = true }: SiteLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader showWallet={showWallet} />
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <SiteFooter />}
    </div>
  );
}

export default SiteLayout;
