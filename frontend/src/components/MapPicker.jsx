import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Crosshair,
  Search,
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Navigation
} from "lucide-react";

const DEFAULT = { latitude: 12.9716, longitude: 77.5946 }; // Bengaluru city centre

const BASEMAPS = {
  googleRoadmap: {
    label: "Google Roadmap",
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
  },
  googleSatellite: {
    label: "Google Satellite",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
  },
  streets: {
    label: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};

function pinIcon(color = "#2563eb") {
  return L.divIcon({
    html: `
      <div style="position:relative; width:36px; height:36px;">
        <div style="
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          background: ${color}33;
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          width: 36px; height: 36px;
          border-radius: 50% 50% 50% 0;
          background: ${color};
          transform: rotate(-45deg);
          display: flex; align-items: center; justify-content: center;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 14px rgba(37,99,235,0.5);
        ">
          <span style="transform: rotate(45deg); font-size: 16px;">📍</span>
        </div>
      </div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
}

export default function MapPicker({ value, onChange, onAddressFound }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const tileRef = useRef(null);

  const [geoError, setGeoError] = useState("");
  const [locating, setLocating] = useState(false);
  const [base, setBase] = useState("googleRoadmap");
  const [nearby, setNearby] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!boxRef.current) return;
    if (boxRef.current._leaflet_id && mapRef.current) return;
    if (boxRef.current._leaflet_id) boxRef.current._leaflet_id = null;

    const initialLat = value?.latitude || DEFAULT.latitude;
    const initialLng = value?.longitude || DEFAULT.longitude;

    const map = L.map(boxRef.current, {
      scrollWheelZoom: true,
      zoomControl: true,
    }).setView([initialLat, initialLng], value ? 15 : 12);

    tileRef.current = L.tileLayer(BASEMAPS[base].url, {
      maxZoom: BASEMAPS[base].maxZoom,
      subdomains: BASEMAPS[base].subdomains || ["mt0", "mt1", "mt2", "mt3"],
      attribution: BASEMAPS[base].attribution,
    }).addTo(map);

    map.on("click", (e) => {
      onChange({ latitude: +e.latlng.lat.toFixed(6), longitude: +e.latlng.lng.toFixed(6) });
    });

    map.on("contextmenu", (e) => {
      onChange({ latitude: +e.latlng.lat.toFixed(6), longitude: +e.latlng.lng.toFixed(6) });
    });

    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 300);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(boxRef.current);

    return () => {
      clearTimeout(t);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      tileRef.current = null;
    };
  }, []);

  // Update base tile
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileRef.current) return;
    const conf = BASEMAPS[base];
    map.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(conf.url, {
      maxZoom: conf.maxZoom,
      subdomains: conf.subdomains || ["mt0", "mt1", "mt2", "mt3"],
      attribution: conf.attribution,
    }).addTo(map);
    tileRef.current.bringToBack();
  }, [base]);

  // Marker sync
  const hadMarker = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) {
      const m = L.marker([value.latitude, value.longitude], {
        draggable: true,
        icon: pinIcon("#2563eb"),
      }).addTo(map);

      m.on("dragend", () => {
        const p = m.getLatLng();
        onChange({ latitude: +p.lat.toFixed(6), longitude: +p.lng.toFixed(6) });
      });

      markerRef.current = m;
      if (!hadMarker.current) {
        map.flyTo([value.latitude, value.longitude], 16, { duration: 0.8 });
      }
      hadMarker.current = true;
    }
  }, [value, onChange]);

  // Reverse geocoding
  useEffect(() => {
    if (!value) {
      setNearby("");
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${value.latitude}&lon=${value.longitude}&zoom=16&addressdetails=1`,
        { headers: { Accept: "application/json" } }
      )
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          if (!alive) return;
          const addr = d.display_name || "";
          setNearby(addr);
          if (onAddressFound && addr) {
            onAddressFound(addr);
          }
        })
        .catch(() => {
          if (alive) setNearby("");
        });
    }, 600);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [value, onAddressFound]);

  // Search address via Nominatim
  const handleAddressSearch = async (e) => {
    e?.preventDefault();
    if (!addressSearch.trim()) return;

    setSearching(true);
    setGeoError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          addressSearch + ", Bengaluru, India"
        )}&limit=1`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        onChange({ latitude: +lat.toFixed(6), longitude: +lon.toFixed(6) });
        mapRef.current?.flyTo([lat, lon], 16, { duration: 1.0 });
      } else {
        setGeoError("Location not found. Try searching a major landmark or ward name.");
      }
    } catch {
      setGeoError("Failed to search location. Click the map to drop a pin manually.");
    } finally {
      setSearching(false);
    }
  };

  // Locate me with GPS
  const locateMe = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const v = {
          latitude: +pos.coords.latitude.toFixed(6),
          longitude: +pos.coords.longitude.toFixed(6),
        };
        onChange(v);
        mapRef.current?.flyTo([v.latitude, v.longitude], 16, { duration: 0.9 });
        setLocating(false);
      },
      (err) => {
        setGeoError("GPS permission denied or unavailable. Click on map to place pin.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const copyCoords = () => {
    if (!value) return;
    navigator.clipboard.writeText(`${value.latitude}, ${value.longitude}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-md dark:border-slate-800/80 dark:bg-slate-900/90">
      {/* Search & Tool Bar */}
      <div className="border-b border-slate-200/80 p-3.5 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <form onSubmit={handleAddressSearch} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search area, landmark or street (e.g. Koramangala 5th Block)"
                value={addressSearch}
                onChange={(e) => setAddressSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/70 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {searching ? "Searching..." : "Find"}
            </button>
          </form>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={locateMe}
              disabled={locating}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
              title="Locate me using GPS"
            >
              <Crosshair className={`h-3.5 w-3.5 ${locating ? "animate-spin text-blue-600" : ""}`} />
              <span>{locating ? "Locating..." : "Locate Me"}</span>
            </button>

            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
              {Object.entries(BASEMAPS).map(([key, m]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBase(key)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    base === key
                      ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
                title="Remove marker"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map Box */}
      <div className="relative">
        <div ref={boxRef} className="h-72 w-full z-0" />
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
          Click map or drag pin to position
        </div>
      </div>

      {/* Location Details Footer */}
      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-900/60">
        {value ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>Selected Coordinates:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
                </span>
                <button
                  type="button"
                  onClick={copyCoords}
                  className="rounded p-1 text-slate-400 hover:text-blue-600 transition"
                  title="Copy coordinates"
                >
                  {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              {nearby && (
                <p className="mt-1 line-clamp-1 text-[11px] text-slate-600 dark:text-slate-400">
                  📍 {nearby}
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              ✓ Location Pinned
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Navigation className="h-4 w-4 text-blue-500" />
            <span>Click anywhere on the map or use &ldquo;Locate Me&rdquo; to pin the exact complaint location.</span>
          </div>
        )}

        {geoError && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{geoError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
