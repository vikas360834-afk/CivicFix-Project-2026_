/**
 * <WordLayer /> — decorative floating words behind a hero / panel.
 *
 * Purely ornamental: it sits in a pointer-events-none layer at z-0 so it can
 * never overlap or eat clicks from the real content (which lives at z-10).
 * Words are absolutely positioned from a fixed table, so nothing shifts
 * between renders and nothing ever lands on top of body copy.
 */

const DEFAULT_WORDS = [
  { t: "REPORT", x: "6%", y: "12%", s: 30, dur: 13, delay: 0 },
  { t: "TRACK", x: "74%", y: "10%", s: 22, dur: 15, delay: -3 },
  { t: "FIX IT", x: "78%", y: "58%", s: 34, dur: 17, delay: -6 },
  { t: "RESOLVE", x: "8%", y: "74%", s: 24, dur: 12, delay: -2 },
  { t: "CLEANER", x: "44%", y: "86%", s: 26, dur: 16, delay: -8 },
  { t: "SAFER", x: "40%", y: "4%", s: 20, dur: 14, delay: -5 },
];

const HERO_WORDS = [
  { t: "REPORT", x: "6%", y: "14%", s: 38, dur: 13, delay: 0 },
  { t: "CLEANER CITY", x: "68%", y: "62%", s: 26, dur: 17, delay: -5 },
  { t: "TRACK", x: "79%", y: "10%", s: 22, dur: 15, delay: -3 },
  { t: "FIX", x: "4%", y: "78%", s: 30, dur: 12, delay: -2 },
  { t: "SAFER STREETS", x: "40%", y: "88%", s: 24, dur: 16, delay: -8 },
];

export { DEFAULT_WORDS, HERO_WORDS };

export default function WordLayer({ words = DEFAULT_WORDS, className = "" }) {
  return (
    <div aria-hidden="true" className={`word-layer ${className}`}>
      {words.map((w, i) => (
        <span
          key={`${w.t}-${i}`}
          className="anime-word"
          style={{
            left: w.x,
            top: w.y,
            fontSize: `${w.s}px`,
            "--dur": `${w.dur}s`,
            "--delay": `${w.delay}s`,
          }}
        >
          {w.t}
        </span>
      ))}
    </div>
  );
}
