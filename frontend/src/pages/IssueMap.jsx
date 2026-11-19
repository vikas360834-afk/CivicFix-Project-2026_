import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import L from "../utils/leafletSetup.js";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.heat";

import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  CATEGORIES,
  CATEGORY_META,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  STATUS_META,
  PRIORITY_META,
  timeAgo,
  fmtDate,
  issuePhoto,
  WARDS,
} from "../utils.js";
import { BENGALURU_DEMO_ISSUES } from "../data/demoIssues.js";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

// Ensure Leaflet is globally accessible for plugins
if (typeof window !== "undefined" && !window.L) {
  window.L = L;
}

const DEFAULT_CENTER = [12.9716, 77.5946]; // Bengaluru City Hall / CBD
const DEFAULT_ZOOM = 12;

const STATUS_COLORS = {
  OPEN: "#F59E0B",
  ASSIGNED: "#06B6D4",
  IN_PROGRESS: "#3B82F6",
  RESOLVED: "#10B981",
  CLOSED: "#10B981",
  REJECTED: "#EF4444",
  PENDING_APPROVAL: "#A855F7",
};

const BASEMAPS = {
  googleRoadmap: {
    label: "🗺️ Google Roadmap",
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>',
  },
  googleHybrid: {
    label: "🌐 Google Hybrid",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>',
  },
  googleSatellite: {
    label: "🛰️ Google Satellite",
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>',
  },
  googleTerrain: {
    label: "⛰️ Google Terrain",
    url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>',
  },
  googleTraffic: {
    label: "🚦 Google Traffic",
    url: "https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}",
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>',
  },
  osm: {
    label: "🚗 OSM Streets",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

const PRIORITY_PIN_COLORS = {
  CRITICAL: "#EF4444", // Red
  HIGH: "#F97316",     // Orange
  MEDIUM: "#EAB308",   // Yellow
  LOW: "#3B82F6",      // Blue
};

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function createPinIcon(priority, emoji, status, isDemo, isMuted) {
  const normPriority = (priority || "MEDIUM").toUpperCase();
  const isCritical = normPriority === "CRITICAL";
  const size = isCritical ? 36 : 28;
  const color = PRIORITY_PIN_COLORS[normPriority] || "#EAB308";
  const glow = isCritical
    ? "box-shadow: 0 0 16px rgba(239, 68, 68, 0.95);"
    : `box-shadow: 0 0 10px ${color}80;`;
  const opacity = isMuted ? "opacity: 0.65;" : "";
  const demoBadge = isDemo
    ? `<span style="position:absolute;top:-4px;right:-4px;background:#8B5CF6;color:#ffffff;font-size:8px;font-weight:900;padding:1px 3px;border-radius:4px;border:1px solid #ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.4)">DEMO</span>`
    : "";

  return L.divIcon({
    html: `
      <div style="position:relative; width:${size}px; height:${size}px; ${opacity}">
        <div style="
          width:${size}px; height:${size}px;
          border-radius: 50% 50% 50% 0;
          background: ${color};
          transform: rotate(-45deg);
          display: flex; align-items: center; justify-content: center;
          border: 2px solid rgba(255,255,255,0.95);
          ${glow}
        ">
          <span style="transform: rotate(45deg); font-size: ${isCritical ? 16 : 13}px; line-height: 1;">${emoji}</span>
        </div>
        ${demoBadge}
      </div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function popupHtml(issue) {
  const statusColor = STATUS_COLORS[issue.status] || "#3B82F6";
  const priorityColor = PRIORITY_PIN_COLORS[issue.priority] || "#EAB308";
  const photo = issuePhoto(issue);
  const cat = CATEGORY_META[issue.category];
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`;
  const isDemo = Boolean(issue.isDemo);

  return `
    <div style="min-width:240px;max-width:280px;font-size:12px;line-height:1.45;font-family:system-ui,-apple-system,sans-serif;color:#f8fafc">
      <div style="position:relative;margin-bottom:8px">
        <img src="${photo}" alt="" onerror="this.style.display='none'"
             style="width:100%;height:105px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,0.1)" />
        ${isDemo ? `<span style="position:absolute;top:6px;left:6px;background:#8B5CF6;color:#ffffff;padding:2px 6px;border-radius:6px;font-size:10px;font-weight:800;box-shadow:0 2px 4px rgba(0,0,0,0.5)">🧪 DEMO REPORT</span>` : ""}
      </div>
      
      <div style="font-weight:800;font-size:13px;margin-bottom:4px;color:#ffffff">
        #${escapeHtml(issue.id)} ${escapeHtml(issue.title)}
      </div>

      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">
        <span style="background:${priorityColor};color:#fff;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700">
          Priority: ${escapeHtml(issue.priority || "MEDIUM")}
        </span>
        <span style="background:${statusColor};color:#fff;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700">
          ${issue.status}
        </span>
        ${
          cat
            ? `<span style="background:${cat.color}30;color:${cat.color};border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700">
                ${cat.emoji} ${escapeHtml(cat.label)}
              </span>`
            : ""
        }
      </div>

      <p style="color:#cbd5e1;font-size:11px;margin:4px 0 6px 0;line-height:1.35;max-height:48px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
        ${escapeHtml(issue.description || "")}
      </p>

      <div style="color:#94a3b8;font-size:11px;margin-bottom:2px">
        📍 ${escapeHtml(issue.location)}${issue.ward ? " · " + escapeHtml(issue.ward) : ""}
      </div>
      <div style="color:#64748b;font-size:10px">
        📅 ${fmtDate(issue.createdAt)} (${timeAgo(issue.createdAt)}) · 👍 ${issue.upvotes || 0}
      </div>
      ${
        issue.aiDepartment
          ? `<div style="color:#06b6d4;margin-top:4px;font-size:10px">🤖 Dept: ${escapeHtml(issue.aiDepartment)}</div>`
          : ""
      }

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;border-top:1px solid rgba(255,255,255,0.12);padding-top:8px">
        <a href="${isDemo ? '#preview-' + issue.id : '/issues/' + issue.id}" 
           class="cf-popup-view" 
           data-issue-id="${issue.id}"
           style="color:#38bdf8;font-weight:700;text-decoration:none;font-size:11px">
           ${isDemo ? "View Preview 🔍" : "View Ticket →"}
        </a>
        <div style="display:flex;gap:8px">
          <a href="https://www.google.com/maps/search/?api=1&query=${issue.latitude},${issue.longitude}" target="_blank" rel="noreferrer" style="color:#38bdf8;font-weight:600;text-decoration:none;font-size:11px">
            🗺️ Google Map
          </a>
          <a href="${maps}" target="_blank" rel="noreferrer" style="color:#a78bfa;font-weight:600;text-decoration:none;font-size:11px">
            🚗 Directions
          </a>
        </div>
      </div>
    </div>`;
}

export default function IssueMap() {
  const { user, isAdmin, isUser, isEngineer } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // Data states
  const [dbIssues, setDbIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Demo mode state: "ALL" (Real + Demo), "REAL" (Real only), "DEMO" (Demo only)
  const [dataSource, setDataSource] = useState("ALL");

  // Filter states
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL"); // ALL | 24H | 7D | 30D
  const [searchQuery, setSearchQuery] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [assignedOnly, setAssignedOnly] = useState(false);

  // Map layer controls — Google Maps is the primary default provider
  const [baseMap, setBaseMap] = useState("googleRoadmap");
  const [googleEmbedMode, setGoogleEmbedMode] = useState(false);
  const [heatOn, setHeatOn] = useState(false);
  const [ringsOn, setRingsOn] = useState(false);

  // Layout & UI states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState("list"); // "list" | "hotspots" | "analytics"
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null); // { lat, lng, address, loadingAddress }

  // DOM Refs
  const boxRef = useRef(null);
  const wrapRef = useRef(null);
  const mapRef = useRef(null);
  const tileRef = useRef(null);
  const clusterRef = useRef(null);
  const heatRef = useRef(null);
  const ringsRef = useRef(null);
  const userMarkerRef = useRef(null);
  const pinMarkerRef = useRef(null);

  /* ---------------- Fetch Live Database Issues ---------------- */
  const loadDatabaseIssues = useCallback(async () => {
    setLoading(true);
    setApiFailed(false);
    setErrorMsg("");
    try {
      const queryUrl = showResolved && isAdmin ? "/issues?limit=500&includeResolved=true" : "/issues?limit=500";
      const { data } = await api.get(queryUrl);
      setDbIssues(data.issues || []);
    } catch (err) {
      console.warn("IssueMap: Real API fetch error:", err);
      setApiFailed(true);
      setErrorMsg(err?.response?.data?.error || "Could not load live issues from server.");
    } finally {
      setLoading(false);
    }
  }, [showResolved, isAdmin]);

  useEffect(() => {
    loadDatabaseIssues();
  }, [loadDatabaseIssues]);

  /* ---------------- Merge Real & Demo Data ---------------- */
  const combinedIssues = useMemo(() => {
    let list = [];
    if (dataSource === "REAL" || dataSource === "ALL") {
      list = list.concat(dbIssues.map((i) => ({ ...i, isDemo: false })));
    }
    if (dataSource === "DEMO" || dataSource === "ALL") {
      list = list.concat(BENGALURU_DEMO_ISSUES);
    }
    return list;
  }, [dbIssues, dataSource]);

  /* ---------------- Validate & Normalize Coordinates ---------------- */
  const validIssues = useMemo(() => {
    return combinedIssues.filter((i) => {
      const lat = parseFloat(i.latitude);
      const lng = parseFloat(i.longitude);
      return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    });
  }, [combinedIssues]);

  /* ---------------- Jitter Overlapping Coordinates ---------------- */
  const jitteredIssues = useMemo(() => {
    const coordSeen = new Map();
    return validIssues.map((issue) => {
      const lat = parseFloat(issue.latitude);
      const lng = parseFloat(issue.longitude);
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      const count = coordSeen.get(key) || 0;
      coordSeen.set(key, count + 1);

      if (count === 0) return { ...issue, latitude: lat, longitude: lng };

      const angle = (count * 60 * Math.PI) / 180;
      const radius = 0.00018 * Math.ceil(count / 6);
      return {
        ...issue,
        latitude: lat + Math.sin(angle) * radius,
        longitude: lng + Math.cos(angle) * radius,
      };
    });
  }, [validIssues]);

  /* ---------------- Apply User Interactive Filters ---------------- */
  const filteredIssues = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    const now = Date.now();

    return jitteredIssues.filter((i) => {
      // Engineer: Assigned to me only
      if (assignedOnly && isEngineer && i.assignedToId !== user?.id) return false;

      // Category filter
      if (categoryFilter && i.category !== categoryFilter) return false;

      // Status filter
      if (statusFilter && i.status !== statusFilter) return false;

      // Priority filter
      if (priorityFilter && i.priority !== priorityFilter) return false;

      // Ward filter
      if (wardFilter && i.ward !== wardFilter) return false;

      // Date Range filter
      if (dateFilter !== "ALL") {
        const itemTime = new Date(i.createdAt).getTime();
        const diffMs = now - itemTime;
        if (dateFilter === "24H" && diffMs > 24 * 3600000) return false;
        if (dateFilter === "7D" && diffMs > 7 * 86400000) return false;
        if (dateFilter === "30D" && diffMs > 30 * 86400000) return false;
      }

      // Text search
      if (term) {
        const hay = `${i.id} ${i.title} ${i.description} ${i.location} ${i.ward} ${i.category}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }

      return true;
    });
  }, [jitteredIssues, categoryFilter, statusFilter, priorityFilter, wardFilter, dateFilter, searchQuery, assignedOnly, isEngineer, user]);

  /* ---------------- Ward Hotspots Summary ---------------- */
  const wardHotspots = useMemo(() => {
    const counts = {};
    filteredIssues.forEach((i) => {
      if (!i.ward) return;
      counts[i.ward] = (counts[i.ward] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredIssues]);

  /* ---------------- Mini Analytics: Category Counts ---------------- */
  const categoryAnalytics = useMemo(() => {
    const map = {};
    filteredIssues.forEach((i) => {
      const label = CATEGORY_LABELS[i.category] || i.category;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredIssues]);

  /* ---------------- KPI Counts ---------------- */
  const kpis = useMemo(() => {
    const total = filteredIssues.length;
    const realCount = filteredIssues.filter((i) => !i.isDemo).length;
    const demoCount = filteredIssues.filter((i) => i.isDemo).length;
    const openCount = filteredIssues.filter((i) => i.status === "OPEN" || i.status === "PENDING_APPROVAL").length;
    const inProgressCount = filteredIssues.filter((i) => i.status === "IN_PROGRESS" || i.status === "ASSIGNED").length;
    const resolvedCount = filteredIssues.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;
    const criticalCount = filteredIssues.filter((i) => i.priority === "CRITICAL" || i.priority === "HIGH").length;

    return { total, realCount, demoCount, openCount, inProgressCount, resolvedCount, criticalCount };
  }, [filteredIssues]);

  /* ---------------- Initialize Leaflet Map ---------------- */
  useEffect(() => {
    const container = boxRef.current;
    if (!container) return;

    // Clean up any stale instances or orphan nodes
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (err) {
        console.warn("Leaflet map remove err:", err);
      }
      mapRef.current = null;
    }
    if (container._leaflet_id) {
      delete container._leaflet_id;
      container.innerHTML = "";
    }

    const map = L.map(container, {
      scrollWheelZoom: true,
      zoomControl: false, // We place custom zoom controls
      attributionControl: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    const conf = BASEMAPS[baseMap] || BASEMAPS.googleRoadmap;
    tileRef.current = L.tileLayer(conf.url, {
      maxZoom: conf.maxZoom || 20,
      subdomains: conf.subdomains || ["mt0", "mt1", "mt2", "mt3"],
      attribution: conf.attribution,
    }).addTo(map);

    L.control.scale({ imperial: false, metric: true, position: "bottomleft" }).addTo(map);

    if (typeof L.markerClusterGroup === "function") {
      clusterRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 45,
        disableClusteringAtZoom: 16,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cl) =>
          L.divIcon({
            html: `<div style="
              background: linear-gradient(135deg, #3B82F6, #06B6D4);
              color: #ffffff;
              font-weight: 800;
              font-size: 13px;
              width: 42px; height: 42px;
              border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              border: 2px solid rgba(255,255,255,0.85);
              box-shadow: 0 0 16px rgba(6,182,212,0.7);
            "><span>${cl.getChildCount()}</span></div>`,
            className: "",
            iconSize: [42, 42],
            iconAnchor: [21, 21],
          }),
      }).addTo(map);
    } else {
      clusterRef.current = L.layerGroup().addTo(map);
    }

    ringsRef.current = L.layerGroup();
    if (typeof L.heatLayer === "function") {
      heatRef.current = L.heatLayer([], {
        radius: 34,
        blur: 26,
        maxZoom: 16,
        max: 1.0,
        gradient: { 0.2: "#3B82F6", 0.5: "#06B6D4", 0.75: "#F59E0B", 1: "#EF4444" },
      });
    }

    // Left-click on map = manual location selection & reverse-geocoded address
    map.on("click", async (e) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));

      setSelectedPin({
        lat,
        lng,
        address: "Resolving street address...",
        loadingAddress: true,
      });

      if (!pinMarkerRef.current) {
        pinMarkerRef.current = L.marker([lat, lng], {
          icon: L.divIcon({
            html: `
              <div style="position:relative;width:32px;height:32px;">
                <div style="position:absolute;inset:0;border-radius:50%;background:#F59E0B;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
                <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:#F59E0B;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 0 16px rgba(245,158,11,0.8);">
                  <span style="transform:rotate(45deg);font-size:16px;">📍</span>
                </div>
              </div>`,
            className: "",
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          }),
          zIndexOffset: 2000,
        }).addTo(map);
      } else {
        pinMarkerRef.current.setLatLng([lat, lng]);
      }

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        const addr = data.display_name || `Coordinates: ${lat}, ${lng}`;
        setSelectedPin((prev) => (prev ? { ...prev, address: addr, loadingAddress: false } : null));
      } catch {
        setSelectedPin((prev) => (prev ? { ...prev, address: `Coordinates: ${lat}, ${lng}`, loadingAddress: false } : null));
      }
    });

    // Right-click = quick navigate to report pinned at coords
    map.on("contextmenu", (e) => {
      if (user?.role === "USER" || user?.role === "ADMIN") {
        navigate(`/report?lat=${e.latlng.lat.toFixed(6)}&lng=${e.latlng.lng.toFixed(6)}`);
      }
    });

    mapRef.current = map;
    setMapReady(true);

    // Progressive resize invalidations to guarantee full tile rendering without gray tiles
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 800);
    const t4 = setTimeout(() => map.invalidateSize(), 1500);

    // Attach ResizeObserver to guarantee crisp rendering on window or container size change
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      resizeObserver.disconnect();
      setMapReady(false);
      try {
        map.remove();
      } catch (err) {
        console.warn("Map unmount err:", err);
      }
      mapRef.current = null;
      tileRef.current = null;
      clusterRef.current = null;
      ringsRef.current = null;
      heatRef.current = null;
      userMarkerRef.current = null;
      pinMarkerRef.current = null;
    };
  }, []); // Mounts once

  /* ---------------- Sidebar toggle resize trigger ---------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 200);
    return () => clearTimeout(t);
  }, [sidebarOpen]);

  /* ---------------- Basemap Switcher Effect ---------------- */
  useEffect(() => {
    const map = mapRef.current;
    const tile = tileRef.current;
    if (!map || !tile) return;
    const conf = BASEMAPS[baseMap] || BASEMAPS.googleRoadmap;
    map.removeLayer(tile);
    tileRef.current = L.tileLayer(conf.url, {
      maxZoom: conf.maxZoom || 20,
      subdomains: conf.subdomains || ["mt0", "mt1", "mt2", "mt3"],
      attribution: conf.attribution,
    }).addTo(map);
    tileRef.current.bringToBack();
  }, [baseMap]);

  /* ---------------- Render Markers, Clusters & Heatmap ---------------- */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !clusterRef.current) return;

    const map = mapRef.current;
    const cluster = clusterRef.current;
    const heat = heatRef.current;
    const rings = ringsRef.current;

    cluster.clearLayers();

    const zIndexes = { CRITICAL: 1000, HIGH: 500, MEDIUM: 100, LOW: 10 };

    const markers = filteredIssues.map((issue) => {
      const emoji = CATEGORY_EMOJI[issue.category] || "📍";
      const isMuted = issue.status === "RESOLVED" || issue.status === "CLOSED";
      const marker = L.marker([issue.latitude, issue.longitude], {
        icon: createPinIcon(issue.priority, emoji, issue.status, Boolean(issue.isDemo), isMuted),
        title: issue.title,
        zIndexOffset: zIndexes[issue.priority] || 0,
      });

      marker.bindTooltip(
        `<div style="font-weight:700;font-size:11px;color:#f8fafc">
           ${issue.isDemo ? "🧪 [DEMO] " : ""}#${escapeHtml(issue.id)} ${escapeHtml(issue.title)}
         </div>
         <div style="font-size:10px;color:#94a3b8">${issue.category} · ${issue.status}</div>`,
        { direction: "top", offset: [0, -22], opacity: 0.95, className: "cf-tooltip" }
      );

      marker.bindPopup(popupHtml(issue));

      marker.on("click", () => {
        setSelectedIssue(issue);
      });

      return marker;
    });

    cluster.addLayers(markers);

    // Heatmap update
    if (heat) {
      if (heatOn) {
        const heatPoints = filteredIssues.map((i) => [
          i.latitude,
          i.longitude,
          i.priority === "CRITICAL" ? 1.0 : i.priority === "HIGH" ? 0.75 : 0.45,
        ]);
        heat.setLatLngs(heatPoints);
        if (!map.hasLayer(heat)) heat.addTo(map);
      } else {
        if (map.hasLayer(heat)) map.removeLayer(heat);
      }
    }

    // Ward Rings update
    if (rings) {
      rings.clearLayers();
      if (ringsOn) {
        const wardCenters = {};
        filteredIssues.forEach((i) => {
          if (!i.ward) return;
          if (!wardCenters[i.ward]) wardCenters[i.ward] = { count: 0, lat: 0, lng: 0 };
          wardCenters[i.ward].count++;
          wardCenters[i.ward].lat += i.latitude;
          wardCenters[i.ward].lng += i.longitude;
        });

        Object.entries(wardCenters).forEach(([wName, wData]) => {
          const lat = wData.lat / wData.count;
          const lng = wData.lng / wData.count;
          const circle = L.circle([lat, lng], {
            radius: Math.min(650 + wData.count * 80, 2600),
            color: "#06B6D4",
            fillColor: "#06B6D4",
            fillOpacity: 0.16,
            weight: 2,
            dashArray: "5, 6",
          }).bindPopup(`<b>${escapeHtml(wName)}</b><br/>${wData.count} grievances in this sector`);
          rings.addLayer(circle);
        });

        if (!map.hasLayer(rings)) rings.addTo(map);
      } else {
        if (map.hasLayer(rings)) map.removeLayer(rings);
      }
    }
  }, [mapReady, filteredIssues, heatOn, ringsOn]);

  /* ---------------- Navigation Actions ---------------- */
  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleResetView = () => {
    mapRef.current?.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.0 });
  };

  const handleFitAll = () => {
    if (!mapRef.current || filteredIssues.length === 0) return;
    const bounds = L.latLngBounds(filteredIssues.map((i) => [i.latitude, i.longitude]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  };

  const handleFocusIssue = (issue) => {
    setSelectedIssue(issue);
    if (!mapRef.current) return;
    mapRef.current.flyTo([issue.latitude, issue.longitude], 16, { duration: 1.0 });
  };

  const handlePanToWard = (wardName) => {
    setWardFilter(wardName);
    const wardIssues = filteredIssues.filter((i) => i.ward === wardName);
    if (wardIssues.length > 0 && mapRef.current) {
      const avgLat = wardIssues.reduce((acc, cur) => acc + cur.latitude, 0) / wardIssues.length;
      const avgLng = wardIssues.reduce((acc, cur) => acc + cur.longitude, 0) / wardIssues.length;
      mapRef.current.flyTo([avgLat, avgLng], 14, { duration: 1.0 });
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoNotice("Geolocation is not supported by your current browser.");
      return;
    }

    setLocating(true);
    setGeoNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        if (!mapRef.current) return;

        if (!userMarkerRef.current) {
          userMarkerRef.current = L.marker([latitude, longitude], {
            icon: L.divIcon({
              html: `
                <div style="position:relative;width:24px;height:24px;">
                  <div style="position:absolute;inset:0;border-radius:50%;background:#06B6D4;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
                  <div style="position:relative;width:20px;height:20px;border-radius:50%;background:#06B6D4;border:3px solid #ffffff;box-shadow:0 0 14px #06B6D4;"></div>
                </div>`,
              className: "",
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            }),
          }).addTo(mapRef.current);
          userMarkerRef.current.bindPopup("<b>📍 You are here</b><br/>Searching nearby civic reports.");
        } else {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        }

        mapRef.current.flyTo([latitude, longitude], 15, { duration: 1.0 });
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setGeoNotice("Location permission was denied. Please allow location access in your browser settings to see nearby issues.");
        } else {
          setGeoNotice("Unable to retrieve your location. Check your network or device GPS.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleClearFilters = () => {
    setCategoryFilter("");
    setStatusFilter("");
    setPriorityFilter("");
    setWardFilter("");
    setDateFilter("ALL");
    setSearchQuery("");
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    } else {
      wrapRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    }
  };

  return (
    <div ref={wrapRef} className="relative flex h-[calc(100vh-65px)] min-h-[580px] w-full flex-col bg-[#080D1A] text-slate-100 overflow-hidden">
      {/* Geolocation Notice Banner */}
      {geoNotice && (
        <div className="z-30 flex items-center justify-between border-b border-amber-500/30 bg-amber-950/80 px-4 py-2 text-xs text-amber-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{geoNotice}</span>
          </div>
          <button onClick={() => setGeoNotice(null)} className="font-bold text-amber-400 hover:text-white">✕</button>
        </div>
      )}

      {/* API Failure Notice with Fallback to Demo Data */}
      {apiFailed && (
        <div className="z-30 flex items-center justify-between border-b border-rose-500/30 bg-rose-950/80 px-4 py-2 text-xs text-rose-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span>🚨</span>
            <span>{errorMsg} Showing available demo records.</span>
          </div>
          <button onClick={loadDatabaseIssues} className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/30">
            🔄 Retry Server
          </button>
        </div>
      )}

      {/* Top Filter & Control Ribbon */}
      <header className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#10182A]/95 px-4 py-2.5 shadow-md backdrop-blur-xl">
        {/* Left: Search & Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search title, area, ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-44 rounded-xl border border-white/10 bg-slate-900/70 pl-8 pr-3 text-xs text-slate-200 outline-none backdrop-blur placeholder-slate-500 focus:border-blue-500 sm:w-56"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 rounded-xl border border-white/10 bg-slate-900/70 px-2.5 text-xs text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="" className="bg-[#10182A]">🗂️ All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key} className="bg-[#10182A]">
                {c.emoji} {c.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-xl border border-white/10 bg-slate-900/70 px-2.5 text-xs text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="" className="bg-[#10182A]">🔄 All Statuses</option>
            <option value="OPEN" className="bg-[#10182A]">Open</option>
            <option value="ASSIGNED" className="bg-[#10182A]">Assigned</option>
            <option value="IN_PROGRESS" className="bg-[#10182A]">In Progress</option>
            <option value="RESOLVED" className="bg-[#10182A]">Resolved</option>
            <option value="CLOSED" className="bg-[#10182A]">Closed / Verified</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 rounded-xl border border-white/10 bg-slate-900/70 px-2.5 text-xs text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="" className="bg-[#10182A]">🔥 All Priorities</option>
            <option value="CRITICAL" className="bg-[#10182A]">🚨 Critical</option>
            <option value="HIGH" className="bg-[#10182A]">🟠 High</option>
            <option value="MEDIUM" className="bg-[#10182A]">🔵 Medium</option>
            <option value="LOW" className="bg-[#10182A]">⚪ Low</option>
          </select>

          {/* Ward Filter */}
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="h-8 rounded-xl border border-white/10 bg-slate-900/70 px-2.5 text-xs text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="" className="bg-[#10182A]">📍 All Wards</option>
            {WARDS.map((w) => (
              <option key={w} value={w} className="bg-[#10182A]">{w}</option>
            ))}
          </select>

          {/* Reset Filters button */}
          {(categoryFilter || statusFilter || priorityFilter || wardFilter || searchQuery || dateFilter !== "ALL") && (
            <button
              onClick={handleClearFilters}
              className="h-8 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/20"
              title="Clear all active filters"
            >
              ✕ Reset
            </button>
          )}
        </div>

        {/* Right: Data Mode Selector & Map Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Data Mode Switcher (Real vs Demo vs All) */}
          <div className="inline-flex rounded-xl border border-white/10 bg-slate-900/70 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setDataSource("ALL")}
              className={`rounded-lg px-2.5 py-1 font-bold transition ${
                dataSource === "ALL"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Show both live municipal records and sample demo issues"
            >
              All Data ({kpis.total})
            </button>
            <button
              type="button"
              onClick={() => setDataSource("REAL")}
              className={`rounded-lg px-2.5 py-1 font-bold transition ${
                dataSource === "REAL"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Show only authenticated database records"
            >
              Real Only ({kpis.realCount})
            </button>
            <button
              type="button"
              onClick={() => setDataSource("DEMO")}
              className={`rounded-lg px-2.5 py-1 font-bold transition ${
                dataSource === "DEMO"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Show 25 realistic Bengaluru demo reports"
            >
              🧪 Demo Only ({kpis.demoCount})
            </button>
          </div>

          {/* Heatmap Toggle */}
          <button
            type="button"
            onClick={() => setHeatOn((h) => !h)}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold backdrop-blur transition ${
              heatOn
                ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20"
            }`}
            title="Toggle Heatmap density overlay"
          >
            🔥 Heatmap
          </button>

          {/* Engineer Specific Filter */}
          {isEngineer && (
            <button
              type="button"
              onClick={() => setAssignedOnly((a) => !a)}
              className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold backdrop-blur transition ${
                assignedOnly
                  ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30"
                  : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20"
              }`}
              title="Show only issues assigned to you"
            >
              👷 Assigned to Me
            </button>
          )}

          {/* Ward Hotspots Circles Toggle */}
          <button
            type="button"
            onClick={() => setRingsOn((r) => !r)}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold backdrop-blur transition ${
              ringsOn
                ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-300"
                : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20"
            }`}
            title="Toggle Ward coverage rings"
          >
            ⭕ Ward Rings
          </button>

          {/* Basemap Selector */}
          <select
            value={baseMap}
            onChange={(e) => setBaseMap(e.target.value)}
            className="h-8 rounded-xl border border-white/10 bg-slate-900/70 px-2 text-xs font-semibold text-slate-200 outline-none"
          >
            {Object.entries(BASEMAPS).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#10182A]">{v.label}</option>
            ))}
          </select>

          {/* Native Google Maps Embed Toggle */}
          <button
            type="button"
            onClick={() => setGoogleEmbedMode((m) => !m)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              googleEmbedMode
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/20"
                : "border-white/10 bg-slate-900/70 text-slate-300 hover:bg-slate-800"
            }`}
            title="Toggle Live Native Google Maps Embed Mode"
          >
            <span>🌐</span>
            <span>{googleEmbedMode ? "Interactive Map" : "Google Earth Embed"}</span>
          </button>

          {/* Geolocation Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            className="rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
            title="Locate my position in Bengaluru"
          >
            {locating ? "📍 Locating…" : "🎯 Near Me"}
          </button>

          {/* Toggle Sidebar Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen((s) => !s)}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
              sidebarOpen
                ? "border-blue-500/50 bg-blue-500/20 text-blue-300"
                : "border-white/10 bg-slate-900/70 text-slate-300 hover:bg-slate-800"
            }`}
          >
            📑 {sidebarOpen ? "Hide Panel" : "Dashboard Panel"}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-xl border border-white/10 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? "⛶ Exit" : "⛶"}
          </button>
        </div>
      </header>

      {/* KPI Stats Strip */}
      <div className="z-10 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 bg-[#080D1A]/90 px-4 py-1.5 text-[11px] backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-white">
            Matching: <span className="text-cyan-400">{kpis.total}</span>
          </span>
          <span className="text-slate-400">
            Open: <span className="font-semibold text-amber-400">{kpis.openCount}</span>
          </span>
          <span className="text-slate-400">
            In Progress: <span className="font-semibold text-blue-400">{kpis.inProgressCount}</span>
          </span>
          <span className="text-slate-400">
            Resolved: <span className="font-semibold text-emerald-400">{kpis.resolvedCount}</span>
          </span>
          <span className="text-slate-400">
            Critical/High: <span className="font-semibold text-rose-400">{kpis.criticalCount}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {kpis.demoCount > 0 && (
            <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
              🧪 {kpis.demoCount} Demo Samples Included
            </span>
          )}
          <span className="text-slate-500">· Bengaluru Central · EPSG:3857</span>
        </div>
      </div>

      {/* Main Map Canvas & Overlays */}
      <div className="relative flex-1 w-full overflow-hidden flex min-h-0">
        {googleEmbedMode ? (
          <div className="relative z-0 h-full w-full flex-1 min-h-[500px]">
            <iframe
              title="Google Maps Bengaluru Live"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: "500px", width: "100%", height: "100%" }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${
                selectedIssue
                  ? `${selectedIssue.latitude},${selectedIssue.longitude}`
                  : "12.9716,77.5946"
              }&z=${selectedIssue ? 16 : 13}&output=embed`}
            />
          </div>
        ) : (
          /* Leaflet Google Maps Canvas */
          <div
            ref={boxRef}
            id="civicfix-google-map"
            className="relative z-0 h-full w-full flex-1 min-h-[500px]"
            style={{ minHeight: "500px", width: "100%", height: "100%" }}
          />
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#080D1A]/60 backdrop-blur-sm pointer-events-none">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#10182A]/90 px-5 py-3 shadow-2xl backdrop-blur-xl">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <span className="text-xs font-semibold text-slate-200">
                Loading live civic reports across Bengaluru...
              </span>
            </div>
          </div>
        )}

        {/* Selected Map Location Floating Confirmation Card */}
        {selectedPin && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex max-w-md w-[92%] flex-col rounded-2xl border border-amber-500/40 bg-[#10182A]/95 p-4 text-slate-100 shadow-2xl backdrop-blur-2xl animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                  📍
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Selected Location
                  </h4>
                  <p className="text-xs font-mono text-slate-300">
                    {selectedPin.lat}, {selectedPin.lng}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPin(null);
                  if (pinMarkerRef.current && mapRef.current) {
                    mapRef.current.removeLayer(pinMarkerRef.current);
                    pinMarkerRef.current = null;
                  }
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                title="Dismiss selection"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-300 line-clamp-2">
              {selectedPin.loadingAddress ? (
                <span className="inline-flex items-center gap-1.5 text-cyan-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                  Resolving street address...
                </span>
              ) : (
                selectedPin.address
              )}
            </p>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPin(null);
                  if (pinMarkerRef.current && mapRef.current) {
                    mapRef.current.removeLayer(pinMarkerRef.current);
                    pinMarkerRef.current = null;
                  }
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate(
                    `/report?lat=${selectedPin.lat}&lng=${selectedPin.lng}&address=${encodeURIComponent(
                      selectedPin.address || ""
                    )}`
                  );
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-400"
              >
                <span>Confirm & Report Grievance</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Custom Map Navigation Widget (Bottom-Left) */}
        <div className="absolute bottom-6 left-4 z-20 flex flex-col gap-1.5">
          <div className="flex flex-col rounded-2xl border border-white/10 bg-[#10182A]/90 p-1 shadow-2xl backdrop-blur-xl">
            <button
              onClick={handleZoomIn}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-slate-200 transition hover:bg-white/10"
              title="Zoom In"
            >
              +
            </button>
            <div className="h-[1px] w-full bg-white/10" />
            <button
              onClick={handleZoomOut}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-slate-200 transition hover:bg-white/10"
              title="Zoom Out"
            >
              −
            </button>
          </div>

          <div className="flex flex-col rounded-2xl border border-white/10 bg-[#10182A]/90 p-1 shadow-2xl backdrop-blur-xl">
            <button
              onClick={handleResetView}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-slate-200 transition hover:bg-white/10"
              title="Reset View to Central Bengaluru"
            >
              🏠
            </button>
            <div className="h-[1px] w-full bg-white/10" />
            <button
              onClick={handleFitAll}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-slate-200 transition hover:bg-white/10"
              title="Fit Map to All Matching Issues"
            >
              🎯
            </button>
          </div>
        </div>

        {/* Right Collapsible Side Panel */}
        {sidebarOpen && (
          <aside className="absolute top-3 right-3 bottom-3 z-20 w-88 max-w-[calc(100vw-24px)] flex flex-col rounded-3xl border border-white/10 bg-[#10182A]/95 shadow-2xl backdrop-blur-2xl overflow-hidden transition-all duration-300">
            {/* Panel Tabs Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-3">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSidebarTab("list")}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                    sidebarTab === "list"
                      ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  📋 List ({filteredIssues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("hotspots")}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                    sidebarTab === "hotspots"
                      ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🔥 Wards ({wardHotspots.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("analytics")}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                    sidebarTab === "analytics"
                      ? "bg-purple-600/30 text-purple-300 border border-purple-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  📊 Charts
                </button>
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
                title="Collapse Panel"
              >
                ✕
              </button>
            </div>

            {/* Panel Body Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Tab 1: Issues List */}
              {sidebarTab === "list" && (
                <>
                  {filteredIssues.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      <p className="text-2xl mb-2">🔍</p>
                      <p className="font-semibold text-slate-300">No civic issues match your filters</p>
                      <button
                        onClick={handleClearFilters}
                        className="mt-3 rounded-xl bg-blue-600/30 border border-blue-500/30 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-600/50"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    filteredIssues.map((issue) => {
                      const color = STATUS_COLORS[issue.status] || "#3B82F6";
                      const isSelected = selectedIssue?.id === issue.id;
                      return (
                        <div
                          key={issue.id}
                          onClick={() => handleFocusIssue(issue)}
                          className={`cursor-pointer rounded-2xl border p-3 transition ${
                            isSelected
                              ? "border-blue-500 bg-blue-950/40 shadow-lg"
                              : "border-white/5 bg-slate-900/50 hover:border-white/20 hover:bg-slate-900/80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[11px] font-bold text-slate-300 truncate">
                              {issue.isDemo && <span className="text-purple-400 mr-1">[DEMO]</span>}
                              #{issue.id} · {issue.title}
                            </span>
                            <span
                              style={{ backgroundColor: `${color}25`, color }}
                              className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold border border-current"
                            >
                              {issue.status}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
                            {issue.description}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>📍 {issue.ward || issue.location}</span>
                            <span className="text-cyan-400 font-semibold">Focus ↗</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* Tab 2: Ward Hotspots */}
              {sidebarTab === "hotspots" && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-400 px-1 mb-2">
                    Click any municipal ward to fly and inspect its active complaints:
                  </p>
                  {wardHotspots.map((item, idx) => (
                    <button
                      key={item.name}
                      onClick={() => handlePanToWard(item.name)}
                      className="w-full flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/50 px-3 py-2 text-left text-xs transition hover:border-cyan-500/40 hover:bg-cyan-950/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/5 text-[10px] font-bold text-slate-400">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-200">{item.name}</span>
                      </div>
                      <span className="rounded-lg bg-cyan-500/10 px-2 py-0.5 text-[11px] font-bold text-cyan-400 border border-cyan-500/20">
                        {item.count} issues
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Tab 3: Mini Analytics */}
              {sidebarTab === "analytics" && (
                <div className="space-y-4 pt-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 mb-1">Category Distribution</h4>
                    <p className="text-[10px] text-slate-400 mb-2">Breakdown of current filtered map records</p>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryAnalytics.slice(0, 6)} layout="vertical" margin={{ left: 10, right: 10 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={95} tick={{ fill: "#94A3B8", fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{ background: "#10182A", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, fontSize: 11 }}
                          />
                          <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                            {categoryAnalytics.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={index % 2 === 0 ? "#3B82F6" : "#06B6D4"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Filtered</span>
                      <span className="font-bold text-white">{kpis.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Live Database</span>
                      <span className="font-semibold text-cyan-400">{kpis.realCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Demo Dataset</span>
                      <span className="font-semibold text-purple-400">{kpis.demoCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Critical SLA</span>
                      <span className="font-semibold text-rose-400">{kpis.criticalCount}</span>
                    </div>
                  </div>

                  <Link
                    to="/analytics"
                    className="block w-full text-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:opacity-95"
                  >
                    Open Comprehensive Analytics 📊
                  </Link>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Selected Issue Preview Slide-over Drawer (when clicked on a marker) */}
        {selectedIssue && (
          <div className="absolute top-3 left-4 z-20 w-84 max-h-[calc(100%-24px)] overflow-y-auto rounded-3xl border border-white/10 bg-[#10182A]/95 p-4 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-1.5">
                {selectedIssue.isDemo && (
                  <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
                    DEMO
                  </span>
                )}
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-400 border border-blue-500/20">
                  #{selectedIssue.id} · {selectedIssue.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedIssue.images?.length > 0 && (
              <img
                src={selectedIssue.images[0].url}
                alt=""
                className="mt-3 h-36 w-full rounded-2xl object-cover border border-white/10"
              />
            )}

            <h3 className="mt-3 text-sm font-bold text-white leading-snug">
              {selectedIssue.title}
            </h3>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              {selectedIssue.description}
            </p>

            <div className="mt-3 space-y-1.5 rounded-2xl border border-white/5 bg-slate-900/60 p-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Category</span>
                <span className="font-semibold text-slate-200">
                  {CATEGORY_EMOJI[selectedIssue.category]} {CATEGORY_LABELS[selectedIssue.category] || selectedIssue.category}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Priority</span>
                <span className="font-semibold text-rose-400">{selectedIssue.priority || "MEDIUM"}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Location</span>
                <span className="font-medium text-slate-200 truncate max-w-[160px]">{selectedIssue.location}</span>
              </div>
              {selectedIssue.ward && (
                <div className="flex justify-between text-slate-400">
                  <span>Ward</span>
                  <span className="font-medium text-slate-200">{selectedIssue.ward}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Reported</span>
                <span className="font-medium text-slate-300">{timeAgo(selectedIssue.createdAt)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Reporter</span>
                <span className="font-medium text-cyan-300">
                  {selectedIssue.isDemo ? "Demo Citizen" : (selectedIssue.user?.name || "Verified Citizen")}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              {!selectedIssue.isDemo && (
                <Link
                  to={`/issues/${selectedIssue.id}`}
                  className="flex-1 text-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:opacity-95"
                >
                  Full Issue Page →
                </Link>
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedIssue.latitude},${selectedIssue.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center rounded-xl border border-white/10 bg-slate-800/80 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Directions ↗
              </a>
            </div>
          </div>
        )}

        {/* Right-Click Hint for Citizens */}
        {isUser && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-full border border-white/10 bg-[#10182A]/90 px-4 py-1.5 text-xs font-medium text-slate-200 shadow-xl backdrop-blur-md">
            💡 Right-click anywhere on the map to pin and report an issue
          </div>
        )}

        {/* Collapsible Map Legend (Bottom-Right) */}
        <div className="absolute bottom-5 right-5 z-20">
          {legendOpen ? (
            <div className="w-56 rounded-2xl border border-white/10 bg-[#10182A]/95 p-3.5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Map Legend
                </span>
                <button
                  type="button"
                  onClick={() => setLegendOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-2.5 space-y-2 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Marker Priority Colors</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#EF4444] shadow-[0_0_8px_#EF4444]" />
                    <span className="text-slate-300 font-semibold">Critical (Red)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#F97316] shadow-[0_0_8px_#F97316]" />
                    <span className="text-slate-300 font-semibold">High (Orange)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#EAB308] shadow-[0_0_8px_#EAB308]" />
                    <span className="text-slate-300 font-semibold">Med (Yellow)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]" />
                    <span className="text-slate-300 font-semibold">Low (Blue)</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Badges</div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 border border-amber-500/30">Open</span>
                  <span className="rounded bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 border border-cyan-500/30">Assigned</span>
                  <span className="rounded bg-blue-500/20 text-blue-300 px-1.5 py-0.5 border border-blue-500/30">In Progress</span>
                  <span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 border border-emerald-500/30">Resolved</span>
                </div>
              </div>

              <div className="mt-3 border-t border-white/10 pt-2 text-[10px] text-slate-400 space-y-0.5">
                <p>🔴 Red Glow = Critical SLA Priority</p>
                <p>🧪 Purple Tag = Demo Dataset Issue</p>
                <p>📍 Marker Icon = Category Representation</p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLegendOpen(true)}
              className="rounded-xl border border-white/10 bg-[#10182A]/90 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-xl backdrop-blur hover:bg-slate-800"
            >
              🗺️ Map Legend
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
