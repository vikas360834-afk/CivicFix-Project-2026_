import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiError, WARDS } from "../utils.js";
import AuthShell from "../components/AuthShell.jsx";
import { User, Mail, Lock, Phone, MapPin, Eye, EyeOff, ShieldCheck, CheckCircle2 } from "lucide-react";

function getPasswordStrength(pass) {
  if (!pass) return { score: 0, label: "", color: "bg-slate-700", percent: 0 };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 8) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass) || /[A-Z]/.test(pass)) score += 1;

  if (pass.length < 6) {
    return { score: 1, label: "Too short (min 6 chars)", color: "bg-rose-500", percent: 25 };
  }
  if (score <= 2) {
    return { score: 2, label: "Fair", color: "bg-amber-500", percent: 50 };
  }
  if (score === 3) {
    return { score: 3, label: "Good", color: "bg-blue-500", percent: 75 };
  }
  return { score: 4, label: "Strong & Secure", color: "bg-emerald-500", percent: 100 };
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    phone: "",
    ward: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const strength = getPasswordStrength(form.password);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Full name must be at least 2 characters";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
    if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    if (form.confirm !== form.password) e.confirm = "Passwords do not match";
    if (form.phone && !/^[+\d][\d\s-]{7,14}$/.test(form.phone)) e.phone = "Enter a valid phone number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    if (!validate()) return;
    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "USER",
        phone: form.phone.trim() || undefined,
        ward: form.ward || undefined,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const inputCls = (k) =>
    `w-full rounded-xl border bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder-slate-500 ${
      errors[k] ? "border-rose-500 ring-1 ring-rose-500/30" : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
    }`;

  return (
    <AuthShell
      title="Create Citizen Account"
      subtitle="Join the smart city civic action registry to report, track, and resolve neighborhood issues"
      footer={
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Already registered?{" "}
          <Link to="/login" className="font-bold text-blue-600 hover:underline dark:text-blue-400">
            Log in to portal →
          </Link>
        </p>
      }
    >
      {serverError && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
          <span>⚠️</span> {serverError}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="rname">
            Full Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              id="rname"
              className={`${inputCls("name")} pl-9.5`}
              placeholder="e.g. Priya Sharma"
              value={form.name}
              onChange={set("name")}
            />
          </div>
          {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="remail">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              id="remail"
              type="email"
              className={`${inputCls("email")} pl-9.5`}
              placeholder="you@domain.com"
              value={form.email}
              onChange={set("email")}
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="rpass">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="rpass"
                type={showPass ? "text" : "password"}
                className={`${inputCls("password")} pl-9.5`}
                placeholder="Min 6 chars"
                value={form.password}
                onChange={set("password")}
              />
            </div>
            {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="rconfirm">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="rconfirm"
                type={showPass ? "text" : "password"}
                className={`${inputCls("confirm")} pl-9.5`}
                placeholder="Re-type password"
                value={form.confirm}
                onChange={set("confirm")}
              />
            </div>
            {errors.confirm && <p className="mt-1 text-xs text-rose-500">{errors.confirm}</p>}
          </div>
        </div>

        {/* Password Strength Indicator */}
        {form.password && (
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Security Strength:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{strength.label}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={`h-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${strength.percent}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="rphone">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="rphone"
                className={`${inputCls("phone")} pl-9.5`}
                placeholder="+91 98xxxxxx"
                value={form.phone}
                onChange={set("phone")}
              />
            </div>
            {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="rward">
              Local Municipal Ward
            </label>
            <div className="relative">
              <select
                id="rward"
                className={inputCls("ward")}
                value={form.ward}
                onChange={set("ward")}
              >
                <option value="">Select Ward</option>
                {WARDS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:opacity-95 disabled:opacity-50 cursor-pointer"
        >
          {busy ? "Registering account…" : "Complete Citizen Registration 🚀"}
        </button>
      </form>
    </AuthShell>
  );
}
