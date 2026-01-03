import { useEffect } from "react";
import { useRouter } from "next/router";

export function useScrollToSection() {
  const router = useRouter();

  useEffect(() => {
    const section = router.query.section;
    if (!section) return;

    const el = document.getElementById(section);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const y = window.scrollY + rect.top - 72;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, [router.asPath, router.query.section]);
}
