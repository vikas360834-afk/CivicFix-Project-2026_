import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { CATEGORY_LABELS, CATEGORY_EMOJI, STATUS_CONFIG, apiError, WARDS } from "../utils.js";
import MapPicker from "../components/MapPicker.jsx";
import Confetti from "../components/Confetti.jsx";

const emptyForm = {
  title: "",
  description: "",
  category: "OTHER",
  location: "",
  ward: "",
  landmark: "",
};

const MAX_PHOTOS = 5;

export default function ReportIssue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [uploadMsg, setUploadMsg] = useState("");

  // photos picked before submit: [{ url, file }]
  const [photos, setPhotos] = useState([]);
  const objectUrls = useRef([]);

  // GPS pin picked on the map (optional)
  const [pin, setPin] = useState(null);

  // live AI triage
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // live Duplicate check
  const [duplicates, setDuplicates] = useState([]);
  const [dupLoading, setDupLoading] = useState(false);
  const debounceRef = useRef(null);

  // revoke object URLs on unmount
  useEffect(() => () => objectUrls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  // arriving from the map via right-click → /report?lat=…&lng=…
  useEffect(() => {
    const lat = parseFloat(params.get("lat"));
    const lng = parseFloat(params.get("lng"));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setPin({ latitude: lat, longitude: lng });
    }
  }, [params]);

  // Combined AI classification and Duplicate Detection debounce
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const text = `${form.title} ${form.description}`.trim();
    if (text.length < 8) {
      setAi(null);
      setDuplicates([]);
      return;
    }

    setAiLoading(true);
    setDupLoading(true);

    debounceRef.current = setTimeout(async () => {
      // 1. AI triage classification
      try {
        const { data } = await api.post("/ai/classify", {
          title: form.title,
          description: form.description,
        });
        setAi(data);
      } catch {
        setAi(null);
      } finally {
        setAiLoading(false);
      }

      // 2. Duplicate detection check
      try {
        const { data: dupData } = await api.post("/issues/check-duplicate", {
          title: form.title,
          description: form.description,
          category: form.category,
          ward: form.ward || null,
          latitude: pin?.latitude ?? null,
          longitude: pin?.longitude ?? null,
        });
        setDuplicates(dupData.possibleDuplicates || dupData.matches || []);
      } catch {
        setDuplicates([]);
      } finally {
        setDupLoading(false);
      }
    }, 600);

    return () => clearTimeout(debounceRef.current);
  }, [form.title, form.description, form.category, form.ward, pin]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (form.title.trim().length < 5) e.title = "Title must be at least 5 characters";
    if (form.description.trim().length < 20) e.description = "Describe the issue in at least 20 characters";
    if (form.location.trim().length < 3) e.location = "Location is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addPhotos = (fileList) => {
    const room = MAX_PHOTOS - photos.length;
    const next = Array.from(fileList)
      .slice(0, room)
      .map((file) => {
        const url = URL.createObjectURL(file);
        objectUrls.current.push(url);
        return { url, file };
      });
    setPhotos((p) => [...p, ...next]);
    setErrors((e) => ({ ...e, photos: undefined }));
  };

  const removePhoto = (url) => {
    setPhotos((p) => p.filter((x) => x.url !== url));
    URL.revokeObjectURL(url);
    objectUrls.current = objectUrls.current.filter((u) => u !== url);
  };

  const uploadPhotos = async (issueId) => {
    for (const p of photos) {
      const fd = new FormData();
      fd.append("images", p.file, p.file.name);
      await api.post(`/issues/${issueId}/images`, fd);
    }
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    if (!validate()) return;
    setBusy(true);
    setUploadMsg("");
    try {
      const { data } = await api.post("/issues", {
        ...form,
        ward: form.ward || null,
        landmark: form.landmark || null,
        latitude: pin?.latitude ?? null,
        longitude: pin?.longitude ?? null,
      });
      if (photos.length > 0) {
        setUploadMsg("Uploading evidence photos…");
        await uploadPhotos(data.issue.id);
      }
      setCreated(data.issue);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setServerError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setForm(emptyForm);
    setCreated(null);
    setAi(null);
    setDuplicates([]);
    setUploadMsg("");
    setPin(null);
    setPhotos((p) => {
      p.forEach((x) => URL.revokeObjectURL(x.url));
      return [];
    });
  };

  const inputCls = (k) =>
    `w-full rounded-xl border bg-slate-900/50 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 backdrop-blur-md outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
      errors[k] ? "border-rose-500 ring-1 ring-rose-500/30" : "border-white/10 hover:border-white/20"
    }`;

  if (created) {
    return (
      <div className="relative mx-auto max-w-3xl px-4 py-12 text-center">
        <Confetti count={80} />
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 shadow-xl shadow-cyan-500/20">
          <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-[#0B132B]">
            <span className="text-3xl">✨</span>
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-black text-slate-100 sm:text-4xl">
          Report Submitted Successfully
        </h1>
        <p className="mt-3 text-sm text-slate-400 max-w-lg mx-auto">
          Your complaint <span className="font-bold text-blue-400">#{created.id}</span> (<i>{created.title}</i>) has been received and added to the official civic registry.
        </p>

        {/* 7-Step Status Tracker */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-[#10182A]/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              CivicFix 7-Stage Resolution Lifecycle
            </p>
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-400 border border-amber-500/20">
              Pending Admin Review
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 text-left">
            {[
              { num: 1, label: "Reported", state: "done", icon: "✓" },
              { num: 2, label: "Pending Approval", state: "active", icon: "⏳" },
              { num: 3, label: "Approved", state: "pending", icon: "📋" },
              { num: 4, label: "Assigned", state: "pending", icon: "👷" },
              { num: 5, label: "In Progress", state: "pending", icon: "⚙️" },
              { num: 6, label: "Resolved", state: "pending", icon: "📸" },
              { num: 7, label: "Verified", state: "pending", icon: "🏆" },
            ].map((st) => (
              <div
                key={st.num}
                className={`rounded-2xl border p-3 transition ${
                  st.state === "done"
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
                    : st.state === "active"
                    ? "border-amber-500/40 bg-amber-950/30 text-amber-300 ring-2 ring-amber-500/20"
                    : "border-white/5 bg-slate-900/40 text-slate-500"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Step {st.num}</span>
                  <span>{st.icon}</span>
                </div>
                <div className="mt-2 text-xs font-semibold">{st.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI & Photos summary */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
          {created.aiDepartment && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-950/40 px-3 py-1.5 font-medium text-blue-300">
              🤖 AI Assigned Department: <b>{created.aiDepartment}</b>
            </span>
          )}
          {photos.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 font-medium text-cyan-300">
              📷 <b>{photos.length}</b> Evidence Photo(s) Attached
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-950/40 px-3 py-1.5 font-medium text-purple-300">
            ⭐ +10 Civic Contribution Points Earned
          </span>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to={`/issues/${created.id}`}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition hover:scale-105"
          >
            Track Issue Lifecycle →
          </Link>
          <button
            onClick={restart}
            className="rounded-xl border border-white/10 bg-slate-800/60 px-6 py-3 text-xs font-bold text-slate-300 backdrop-blur-md transition hover:bg-slate-700/60 hover:text-white"
          >
            + Report Another Issue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
          Smart Civic Issue Portal
        </div>
        <h1 className="mt-2 text-2xl font-black text-slate-100 sm:text-3xl">
          Report a Civic Issue
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Reporting as <b className="text-slate-200">{user?.name}</b>. Our dual AI engines perform real-time triage categorization and duplicate detection to keep city resolution swift.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6 rounded-3xl border border-white/10 bg-[#10182A]/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl" noValidate>
        {serverError && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
            ⚠️ {serverError}
          </div>
        )}

        {/* Live Duplicate Warning Banner */}
        {duplicates.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    AI Duplicate Detection: {duplicates.length} Similar Issue{duplicates.length > 1 ? "s" : ""} Found
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Someone may have already reported this problem. Upvoting an existing issue increases its priority for city engineers instead of creating a duplicate.
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {duplicates.slice(0, 3).map((dup) => (
                <div
                  key={dup.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-900/60 p-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 truncate">{dup.title}</span>
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {dup.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      📍 {dup.location} · {dup.category} · {dup.upvotesCount} upvotes
                    </p>
                  </div>
                  <Link
                    to={`/issues/${dup.id}`}
                    target="_blank"
                    className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
                  >
                    View & Upvote →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live AI Triage Card */}
        {ai && (
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 backdrop-blur-md">
            <div className="text-xs text-slate-200">
              <p className="font-bold flex items-center gap-1.5 text-blue-400">
                <span>🤖</span> AI Smart Triage Suggestion
              </p>
              <p className="mt-1.5 text-slate-300">
                Predicted Category: <b className="text-white">{CATEGORY_LABELS[ai.category] || ai.category}</b> · Priority: <b className="text-amber-300">{ai.priority}</b>
                <br />
                Assigned Department: <b className="text-cyan-300">{ai.department}</b>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, category: ai.category }))}
              className="shrink-0 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-500 shadow-md shadow-blue-600/30"
            >
              Apply AI Category
            </button>
          </div>
        )}

        {(aiLoading || dupLoading) && (
          <div className="flex items-center gap-2 text-xs text-cyan-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            AI analyzing issue description & scanning city database for duplicates…
          </div>
        )}

        {/* Title input */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-300">Issue Title *</label>
          <input
            className={inputCls("title")}
            placeholder="e.g. Deep pothole causing traffic obstruction on Main Street"
            value={form.title}
            onChange={set("title")}
          />
          {errors.title && <p className="mt-1 text-xs text-rose-400">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-300">Detailed Description *</label>
          <textarea
            rows={4}
            className={inputCls("description")}
            placeholder="Describe the issue, hazards posed, how long it has been unresolved, and any landmark nearby…"
            value={form.description}
            onChange={set("description")}
          />
          {errors.description && <p className="mt-1 text-xs text-rose-400">{errors.description}</p>}
        </div>

        {/* Evidence Photos */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-300">Evidence Photos (Optional)</label>
          <div className="flex flex-wrap gap-3">
            {photos.map((p) => (
              <div key={p.url} className="group relative">
                <img
                  src={p.url}
                  alt="preview"
                  className="h-24 w-24 rounded-2xl border border-white/10 object-cover shadow-lg"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(p.url)}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-md transition hover:scale-110"
                  title="Remove photo"
                >
                  ✕
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label
                className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-white/10 bg-slate-900/30 text-slate-400 transition hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-300"
                title="Add photos"
              >
                <span className="text-xl">📷</span>
                <span className="text-[11px] font-medium">Add Photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => addPhotos(e.target.files)}
                />
              </label>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Upload up to {MAX_PHOTOS} photos (JPG, PNG, WEBP · max 5MB each). Real photos increase verification speed by 3x.
          </p>
          {errors.photos && <p className="mt-1 text-xs text-rose-400">{errors.photos}</p>}
        </div>

        {/* Category & Ward */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Category *</label>
            <select
              className={inputCls("category")}
              value={form.category}
              onChange={set("category")}
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="bg-slate-900 text-slate-100">
                  {CATEGORY_EMOJI[k]} {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Municipal Ward</label>
            <select
              className={inputCls("ward")}
              value={form.ward}
              onChange={set("ward")}
            >
              <option value="" className="bg-slate-900 text-slate-100">Select Municipal Ward</option>
              {WARDS.map((w) => (
                <option key={w} value={w} className="bg-slate-900 text-slate-100">
                  {w}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location & Landmark */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Exact Street / Area Address *</label>
            <input
              className={inputCls("location")}
              placeholder="e.g. 100 Feet Ring Road, Near 5th Block Junction"
              value={form.location}
              onChange={set("location")}
            />
            {errors.location && <p className="mt-1 text-xs text-rose-400">{errors.location}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Prominent Landmark (Optional)</label>
            <input
              className={inputCls("landmark")}
              placeholder="e.g. Opposite BDA Complex / Metro Pillar 140"
              value={form.landmark}
              onChange={set("landmark")}
            />
          </div>
        </div>

        {/* GPS pin on interactive dark map */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-300">
            Pin Location on Map (Optional — Precise Geocoding)
          </label>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <MapPicker value={pin} onChange={setPin} />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-500/20 transition hover:opacity-95 hover:shadow-cyan-500/30 disabled:opacity-50"
        >
          {busy ? (uploadMsg || "Recording Issue…") : "Submit Official Issue Report 🚀"}
        </button>
      </form>
    </div>
  );
}
