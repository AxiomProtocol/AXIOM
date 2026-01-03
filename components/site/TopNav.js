import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { navItems } from "../../lib/site/navConfig";

function useOutsideClick(ref, onClose) {
  useEffect(() => {
    function onDown(e) {
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, onClose]);
}

function DesktopNav() {
  const [openLabel, setOpenLabel] = useState(null);
  const wrapRef = useRef(null);
  useOutsideClick(wrapRef, () => setOpenLabel(null));

  return (
    <div className="ax-navRow" ref={wrapRef}>
      {navItems.map((item) => (
        <DesktopNavItem
          key={item.label}
          item={item}
          openLabel={openLabel}
          setOpenLabel={setOpenLabel}
        />
      ))}
    </div>
  );
}

function DesktopNavItem({ item, openLabel, setOpenLabel }) {
  const isOpen = openLabel === item.label;

  if (!item.children || item.children.length === 0) {
    return (
      <div className="ax-navItem">
        <Link href={item.to || "/"} className="ax-navLink">
          {item.label}
        </Link>
      </div>
    );
  }

  return (
    <div className="ax-navItem">
      <button
        className="ax-navButton"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setOpenLabel(isOpen ? null : item.label)}
      >
        {item.label}
      </button>
      {isOpen && (
        <div className="ax-dropdown" role="menu" aria-label={item.label}>
          {item.children.map((c) => (
            <Link key={c.label} href={c.to} onClick={() => setOpenLabel(null)}>
              {c.label}
            </Link>
          ))}
        </div>
      )}
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
    <div>
      <button className="ax-mobileBtn" onClick={() => setOpen(!open)} aria-expanded={open}>
        Menu
      </button>
      {open && (
        <div className="ax-mobilePanel">
          {navItems.map((item) => (
            <MobileGroup key={item.label} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileGroup({ item }) {
  if (!item.children || item.children.length === 0) {
    return (
      <div className="ax-mobileGroup">
        <div className="ax-mobileLinks">
          <Link href={item.to || "/"}>{item.label}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ax-mobileGroup">
      <p className="ax-mobileGroupTitle">{item.label}</p>
      <div className="ax-mobileLinks">
        {item.children.map((c) => (
          <Link key={c.label} href={c.to}>
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function TopNav() {
  return (
    <div className="ax-topNavWrap">
      <div className="ax-container">
        <div className="ax-topNavInner">
          <Link href="/" className="ax-brand">
            Axiom
          </Link>
          <DesktopNav />
          <MobileNav />
        </div>
      </div>
    </div>
  );
}
