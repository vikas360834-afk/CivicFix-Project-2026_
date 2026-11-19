import { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  AlertTriangle,
  Building,
  CheckCircle2
} from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setForm({ name: "", email: "", subject: "", message: "" });
    }, 4000);
  };

  const emergencyContacts = [
    { name: "BBMP Control Room (Central)", phone: "080-22660000", timing: "24/7 Helpline" },
    { name: "BWSSB Water & Drainage Help", phone: "1916", timing: "24/7 Water Emergency" },
    { name: "BESCOM Power Emergency", phone: "1912", timing: "Live Wire / Transformer Hazards" },
    { name: "City Traffic Police Control", phone: "103 / 080-22943030", timing: "Traffic Obstruction" },
  ];

  return (
    <div className="relative isolate min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
            Municipal Public Grievance Desk
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Contact & <span className="text-blue-600">Civic Support</span>
          </h1>
          <p className="mx-auto max-w-xl text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Need immediate civic assistance or have questions regarding your ward's ongoing public works? Reach out directly to municipal coordinators.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Emergency Hotlines Strip (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 bg-white/90 shadow-md dark:border-slate-800 dark:bg-slate-900/90">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                24x7 Emergency Helplines
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                For life-threatening hazards or sudden infrastructure collapses:
              </p>

              <div className="mt-4 space-y-3">
                {emergencyContacts.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</p>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <a href={`tel:${c.phone}`} className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        📞 {c.phone}
                      </a>
                      <span className="text-[10px] text-slate-500">{c.timing}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 bg-white/90 shadow-md dark:border-slate-800 dark:bg-slate-900/90 text-xs space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Municipal Headquarters</p>
                  <p className="text-slate-500 dark:text-slate-400">N.R. Square, Hudson Circle, Bengaluru - 560002</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Official Correspondence</p>
                  <p className="text-slate-500 dark:text-slate-400">support@civicfix.in</p>
                </div>
              </div>
            </div>
          </div>

          {/* Direct Support Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 bg-white/90 shadow-md dark:border-slate-800 dark:bg-slate-900/90">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-600" />
                Submit Grievance Query
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Official municipal response within 24 working hours.
              </p>

              {sent ? (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/40 dark:bg-emerald-950/40">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                  <p className="mt-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">Message Delivered</p>
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    A municipal coordinator has been assigned to your query ticket.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Your name"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@domain.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="e.g. Query regarding Ward 84 road repair timeline"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Message Details
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Describe your issue or query clearly…"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 cursor-pointer"
                  >
                    Send Query to Civic Desk →
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
