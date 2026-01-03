"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { navItems, NavItem } from "./navConfig";

function useOutsideClick(ref: React.RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!ref.current) return;
      if (ref.current.contains(t)) return;
      onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, onClose]);
}

function DesktopNav() {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useOutsideClick(wrapRef as React.RefObject<HTMLElement>, () => setOpenLabel(null));

  return (
    <div ref={wrapRef} style={{ display: "none", gap: 10, alignItems: "center" }} className="axiomDesktopNav">
      {navItems.map((item) => (
        <DesktopNavItem key={item.label} item={item} openLabel={openLabel} setOpenLabel={setOpenLabel} />
      ))}
      <style>{`
        @media (min-width: 980px) {
          .axiomDesktopNav { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function DesktopNavItem(props: {
  item: NavItem;
  openLabel: string | null;
  setOpenLabel: (v: string | null) => void;
}) {
  const { item, openLabel, setOpenLabel } = props;
  const isOpen = openLabel === item.label;

  if (!item.children || item.children.length === 0) {
    return (
      <div style={{ position: "relative", fontSize: 14 }}>
        <Link href={item.href || "/"} style={{ padding: "8px 10px", borderRadius: 10, display: "inline-block" }}>
          {item.label}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", fontSize: 14 }}>
      <button
        onClick={() => setOpenLabel(isOpen ? null : item.label)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        style={{ border: 0, background: "transparent", cursor: "pointer", padding: "8px 10px", borderRadius: 10, fontSize: 14 }}
      >
        {item.label}
      </button>
      {isOpen ? (
        <div
          role="menu"
          aria-label={item.label}
          style={{
            position: "absolute",
            top: 42,
            left: 0,
            minWidth: 220,
            background: "white",
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 14,
            boxShadow: "0 14px 32px rgba(0,0,0,0.12)",
            padding: 8,
            zIndex: 80
          }}
        >
          {item.children.map((c) => (
            <Link key={c.label} href={c.href} onClick={() => setOpenLabel(null)} style={{ display: "block", padding: "10px 10px", borderRadius: 12 }}>
              {c.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setOpen(false);
  }, [router.asPath]);

  return (
    <div className="axiomMobileNav">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ border: "1px solid rgba(0,0,0,0.14)", background: "white", borderRadius: 12, padding: "8px 10px", cursor: "pointer", fontSize: 14 }}
      >
        Menu
      </button>

      {open ? (
        <div style={{ position: "absolute", top: 56, left: 0, right: 0, background: "white", borderTop: "1px solid rgba(0,0,0,0.06)", padding: "12px 20px 16px 20px", zIndex: 100 }}>
          {navItems.map((item) => (
            <div key={item.label} style={{ padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              {!item.children || item.children.length === 0 ? (
                <Link href={item.href || "/"} style={{ display: "block", padding: "10px 10px", borderRadius: 12, background: "rgba(0,0,0,0.02)" }}>
                  {item.label}
                </Link>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: "rgba(18,18,18,0.72)", margin: "0 0 8px 0" }}>{item.label}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {item.children.map((c) => (
                      <Link key={c.label} href={c.href} style={{ padding: "10px 10px", borderRadius: 12, background: "rgba(0,0,0,0.02)" }}>
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <style>{`
        @media (min-width: 980px) {
          .axiomMobileNav { display: none; }
        }
      `}</style>
    </div>
  );
}

export function RebuildNav() {
  const brand = useMemo(() => "Axiom", []);

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 70, background: "rgba(255,255,255,0.86)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
            {brand}
          </Link>
          <DesktopNav />
          <MobileNav />
        </div>
      </div>
    </div>
  );
}
