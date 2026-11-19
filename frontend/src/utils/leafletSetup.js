import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Ensure Leaflet is attached to window globally before any plugin runs
if (typeof window !== "undefined") {
  window.L = L;
}

// Fix Leaflet's default icon URLs so standard markers never break
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
} catch {
  // Ignore in SSR
}

export default L;
