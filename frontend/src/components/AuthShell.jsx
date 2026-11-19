/**
 * Split-screen shell used by Login / Register.
 * Left = brand panel over a real civic photo (glassmorphism + subtle aurora layer).
 * Right = the form card (premium glassmorphic dark container).
 */
import Logo from "./Logo.jsx";
import WordLayer from "./WordLayer.jsx";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative isolate min-h-screen flex items-center justify-center py-12 px-4 bg-[#080D1A]">
      <div className="mx-auto grid max-w-6xl w-full items-center gap-8 px-4 lg:grid-cols-2">
        {/* Brand panel (desktop only) */}
        <div className="relative isolate hidden overflow-hidden rounded-3xl border border-white/10 bg-[#10182A]/80 p-10 text-white backdrop-blur-2xl shadow-2xl lg:block">
          {/* Backdrop image */}
          <img
            src="/img/hero.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 z-0 h-full w-full object-cover opacity-20"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 bg-gradient-to-br from-[#080D1A]/95 via-[#10182A]/90 to-[#1e1b4b]/80"
          />
          <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden">
            <div className="aurora aurora-1" />
            <div className="aurora aurora-2" />
            <div className="aurora aurora-3" />
          </div>
          <WordLayer className="on-dark" />

          <div className="relative z-10">
            <Logo className="h-12 w-12 drop-shadow-[0_4px_16px_rgba(59,130,246,0.5)]" />
            <h2 className="mt-4 text-3xl font-black leading-tight text-white">
              Civic<span className="grad-text">Fix</span>
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-300 leading-relaxed">
              Report potholes, garbage overflows, water leaks and streetlights with real evidence. Dual AI engines classify, route, and detect duplicates in real-time.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              {[
                ["📷", "High-Resolution Photo Evidence"],
                ["🤖", "AI Triage & Severity Scoring"],
                ["📊", "Live Analytics & Interactive Heatmap"],
                ["🛡️", "Verified 7-Stage Official Resolution"],
              ].map(([e, t]) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-base border border-white/10 shadow-sm">
                    {e}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs backdrop-blur-md">
              <div className="flex items-center gap-2 font-bold text-cyan-400">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Official Municipal Infrastructure Portal</span>
              </div>
              <p className="mt-2 text-slate-300 leading-relaxed">
                Secure municipal administrative gateway protected by 256-bit encryption and role-based access control for citizens, administrators, and field engineers.
              </p>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="rounded-3xl border border-white/10 bg-[#10182A]/90 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="mb-6 text-center lg:text-left">
            <div className="mb-3 flex justify-center lg:hidden">
              <Logo className="h-12 w-12" />
            </div>
            <h1 className="text-2xl font-black text-slate-100 sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          </div>
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}
