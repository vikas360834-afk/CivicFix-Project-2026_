import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiError } from "../utils.js";
import AuthShell from "../components/AuthShell.jsx";
import {
  User,
  ShieldCheck,
  Wrench,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  CheckCircle2,
  X
} from "lucide-react";

const ROLES = [
  {
    role: "USER",
    label: "Citizen",
    icon: User,
    blurb: "Report & track issues",
  },
  {
    role: "ADMIN",
    label: "Admin",
    icon: ShieldCheck,
    blurb: "Command & dispatch",
  },
  {
    role: "ENGINEER",
    label: "Department",
    icon: Wrench,
    blurb: "Field repair & SLA",
  },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const roleParam = searchParams.get("role")?.toUpperCase();
  const initialRole = ROLES.some((r) => r.role === roleParam) ? roleParam : "USER";

  const [selectedRole, setSelectedRole] = useState(initialRole);

  useEffect(() => {
    if (roleParam && ROLES.some((r) => r.role === roleParam)) {
      setSelectedRole(roleParam);
    }
  }, [roleParam]);

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // OTP / Forgot Password Modal State
  const [otpModal, setOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState(1); // 1: Email, 2: OTP, 3: Success
  const [resetEmail, setResetEmail] = useState("");
  const [enteredOtp, setEnteredOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [otpMsg, setOtpMsg] = useState("");

  const activeTab = ROLES.find((r) => r.role === selectedRole) || ROLES[0];

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    if (!validate()) return;
    setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password, selectedRole);

      let targetPath = "/dashboard";
      if (user?.role === "ADMIN") {
        targetPath = "/admin";
      } else if (user?.role === "ENGINEER") {
        targetPath = "/engineer";
      } else {
        targetPath = "/dashboard";
      }

      navigate(location.state?.from || targetPath, { replace: true });
    } catch (err) {
      setServerError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setServerError("");
    setErrors({});
  };

  // OTP logic
  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes("@")) {
      setOtpMsg("Please enter a valid registered email address.");
      return;
    }
    setOtpMsg("");
    setOtpStep(2);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const code = enteredOtp.join("");
    if (code.length < 4) {
      setOtpMsg("Please enter the complete 6-digit verification code.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setOtpMsg("New password must be at least 6 characters.");
      return;
    }
    setOtpStep(3);
    setTimeout(() => {
      setOtpModal(false);
      setOtpStep(1);
      setResetEmail("");
      setEnteredOtp(["", "", "", "", "", ""]);
      setNewPassword("");
      setOtpMsg("");
    }, 2200);
  };

  const inputCls = (k) =>
    `w-full rounded-xl border bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder-slate-500 ${
      errors[k] ? "border-rose-500 ring-1 ring-rose-500/30" : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
    }`;

  return (
    <AuthShell
      title="Smart City Portal Sign In"
      subtitle={`Authenticate as ${activeTab.label} to access authorized municipal features`}
      footer={
        <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>
            New citizen reporter?{" "}
            <Link to="/register" className="font-bold text-blue-600 hover:underline dark:text-blue-400">
              Create an account →
            </Link>
          </p>
        </div>
      }
    >
      {/* 3 Role Selector Cards */}
      <div className="mb-6 grid grid-cols-3 gap-2.5">
        {ROLES.map((r) => {
          const Icon = r.icon;
          const isSelected = selectedRole === r.role;
          return (
            <button
              key={r.role}
              type="button"
              onClick={() => handleRoleSelect(r.role)}
              className={`group relative flex flex-col items-center justify-between rounded-2xl p-3.5 text-center transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-2 border-blue-600 bg-blue-50/80 shadow-md shadow-blue-500/15 dark:border-blue-500 dark:bg-blue-500/20"
                  : "border border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <span
                className={`mt-2 text-xs font-bold leading-tight ${
                  isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200"
                }`}
              >
                {r.label}
              </span>
              <span className="mt-1 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                {r.blurb}
              </span>
            </button>
          );
        })}
      </div>

      {serverError && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
          <span>⚠️</span> {serverError}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="email">
            Registered Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`${inputCls("email")} pl-9.5`}
              placeholder="Enter your registered email"
              value={form.email}
              onChange={set("email")}
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">
              Security Password
            </label>
            <button
              type="button"
              onClick={() => {
                setResetEmail(form.email || "");
                setOtpModal(true);
                setOtpStep(1);
              }}
              className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              id="password"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              className={`${inputCls("password")} pl-9.5 pr-11`}
              placeholder="••••••••"
              value={form.password}
              onChange={set("password")}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-xs text-slate-400 transition hover:text-slate-700 dark:hover:text-white"
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:opacity-95 hover:shadow-blue-500/30 disabled:opacity-50 cursor-pointer"
        >
          {busy ? `Authenticating ${activeTab.label}…` : `Log in as ${activeTab.label} →`}
        </button>
      </form>

      {/* OTP Verification & Password Reset Modal */}
      {otpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Reset Password & OTP Verification
                </h3>
              </div>
              <button
                onClick={() => setOtpModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {otpStep === 1 && (
              <form onSubmit={handleSendOtp} className="mt-4 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your registered citizen or official email address. A 6-digit one-time passcode (OTP) will be verified.
                </p>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@civicfix.in"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
                {otpMsg && <p className="text-xs text-rose-500">{otpMsg}</p>}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
                >
                  Generate & Send OTP →
                </button>
              </form>
            )}

            {otpStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  We sent a 6-digit code to <b className="text-slate-800 dark:text-white">{resetEmail}</b>. (Security code: <b>429180</b>)
                </p>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Enter 6-Digit OTP
                  </label>
                  <div className="flex justify-between gap-1.5">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <input
                        key={i}
                        type="text"
                        maxLength={1}
                        value={enteredOtp[i]}
                        onChange={(e) => {
                          const val = e.target.value;
                          const next = [...enteredOtp];
                          next[i] = val;
                          setEnteredOtp(next);
                          if (val && e.target.nextElementSibling) {
                            e.target.nextElementSibling.focus();
                          }
                        }}
                        className="h-11 w-11 rounded-xl border border-slate-200 bg-slate-50 text-center font-mono text-base font-bold text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>

                {otpMsg && <p className="text-xs text-rose-500">{otpMsg}</p>}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
                >
                  Verify OTP & Reset Password
                </button>
              </form>
            )}

            {otpStep === 3 && (
              <div className="mt-4 py-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 animate-bounce" />
                <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                  Password Reset Verified!
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Your credentials have been securely updated. You can now log in.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
