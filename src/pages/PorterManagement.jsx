import React, { useState, useEffect, useRef, useCallback } from "react";

<<<<<<< HEAD
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://assest-backend-z6uq.onrender.com";
=======
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
>>>>>>> 19e96b05e597b137c0b0c12445804d6a9c9bf51f
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace(/^http/, "ws");

// ─── Mock staff (fallback when API unavailable) ───────────────────────────────
const MOCK_STAFF = [
  { id: "s1", name: "Ravi Kumar",    role: "Porter", x: 18, y: 25 },
  { id: "s2", name: "Anita Sharma",  role: "Porter", x: 55, y: 40 },
  { id: "s3", name: "Mohammed Zaid", role: "Porter", x: 78, y: 65 },
  { id: "s4", name: "Priya Nair",    role: "Porter", x: 35, y: 70 },
  { id: "s5", name: "Suresh Babu",   role: "Porter", x: 62, y: 20 },
];

const LOCATIONS = [
  "ICU", "OT", "Ward A", "Ward B", "ER",
  "Radiology", "Pharmacy", "Reception", "Blood Bank", "NICU",
];

const TASKS = [
  "Wheelchair Required",
  "Stretcher Required",
  "Patient Transfer",
  "Sample Transfer",
  "Equipment Movement",
];

// Tasks that require 2 porters
const DUAL_PORTER_TASKS = new Set(["Stretcher Required", "Patient Transfer"]);

// Approximate zone positions (% on map)
const ZONE_POS = {
  ICU:          { x: 68, y: 8  },
  OT:           { x: 48, y: 45 },
  "Ward A":     { x: 15, y: 55 },
  "Ward B":     { x: 15, y: 75 },
  ER:           { x: 80, y: 18 },
  Radiology:    { x: 30, y: 22 },
  Pharmacy:     { x: 55, y: 72 },
  Reception:    { x: 35, y: 88 },
  "Blood Bank": { x: 72, y: 82 },
  NICU:         { x: 85, y: 50 },
};

const PRIORITY_CFG = {
  Normal:    { border: "border-slate-100",               badge: "bg-slate-100 text-slate-600",  dot: "bg-slate-400" },
  High:      { border: "border-amber-100",               badge: "bg-amber-50 text-amber-700",   dot: "bg-amber-400" },
  Emergency: { border: "border-red-200 ring-1 ring-red-100", badge: "bg-red-50 text-red-700",  dot: "bg-red-500"   },
};

const STATUS_CFG = {
  Pending:       { badge: "bg-slate-100 text-slate-500",    dot: "bg-slate-400",   pulse: false },
  "In Progress": { badge: "bg-blue-50 text-[#006CDD]",      dot: "bg-[#006CDD]",   pulse: true  },
  Completed:     { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400", pulse: false },
};

// ─── SVG icon helper ──────────────────────────────────────────────────────────
const Ic = ({ d, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d={d} />
  </svg>
);
const ICONS = {
  plus:    "M12 5v14M5 12h14",
  arrow:   "M5 12h14M12 5l7 7-7 7",
  clock:   "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 6v6l4 2",
  person:  "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  pin:     "M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  zap:     "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  check:   "M20 6L9 17l-5-5",
  x:       "M18 6L6 18M6 6l12 12",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  wifi:    "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  users:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  alert:   "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
};

const fmtTime = (sec) => {
  if (!sec) return "0s";
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const initials = (name) =>
  name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = "md", bg = "bg-[#006CDD]" }) => {
  const cls = { sm: "w-6 h-6 text-[9px]", md: "w-8 h-8 text-xs", lg: "w-10 h-10 text-sm" }[size];
  return (
    <div className={`${cls} ${bg} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials(name)}
    </div>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, accent }) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
      <Ic d={icon} size={17} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  </div>
);

// ─── Floor Plan Component ─────────────────────────────────────────────────────
const FloorMap = ({ floorPlan, staff, requests }) => {
  const busySet = new Set(
    requests
      .filter(r => r.status !== "Completed")
      .flatMap(r => (r.porters || []).filter(Boolean).map(p => p.id))
  );

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-slate-100"
      style={{ height: 400, background: "#F8FAFC" }}
    >
      {/* Background grid */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="pm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94A3B8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pm-grid)" />
      </svg>

      {/* Floor plan image */}
      {(floorPlan?.image_url || floorPlan?.image) ? (
        <img
          src={floorPlan.image_url || `${BACKEND_URL}${floorPlan.image}`}
          alt="Floor plan"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          onError={e => { e.target.style.display = "none"; }}
        />
      ) : (
        /* Schematic rooms when no image */
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect x="5"  y="4"  width="22" height="14" rx="1" fill="none" stroke="#475569" strokeWidth="0.6"/>
          <rect x="30" y="4"  width="18" height="14" rx="1" fill="none" stroke="#475569" strokeWidth="0.6"/>
          <rect x="52" y="4"  width="18" height="14" rx="1" fill="none" stroke="#475569" strokeWidth="0.6"/>
          <rect x="74" y="4"  width="21" height="14" rx="1" fill="none" stroke="#475569" strokeWidth="0.6"/>
          <rect x="5"  y="23" width="16" height="28" rx="1" fill="none" stroke="#475569" strokeWidth="0.6"/>
          <rect x="38" y="23" width="24" height="24" rx="1" fill="none" stroke="#475569" strokeWidth="0.6"/>
          <rect x="67" y="23" width="28" height="28" rx="1" fill="none" stroke="#475569" strokeWidth="0.6"/>
          <rect x="5"  y="55" width="16" height="20" rx="1" fill="none" stroke="#475569" strokeWidth="0.6"/>
          <rect x="38" y="52" width="20" height="16" rx="1" fill="none" stroke="#475569" strokeWidth="0.6"/>
          <rect x="65" y="55" width="30" height="20" rx="1" fill="none" stroke="#475569" strokeWidth="0.6"/>
          <rect x="5"  y="80" width="90" height="15" rx="1" fill="none" stroke="#475569" strokeWidth="0.6"/>
          <line x1="5" y1="20" x2="95" y2="20" stroke="#94A3B8" strokeWidth="0.3" strokeDasharray="3,3"/>
          <line x1="5" y1="52" x2="95" y2="52" stroke="#94A3B8" strokeWidth="0.3" strokeDasharray="3,3"/>
        </svg>
      )}

      {/* Route lines for active tasks */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {requests
          .filter(r => r.status === "In Progress")
          .map(r => {
            const a = ZONE_POS[r.from], b = ZONE_POS[r.to];
            if (!a || !b) return null;
            return (
              <line key={r.id}
                x1={`${a.x}%`} y1={`${a.y}%`}
                x2={`${b.x}%`} y2={`${b.y}%`}
                stroke={r.priority === "Emergency" ? "#EF4444" : "#006CDD"}
                strokeWidth="1.5" strokeDasharray="5,3" opacity="0.5"
              />
            );
          })}
      </svg>

      {/* Zone labels */}
      {Object.entries(ZONE_POS).map(([name, pos]) => (
        <div
          key={name}
          className="absolute px-1.5 py-0.5 bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded text-[9px] font-semibold text-slate-500 pointer-events-none select-none"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translateX(-50%)" }}
        >
          {name}
        </div>
      ))}

      {/* Staff dots */}
      {staff.map(s => {
        const isBusy    = busySet.has(s.id);
        const isOffline = s.status === "Offline";
        return (
          <div
            key={s.id}
            className="absolute flex flex-col items-center"
            style={{
              left:      `${s.x}%`,
              top:       `${s.y}%`,
              transform: "translate(-50%, -50%)",
              transition: "left 0.5s ease, top 0.5s ease",
              zIndex: 10,
            }}
          >
            <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shadow-md text-white text-[10px] font-bold relative ${
              isOffline ? "bg-slate-400 border-slate-200"
              : isBusy  ? "bg-amber-500 border-amber-300"
              :            "bg-[#006CDD] border-blue-200"
            }`}>
              {initials(s.name)}
              {!isOffline && !isBusy && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white animate-pulse" />
              )}
            </div>
            <div className="mt-0.5 px-1.5 py-0.5 bg-white rounded shadow-sm border border-slate-100 text-[9px] text-slate-600 whitespace-nowrap font-medium">
              {s.name.split(" ")[0]}
            </div>
          </div>
        );
      })}

      {/* Legend + live badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 flex-wrap">
        {[
          { color: "bg-[#006CDD]", label: "Available" },
          { color: "bg-amber-400", label: "Busy" },
          { color: "bg-slate-400", label: "Offline" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-full border border-slate-100 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${l.color}`} />
            <span className="text-[9px] text-slate-500 font-medium">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-white/90 rounded-full border border-slate-100 shadow-sm">
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-[9px] font-semibold text-emerald-600">LIVE</span>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function PorterManagement() {
  const [requests, setRequests]         = useState([]);
  const [staff, setStaff]               = useState([]);
  const [floorPlan, setFloorPlan]       = useState(null);
  const [wsConnected, setWsConnected]   = useState(false);
  const [loading, setLoading]           = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showModal, setShowModal]       = useState(false);
  const [assignCtx, setAssignCtx]       = useState(null); // { req, slotIndex }
  const [form, setForm]                 = useState({ task: "", from: "", to: "", priority: "Normal", smart: false });

  // ── Load floor plan — tries both API shapes used in the project ──
  const loadFloorPlan = useCallback(async () => {
    for (const url of [`${API}/floor-plans`, `${API}/floor-plan`]) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const plan = Array.isArray(data) ? data[0] : data;
        if (plan) { setFloorPlan(plan); return; }
      } catch (_) {}
    }
  }, []);

  // ── Load staff — falls back to mock data ──
  const loadStaff = useCallback(async () => {
    try {
      const [rtlsRes, peopleRes] = await Promise.all([
        fetch(`${API}/rtls/live`),
        fetch(`${API}/people-tags`),
      ]);
      if (!rtlsRes.ok || !peopleRes.ok) throw new Error();

      const rtls   = await rtlsRes.json();
      const people = await peopleRes.json();
      const list   = (people || [])
        .filter(p => p.entity_type === "staff")
        .map((p, i) => {
          const live = (rtls || []).find(t =>
            t.tag_id === p.tag_id || t.mac === p.tag_id || t.uuid === p.tag_id
          );
          const mock = MOCK_STAFF[i % MOCK_STAFF.length];
          return {
            id:     p.id || p.tag_id,
            name:   p.name || p.person_name || mock.name,
            role:   p.role || "Porter",
            x:      live?.x ?? mock.x,
            y:      live?.y ?? mock.y,
            status: live ? "Available" : "Offline",
          };
        });
      if (list.length > 0) { setStaff(list); return; }
      throw new Error();
    } catch (_) {
      setStaff(MOCK_STAFF.map(s => ({ ...s, status: "Available" })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadFloorPlan(), loadStaff()]);
  }, [loadFloorPlan, loadStaff]);

  // ── WebSocket live RTLS positions (same pattern as StaffMap) ──
  useEffect(() => {
    let ws, retryTimer;
    const connect = () => {
      try {
        ws = new WebSocket(`${WS_URL}/api/ws/rtls`);
        ws.onopen  = () => setWsConnected(true);
        ws.onclose = () => { setWsConnected(false); retryTimer = setTimeout(connect, 3000); };
        ws.onerror = () => setWsConnected(false);
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "tag_update" && Array.isArray(msg.data)) {
              setStaff(prev =>
                prev.map(s => {
                  const live = msg.data.find(t => t.device_id === s.id || t.tag_id === s.id);
                  return live ? { ...s, x: live.x ?? s.x, y: live.y ?? s.y } : s;
                })
              );
            }
          } catch (_) {}
        };
      } catch (_) {}
    };
    connect();
    return () => { clearTimeout(retryTimer); try { ws?.close(); } catch (_) {} };
  }, []);

  // ── Smooth movement animation (mock mode) ──
  useEffect(() => {
    if (wsConnected) return;
    const iv = setInterval(() => {
      setStaff(prev =>
        prev.map(s => {
          if (!s.movingTo) return s;
          const nx = s.x + (s.targetX - s.x) * 0.15;
          const ny = s.y + (s.targetY - s.y) * 0.15;
          const done = Math.abs(nx - s.targetX) < 0.8 && Math.abs(ny - s.targetY) < 0.8;
          return { ...s, x: nx, y: ny, movingTo: !done };
        })
      );
    }, 500);
    return () => clearInterval(iv);
  }, [wsConnected]);

  // ── Elapsed timer ──
  useEffect(() => {
    const iv = setInterval(() => {
      setRequests(prev =>
        prev.map(r =>
          r.startTime ? { ...r, elapsed: Math.floor((Date.now() - r.startTime) / 1000) } : r
        )
      );
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // ── Create task ──
  const createTask = () => {
    if (!form.task || !form.from || !form.to || form.from === form.to) return;
    const dual = DUAL_PORTER_TASKS.has(form.task);
    setRequests(prev => [{
      id:        Date.now(),
      ...form,
      dual,
      porters:   [],
      status:    "Pending",
      startTime: null,
      elapsed:   0,
    }, ...prev]);
    setShowModal(false);
    setForm({ task: "", from: "", to: "", priority: "Normal", smart: false });
  };

  // ── Open assign modal ──
  const openAssign = (req, slotIndex) => setAssignCtx({ req, slotIndex });

  // ── Confirm porter assignment ──
  const confirmAssign = (porter) => {
    const { req, slotIndex } = assignCtx;
    const fromPos = ZONE_POS[req.from] || { x: 50, y: 50 };

    setRequests(prev =>
      prev.map(r => {
        if (r.id !== req.id) return r;
        const newPorters = [...r.porters];
        newPorters[slotIndex] = porter;
        const filled = newPorters.filter(Boolean).length;
        const needed = r.dual ? 2 : 1;
        const allSet = filled >= needed;
        return {
          ...r,
          porters:   newPorters,
          status:    allSet ? "In Progress" : "Pending",
          startTime: allSet && !r.startTime ? Date.now() : r.startTime,
        };
      })
    );

    setStaff(prev =>
      prev.map(s =>
        s.id === porter.id
          ? { ...s, status: "Busy", movingTo: true, targetX: fromPos.x, targetY: fromPos.y }
          : s
      )
    );

    setAssignCtx(null);
  };

  // ── Complete task ──
  const completeTask = (id) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    // Free porters
    const porterIds = new Set((req.porters || []).filter(Boolean).map(p => p.id));
    setStaff(prev =>
      prev.map(s => porterIds.has(s.id) ? { ...s, status: "Available", movingTo: false } : s)
    );
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "Completed" } : r));
  };

  // ── Derived state ──
  const busyIds = new Set(
    requests
      .filter(r => r.status !== "Completed")
      .flatMap(r => (r.porters || []).filter(Boolean).map(p => p.id))
  );

  const availableCount = staff.filter(s => s.status !== "Offline" && !busyIds.has(s.id)).length;
  const filtered = activeFilter === "All" ? requests : requests.filter(r => r.status === activeFilter);

  const stats = {
    total:   requests.length,
    pending: requests.filter(r => r.status === "Pending").length,
    active:  requests.filter(r => r.status === "In Progress").length,
    done:    requests.filter(r => r.status === "Completed").length,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#006CDD] rounded-lg flex items-center justify-center">
            <Ic d={ICONS.users} size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-800 leading-none">Porter Command Center</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-300"}`} />
              <p className="text-xs text-slate-400">{wsConnected ? "Live RTLS connected" : "Mock data active"}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => Promise.all([loadFloorPlan(), loadStaff()])}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Ic d={ICONS.refresh} size={12} /> Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-[#006CDD] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Ic d={ICONS.plus} size={14} /> New Task
          </button>
        </div>
      </div>

      <div className="p-5 max-w-[1440px] mx-auto space-y-4">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Tasks" value={stats.total}   icon={ICONS.zap}    accent="bg-slate-500" />
          <StatCard label="Pending"     value={stats.pending} icon={ICONS.clock}  accent="bg-amber-400" />
          <StatCard label="In Progress" value={stats.active}  icon={ICONS.wifi}   accent="bg-[#006CDD]" />
          <StatCard label="Completed"   value={stats.done}    icon={ICONS.check}  accent="bg-emerald-500" />
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Left — task list */}
          <div className="space-y-3">

            {/* Filter tabs */}
            <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 flex gap-1">
              {[
                { key: "All",         label: "All" },
                { key: "Pending",     label: "Pending" },
                { key: "In Progress", label: "Active" },
                { key: "Completed",   label: "Done" },
              ].map(f => (
                <button key={f.key} onClick={() => setActiveFilter(f.key)}
                  className={`flex-1 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                    activeFilter === f.key
                      ? "bg-[#006CDD] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Task cards */}
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
              {filtered.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                  <Ic d={ICONS.zap} size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-300">No tasks here</p>
                  <button onClick={() => setShowModal(true)} className="mt-2 text-xs text-[#006CDD] hover:underline">
                    + Create one
                  </button>
                </div>
              )}

              {filtered.map(r => {
                const pCfg   = PRIORITY_CFG[r.priority] || PRIORITY_CFG.Normal;
                const sCfg   = STATUS_CFG[r.status]     || STATUS_CFG.Pending;
                const filled = (r.porters || []).filter(Boolean).length;
                const needed = r.dual ? 2 : 1;
                const allSet = filled >= needed;

                return (
                  <div key={r.id} className={`bg-white rounded-2xl border p-4 shadow-sm ${pCfg.border}`}>

                    {/* Top row */}
                    <div className="flex items-start gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Ic d={ICONS.zap} size={13} className="text-[#006CDD]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800 leading-tight">{r.task}</p>
                          {r.dual && (
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-bold rounded-full border border-purple-100 flex-shrink-0">
                              2 PORTERS
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Ic d={ICONS.pin} size={9} className="text-slate-300 flex-shrink-0" />
                          <span className="text-xs text-slate-400 truncate">{r.from}</span>
                          <Ic d={ICONS.arrow} size={9} className="text-slate-300 flex-shrink-0" />
                          <span className="text-xs text-slate-400 truncate">{r.to}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${pCfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} />
                        {r.priority}
                      </span>
                    </div>

                    {/* Status + timer */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sCfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot} ${sCfg.pulse ? "animate-pulse" : ""}`} />
                        {r.status}
                      </span>
                      {r.elapsed > 0 && (
                        <span className="text-xs text-slate-400 tabular-nums flex items-center gap-1">
                          <Ic d={ICONS.clock} size={10} className="text-slate-300" />
                          {fmtTime(r.elapsed)}
                        </span>
                      )}
                    </div>

                    {/* Porter slots */}
                    <div className="space-y-1.5">
                      {Array.from({ length: needed }).map((_, idx) => {
                        const p = (r.porters || [])[idx];
                        return (
                          <div key={idx} className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                            p
                              ? "bg-blue-50 border border-blue-100"
                              : "bg-slate-50 border border-dashed border-slate-200"
                          }`}>
                            {p ? (
                              <div className="flex items-center gap-2">
                                <Avatar name={p.name} size="sm" bg="bg-[#006CDD]" />
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 leading-none">{p.name}</p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">Porter {idx + 1}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center">
                                  <Ic d={ICONS.person} size={10} className="text-slate-300" />
                                </div>
                                <p className="text-xs text-slate-400">Porter {idx + 1} — unassigned</p>
                              </div>
                            )}
                            {!p && r.status !== "Completed" && (
                              <button
                                onClick={() => openAssign(r, idx)}
                                className="text-[10px] bg-[#006CDD] text-white px-2.5 py-1 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                              >
                                Assign
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Complete */}
                    {r.status === "In Progress" && allSet && (
                      <button
                        onClick={() => completeTask(r.id)}
                        className="mt-3 w-full bg-emerald-500 text-white text-xs py-2 rounded-xl font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Ic d={ICONS.check} size={12} /> Mark Complete
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — porter strip + map */}
          <div className="lg:col-span-2 space-y-3">

            {/* Porter availability strip */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">Porter Availability</h3>
                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                  {availableCount} / {staff.length} available
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {staff.map(s => {
                  const isBusy    = busyIds.has(s.id);
                  const isOffline = s.status === "Offline";
                  return (
                    <div key={s.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      isOffline ? "bg-slate-50 border-slate-100 text-slate-400"
                      : isBusy  ? "bg-amber-50 border-amber-100 text-amber-700"
                      :            "bg-emerald-50 border-emerald-100 text-emerald-700"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        isOffline ? "bg-slate-300"
                        : isBusy  ? "bg-amber-400"
                        :            "bg-emerald-400 animate-pulse"
                      }`} />
                      {s.name.split(" ")[0]}
                      {isBusy    && <span className="text-[9px] opacity-60">busy</span>}
                      {isOffline && <span className="text-[9px] opacity-60">offline</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Floor plan map */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">Live Floor Map</h3>
                <span className="text-xs text-slate-400">
                  {floorPlan ? (floorPlan.name || "Floor 1") : "Schematic view"}
                </span>
              </div>
              {loading ? (
                <div className="h-[400px] rounded-xl bg-slate-50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#006CDD] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <FloorMap floorPlan={floorPlan} staff={staff} requests={requests} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────── CREATE TASK MODAL ────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">New Porter Task</h2>
                <p className="text-xs text-slate-400 mt-0.5">Dispatch a request to the floor</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                <Ic d={ICONS.x} size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">

              {/* Task type */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Task Type</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#006CDD]/20 focus:border-[#006CDD] transition-all"
                  value={form.task}
                  onChange={e => setForm({ ...form, task: e.target.value })}
                >
                  <option value="">Select task type…</option>
                  {TASKS.map(t => (
                    <option key={t} value={t}>
                      {t}{DUAL_PORTER_TASKS.has(t) ? " (requires 2 porters)" : ""}
                    </option>
                  ))}
                </select>
                {form.task && DUAL_PORTER_TASKS.has(form.task) && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl">
                    <Ic d={ICONS.alert} size={12} className="text-purple-500 flex-shrink-0" />
                    <p className="text-xs text-purple-700">This task requires <strong>2 porters</strong> — you'll assign them separately after creation.</p>
                  </div>
                )}
              </div>

              {/* From / To */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { field: "from", label: "From", filter: () => true },
                  { field: "to",   label: "To",   filter: (l) => l !== form.from },
                ].map(({ field, label, filter }) => (
                  <div key={field}>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">{label}</label>
                    <select
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#006CDD]/20 focus:border-[#006CDD] transition-all"
                      value={form[field]}
                      onChange={e => setForm({ ...form, [field]: e.target.value })}
                    >
                      <option value="">{label}…</option>
                      {LOCATIONS.filter(filter).map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Priority buttons */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Priority</label>
                <div className="flex gap-2">
                  {["Normal", "High", "Emergency"].map(p => (
                    <button key={p} onClick={() => setForm({ ...form, priority: p })}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        form.priority === p
                          ? p === "Emergency" ? "bg-red-500 border-red-500 text-white"
                            : p === "High"    ? "bg-amber-400 border-amber-400 text-white"
                            :                   "bg-[#006CDD] border-[#006CDD] text-white"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >{p}</button>
                  ))}
                </div>
              </div>

              {/* Smart toggle */}
              <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, smart: !form.smart })}
                  className={`w-10 h-6 rounded-full relative flex-shrink-0 transition-colors cursor-pointer ${form.smart ? "bg-[#006CDD]" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.smart ? "translate-x-5" : "translate-x-1"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Smart Assignment</p>
                  <p className="text-xs text-slate-400">Auto-pick nearest available porter</p>
                </div>
              </label>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={!form.task || !form.from || !form.to || form.from === form.to}
                className="flex-1 py-2.5 rounded-xl bg-[#006CDD] text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── ASSIGN PORTER MODAL ────────────────── */}
      {assignCtx && (() => {
        const { req, slotIndex } = assignCtx;
        const alreadyInTask = new Set((req.porters || []).filter(Boolean).map(p => p.id));
        const pool = staff.filter(s =>
          !busyIds.has(s.id) &&
          s.status !== "Offline" &&
          !alreadyInTask.has(s.id)
        );
        const busyPool = staff.filter(s => busyIds.has(s.id));

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    Assign Porter {req.dual ? `${slotIndex + 1} of 2` : ""}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {req.task} · {req.from} → {req.to}
                  </p>
                </div>
                <button onClick={() => setAssignCtx(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                  <Ic d={ICONS.x} size={16} />
                </button>
              </div>

              <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                {pool.length === 0 ? (
                  <div className="text-center py-8">
                    <Ic d={ICONS.alert} size={28} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No available porters right now</p>
                    <p className="text-xs text-slate-300 mt-1">All porters are currently busy or offline</p>
                  </div>
                ) : pool.map(s => (
                  <div
                    key={s.id}
                    onClick={() => confirmAssign(s)}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} size="md" bg="bg-[#006CDD]" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs text-slate-400">{s.role} · Available</span>
                        </div>
                      </div>
                    </div>
                    <button className="px-4 py-1.5 bg-[#006CDD] text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                      Select
                    </button>
                  </div>
                ))}
              </div>

              {/* Busy porters — dimmed reference */}
              {busyPool.length > 0 && (
                <div className="px-4 pb-4 border-t border-slate-50 pt-3">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-2">
                    Currently on duty
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {busyPool.map(s => (
                      <span key={s.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-full text-[10px] text-slate-400"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {s.name.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> 19e96b05e597b137c0b0c12445804d6a9c9bf51f
