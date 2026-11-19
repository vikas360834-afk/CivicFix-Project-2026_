import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Jump to top on every route change (SPA routers keep the old scroll offset otherwise). */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
}
