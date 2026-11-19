import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Cpu,
  MapPin,
  Users,
  CheckCircle2,
  TrendingUp,
  Award,
  Building,
  ArrowRight
} from "lucide-react";

export default function About() {
  const pillars = [
    {
      icon: Cpu,
      title: "AI-Powered Triage",
      desc: "Instant NLP categorization, severity prediction, and department routing reduce grievance dispatch latency by 85%.",
      color: "from-blue-600 to-cyan-500",
    },
    {
      icon: MapPin,
      title: "Geospatial Clustering",
      desc: "Leaflet and OpenStreetMap integrations visualize density hot-spots, ward SLAs, and duplicate radar within 100 meters.",
      color: "from-cyan-500 to-teal-500",
    },
    {
      icon: ShieldCheck,
      title: "Photographic Evidence Audit",
      desc: "Before-and-after photo verification ensures no ticket is marked resolved without tangible proof and citizen sign-off.",
      color: "from-purple-600 to-indigo-500",
    },
    {
      icon: Users,
      title: "Civic Karma & Transparency",
      desc: "Citizens earn karma points, track real-time resolution timelines, and hold field engineers accountable in the public registry.",
      color: "from-emerald-600 to-green-500",
    },
  ];

  return (
    <div className="relative isolate min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Hero Banner */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
            Smart City Municipal Framework
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            About <span className="text-blue-600">CivicFix AI</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            CivicFix AI (Civic Works Management) is an enterprise-grade smart city platform engineered to bridge the gap between urban citizens, municipal administrators, and field engineers.
          </p>
        </div>

        {/* 4 Core Pillars */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="glass-panel glass-panel-interactive rounded-3xl p-6 border border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-md"
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr ${p.color} text-white shadow-md`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{p.title}</h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>

        {/* SLA & Governance Table */}
        <div className="mt-12 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-md">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-600" />
            Official Municipal Service Level Agreements (SLA)
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Mandated turnaround times enforced across Bengaluru municipal zones:
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="pb-3 font-semibold">Civic Category</th>
                  <th className="pb-3 font-semibold">Responsible Department</th>
                  <th className="pb-3 font-semibold">Standard SLA</th>
                  <th className="pb-3 font-semibold">Critical Hazard SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                <tr>
                  <td className="py-3 text-slate-900 dark:text-white">🛣️ Road Damage & Potholes</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">Public Works Department (PWD)</td>
                  <td className="py-3 text-blue-600 dark:text-blue-400 font-bold">7 Days</td>
                  <td className="py-3 text-red-600 font-bold">24 Hours</td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-900 dark:text-white">💡 Street Lights & Poles</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">Electrical & Streetlight Division</td>
                  <td className="py-3 text-blue-600 dark:text-blue-400 font-bold">3 Days</td>
                  <td className="py-3 text-red-600 font-bold">12 Hours</td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-900 dark:text-white">💧 Water Leakage & Mains</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">Water Supply & Sewerage (BWSSB)</td>
                  <td className="py-3 text-blue-600 dark:text-blue-400 font-bold">4 Days</td>
                  <td className="py-3 text-red-600 font-bold">6 Hours</td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-900 dark:text-white">🗑️ Garbage Dumps & Waste</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">Solid Waste Management (SWM)</td>
                  <td className="py-3 text-blue-600 dark:text-blue-400 font-bold">2 Days</td>
                  <td className="py-3 text-red-600 font-bold">12 Hours</td>
                </tr>
                <tr>
                  <td className="py-3 text-slate-900 dark:text-white">⚡ Exposed Power Conductors</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">Electricity Board (BESCOM)</td>
                  <td className="py-3 text-blue-600 dark:text-blue-400 font-bold">2 Days</td>
                  <td className="py-3 text-red-600 font-bold">2 Hours (Immediate)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/report"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700"
          >
            File a Civic Grievance <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/map"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300"
          >
            Explore Interactive City Map
          </Link>
        </div>
      </div>
    </div>
  );
}
