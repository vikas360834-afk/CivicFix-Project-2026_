import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { Building2, Users, CheckCircle2, Clock, MapPin, ArrowRight, Sparkles } from "lucide-react";
import CountUp from "../components/CountUp.jsx";

const DEPARTMENTS = [
  {
    key: "ROAD",
    name: "Public Works Department (Roads)",
    code: "PWD-BLR",
    emoji: "🛣️",
    head: "Chief Engineer S. K. Narayana",
    jurisdiction: "All 198 BBMP Wards",
    description: "Responsible for asphalt road re-surfacing, pothole repairs, footpaths, bridges, and storm water road crossings.",
    slaDays: 7,
  },
  {
    key: "STREET_LIGHT",
    name: "Electrical & Streetlight Division",
    code: "ELD-BBMP",
    emoji: "💡",
    head: "Executive Engineer K. Ramesh",
    jurisdiction: "East, West & South Zones",
    description: "Maintenance of LED street luminares, high mast lightings, underground cable faults, and timer automation.",
    slaDays: 3,
  },
  {
    key: "WATER",
    name: "Water Supply & Sewerage Board",
    code: "BWSSB",
    emoji: "💧",
    head: "Superintending Engineer V. Rao",
    jurisdiction: "Greater Bengaluru Metropolitan",
    description: "Drinking water pipeline maintenance, burst pipeline excavation, manhole desilting, and contamination control.",
    slaDays: 4,
  },
  {
    key: "DRAINAGE",
    name: "Stormwater & Drainage Division",
    code: "SWD-BBMP",
    emoji: "🌊",
    head: "Divisional Engineer Anita Hegde",
    jurisdiction: "Primary & Secondary SWD Network",
    description: "Desilting of stormwater drains, retaining wall reinforcement, flood prevention, and culvert unclogging.",
    slaDays: 3,
  },
  {
    key: "SANITATION",
    name: "Sanitation & Solid Waste Management",
    code: "SWM-BBMP",
    emoji: "🗑️",
    head: "Joint Commissioner (Health & SWM)",
    jurisdiction: "Ward Dry Waste Centers & Bulk Dumps",
    description: "Door-to-door garbage clearance, black-spot elimination, public litter bin clearance, and scientific composting.",
    slaDays: 2,
  },
  {
    key: "PUBLIC_PROPERTY",
    name: "Municipal Assets & Infrastructure",
    code: "MAI-DIV",
    emoji: "🏛️",
    head: "Asset Custodian Officer P. Nair",
    jurisdiction: "Public Buildings, Bus Shelters, Railings",
    description: "Inspection and restoration of vandalized or broken public assets, fencing, dividers, and community halls.",
    slaDays: 5,
  },
  {
    key: "TRAFFIC",
    name: "Traffic & Road Safety Authority",
    code: "BTP-CIVIC",
    emoji: "🚦",
    head: "DCP Traffic Urban Planning",
    jurisdiction: "Major Traffic Junctions & Corridors",
    description: "Traffic signal synchronization, pedestrian crossings, speed breaker modifications, and road safety signs.",
    slaDays: 3,
  },
  {
    key: "ELECTRICITY",
    name: "Electricity Board (BESCOM)",
    code: "BESCOM-O&M",
    emoji: "⚡",
    head: "Chief General Manager Operations",
    jurisdiction: "Bangalore Electricity Distribution",
    description: "Power transformer safety, low-sag overhead cables, junction box earthing, and spark prevention.",
    slaDays: 2,
  },
];

export default function Departments() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/stats/departments")
      .then(({ data }) => setStats(data.departments || []))
      .catch(() => setStats([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative isolate min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Building2 className="h-3.5 w-3.5" /> Municipal Governance Directory
            </div>
            <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
              Municipal <span className="text-blue-600">Departments & SLAs</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Responsible divisions, designated nodal officers, and official resolution turnaround targets.
            </p>
          </div>

          <Link
            to="/report"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
          >
            File New Complaint →
          </Link>
        </div>

        {/* Departments Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS.map((dept) => {
            const stat = stats.find(
              (s) => s.department?.toLowerCase()?.includes(dept.key.toLowerCase()) || s.name?.includes(dept.name)
            );

            return (
              <div
                key={dept.key}
                className="glass-panel glass-panel-interactive flex flex-col justify-between rounded-3xl p-6 border border-slate-200/80 bg-white/90 shadow-md dark:border-slate-800/80 dark:bg-slate-900/90"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-3xl">{dept.emoji}</span>
                    <span className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 font-mono text-[11px] font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                      {dept.code}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {dept.name}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {dept.description}
                  </p>

                  <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Nodal Lead:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{dept.head}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Mandated SLA:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{dept.slaDays} Days Max</span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Jurisdiction:</span>
                      <span className="truncate max-w-[170px] text-slate-700 dark:text-slate-300">{dept.jurisdiction}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800 flex items-center justify-between">
                  <Link
                    to={`/issues?category=${dept.key}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    View Active Tickets <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    to={`/map?category=${dept.key}`}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Map Pin →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
