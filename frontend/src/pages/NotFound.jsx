import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <div className="card pop w-full p-10">
        <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-600 px-6 py-8 text-white">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
            <div className="aurora aurora-1" />
            <div className="aurora aurora-3" />
          </div>
          <div className="relative z-10">
            <span className="text-5xl">🏚️</span>
            <h1 className="mt-2 text-5xl font-black">404</h1>
          </div>
        </div>

        <p className="mt-5 font-semibold text-slate-700">This page doesn't exist — the road ends here.</p>
        <p className="mt-1 text-sm text-slate-500">
          Maybe it was resolved and archived, or the link is wrong.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className="btn btn-primary">
            ← Back to Home
          </Link>
          <Link to="/issues" className="btn btn-soft">
            Browse issues
          </Link>
        </div>
      </div>
    </div>
  );
}
