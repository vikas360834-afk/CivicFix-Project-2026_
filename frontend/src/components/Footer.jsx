import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";
import { MapPin, Phone, ShieldCheck, Heart, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative mt-16 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/95">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 pb-8 border-b border-slate-100 dark:border-slate-800">
          {/* Brand Info */}
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-7 w-7" />
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                Civic<span className="text-blue-600">Fix</span> <span className="text-xs uppercase text-sky-500 font-bold">AI</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Enterprise Smart City Civic Works Management platform powering transparency, AI-triage, and rapid public works resolution.
            </p>
          </div>

          {/* Civic Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Civic Services
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/report" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                  Report Civic Grievance
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                  Interactive City Map
                </Link>
              </li>
              <li>
                <Link to="/issues" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                  Live Public Grievances
                </Link>
              </li>
              <li>
                <Link to="/escalations" className="hover:text-red-600 dark:hover:text-red-400 transition">
                  SLA Escalation Radar
                </Link>
              </li>
            </ul>
          </div>

          {/* Governance & Departments */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Governance
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/departments" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                  Municipal Departments & SLAs
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                  Resolution Metrics & Charts
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                  About CivicFix AI
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                  Contact & 24/7 Helplines
                </Link>
              </li>
            </ul>
          </div>

          {/* Helplines summary */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Emergency Hotlines
            </h4>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <p>BBMP Central: <span className="font-mono font-bold text-slate-900 dark:text-white">080-22660000</span></p>
              <p>Water (BWSSB): <span className="font-mono font-bold text-slate-900 dark:text-white">1916</span></p>
              <p>Power (BESCOM): <span className="font-mono font-bold text-slate-900 dark:text-white">1912</span></p>
              <p>Traffic Police: <span className="font-mono font-bold text-slate-900 dark:text-white">103</span></p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <p>© 2026 CivicFix AI – Civic Works Management. All municipal rights reserved.</p>
          <p className="flex items-center gap-1">
            Built for Smart City Public Works · Made with <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}
