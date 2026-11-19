import { useEffect, useRef, useState } from "react";

/**
 * Animates a number up with an ease-out curve — used for KPI / hero stats.
 * Non-numeric values ("…", "4h") are rendered as-is.
 *   <CountUp value={128} />        → 0 … 128
 *   <CountUp value="100%" />       → 0 … 100%
 */
export default function CountUp({ value, duration = 1100, className = "" }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const numeric =
      typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
    const suffix = typeof value === "string" ? String(value).replace(/[\d.,]+/, "") : "";

    if (!Number.isFinite(numeric)) {
      setDisplay(value); // "…" or text — just show it
      return;
    }

    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const current = Math.round(from + (numeric - from) * eased);
      setDisplay(suffix ? `${current}${suffix}` : current);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
