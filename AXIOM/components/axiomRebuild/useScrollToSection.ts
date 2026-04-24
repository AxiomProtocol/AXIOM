"use client";

import { useEffect } from "react";

export function useScrollToSection(getSearch: () => string) {
  useEffect(() => {
    const search = getSearch();
    const params = new URLSearchParams(search);
    const section = (params.get("section") || "").trim();
    if (!section) return;

    const el = document.getElementById(section);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const y = window.scrollY + rect.top - 84;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, [getSearch]);
}
