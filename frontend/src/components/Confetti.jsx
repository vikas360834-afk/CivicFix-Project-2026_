import { useEffect, useMemo } from "react";

const COLORS = ["#10b981", "#38bdf8", "#a78bfa", "#fbbf24", "#f472b6", "#34d399", "#818cf8"];

/**
 * Lightweight confetti burst (no dependency). Renders N falling pieces for
 * ~2.6s. Place inside a `relative` container.
 */
export default function Confetti({ count = 60 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: COLORS[i % COLORS.length],
        fall: 260 + Math.random() * 320,
        spin: 360 + Math.random() * 720,
        duration: 1.8 + Math.random() * 1.4,
        delay: Math.random() * 0.6,
        tilt: Math.random() > 0.5,
      })),
    [count]
  );

  useEffect(() => {
    const t = setTimeout(() => {}, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            borderRadius: p.tilt ? "50%" : "2px",
            width: p.tilt ? "10px" : "9px",
            height: p.tilt ? "10px" : "15px",
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            "--fall": `${p.fall}px`,
            "--spin": `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}
