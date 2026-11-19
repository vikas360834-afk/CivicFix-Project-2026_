import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

/** Tiny renderer for bold, links, bullets and line breaks */
function renderReply(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    // Check for markdown links: [Text](url)
    const linkRegex = /\[(.*?)\]\((.*?)\)/g;
    let renderedLine = [];
    let lastIndex = 0;
    let match;

    const bullet = /^(•|-|\*)\s*/.test(line);
    const cleanLine = bullet ? line.replace(/^(•|-|\*)\s*/, "") : line;

    const parts = cleanLine.split(/\*\*(.+?)\*\*/g);

    return (
      <p key={i} className={bullet ? "flex gap-2 my-1" : "my-1"}>
        {bullet && <span className="shrink-0 text-cyan-400 font-bold">•</span>}
        <span className="leading-relaxed">
          {parts.map((part, j) => {
            if (j % 2 === 1) {
              return (
                <strong key={j} className="font-bold text-white">
                  {part}
                </strong>
              );
            }
            // Check for links inside non-bold parts
            const subParts = part.split(/(\[.*?\]\(.*?\))/g);
            return subParts.map((sp, k) => {
              const linkMatch = sp.match(/\[(.*?)\]\((.*?)\)/);
              if (linkMatch) {
                const [, label, href] = linkMatch;
                if (href.startsWith("/")) {
                  return (
                    <Link
                      key={k}
                      to={href}
                      className="font-bold text-cyan-400 underline decoration-cyan-500/40 hover:text-cyan-300 mx-1"
                    >
                      {label}
                    </Link>
                  );
                }
                return (
                  <a
                    key={k}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-cyan-400 underline decoration-cyan-500/40 hover:text-cyan-300 mx-1"
                  >
                    {label} ↗
                  </a>
                );
              }
              return <span key={k}>{sp}</span>;
            });
          })}
        </span>
      </p>
    );
  });
}

/** Render structured card payload if attached by backend formatter */
function StructuredCard({ card, onAsk }) {
  if (!card) return null;

  if (card.type === "stats") {
    const total = (card.open || 0) + (card.inProgress || 0) + (card.resolved || 0) || 1;
    const openPct = Math.round(((card.open || 0) / total) * 100);
    const inProgPct = Math.round(((card.inProgress || 0) / total) * 100);
    const resPct = Math.round(((card.resolved || 0) / total) * 100);

    return (
      <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3.5 backdrop-blur-md">
        <p className="text-xs font-bold text-slate-200">{card.title || "Real-time City Metrics"}</p>
        <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div style={{ width: `${openPct}%` }} className="bg-amber-500" title={`Open: ${card.open}`} />
          <div style={{ width: `${inProgPct}%` }} className="bg-blue-500" title={`In Progress: ${card.inProgress}`} />
          <div style={{ width: `${resPct}%` }} className="bg-emerald-500" title={`Resolved: ${card.resolved}`} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 py-1">
            <span className="font-bold text-amber-400">{card.open || 0}</span>
            <p className="text-[10px] text-slate-400">Open</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 py-1">
            <span className="font-bold text-blue-400">{card.inProgress || 0}</span>
            <p className="text-[10px] text-slate-400">In Prog</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 py-1">
            <span className="font-bold text-emerald-400">{card.resolved || 0}</span>
            <p className="text-[10px] text-slate-400">Resolved</p>
          </div>
        </div>
      </div>
    );
  }

  if (card.type === "issue" && card.issue) {
    const i = card.issue;
    return (
      <div className="mt-3 rounded-2xl border border-blue-500/30 bg-blue-950/30 p-3 text-xs backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="font-bold text-blue-300">Issue #{i.id}</span>
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
            {i.status}
          </span>
        </div>
        <p className="mt-1 font-semibold text-slate-100">{i.title}</p>
        <p className="mt-0.5 text-slate-400">📍 {i.location} {i.ward ? `· ${i.ward}` : ""}</p>
        <Link
          to={`/issues/${i.id}`}
          className="mt-2.5 inline-block text-xs font-bold text-cyan-400 hover:text-cyan-300"
        >
          View Full Issue →
        </Link>
      </div>
    );
  }

  return null;
}

export const QUESTION_CATEGORIES = [
  { id: "all", label: "All (27)" },
  { id: "stats", label: "📊 City Stats" },
  { id: "wards", label: "📍 Wards & Hotspots" },
  { id: "utilities", label: "🚧 Hazards & Roads" },
  { id: "sla", label: "⏱️ SLAs & Speed" },
  { id: "emergency", label: "🚨 Emergency" },
  { id: "rules", label: "🛡️ Rules & Help" },
];

export const QUESTION_BANK = [
  // 1. City Stats (4 questions)
  { category: "stats", q: "How many issues are currently open?" },
  { category: "stats", q: "How many complaints are solved and verified?" },
  { category: "stats", q: "How many issues are being fixed right now?" },
  { category: "stats", q: "Show overall city-wide grievance overview" },

  // 2. Wards & Hotspots (5 questions)
  { category: "wards", q: "Which ward has the most complaints right now?" },
  { category: "wards", q: "How many open issues in Koramangala?" },
  { category: "wards", q: "What are the common complaints in Indiranagar?" },
  { category: "wards", q: "Show recurring problem hotspots in Bengaluru" },
  { category: "wards", q: "Compare Indiranagar and Koramangala grievances" },

  // 3. Hazards & Roads (5 questions)
  { category: "utilities", q: "Which area has the most potholes and road damage?" },
  { category: "utilities", q: "How many street lights are currently not working?" },
  { category: "utilities", q: "What are the active drinking water supply complaints?" },
  { category: "utilities", q: "Where is garbage and waste overflow most severe?" },
  { category: "utilities", q: "What is the most frequently reported civic category?" },

  // 4. SLAs & Speed (4 questions)
  { category: "sla", q: "What is the average fix time across the city?" },
  { category: "sla", q: "What is the overall complaint resolution rate?" },
  { category: "sla", q: "Which department has the fastest turnaround time?" },
  { category: "sla", q: "What are the target SLA deadlines for each department?" },

  // 5. Emergency & Helplines (3 questions)
  { category: "emergency", q: "What should I do if a live power wire is sparking?" },
  { category: "emergency", q: "What are the official municipal emergency helpline numbers?" },
  { category: "emergency", q: "How do I report an urgent life-safety hazard?" },

  // 6. Platform Rules & Workflows (6 questions)
  { category: "rules", q: "How do I report a new civic issue with photos?" },
  { category: "rules", q: "How does the administrator approval process work?" },
  { category: "rules", q: "How does AI detect duplicate complaints?" },
  { category: "rules", q: "What are the rules and permissions for the three user roles?" },
  { category: "rules", q: "How is my personal privacy and data protected?" },
  { category: "rules", q: "How do field engineers update work order status?" },
];

export default function ChatWidget() {
  const { user, isAdmin, isEngineer } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      const saved = sessionStorage.getItem("civicfix_chat_history_v2");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        role: "assistant",
        text: "👋 Hello! I am your **CivicFix AI Assistant** grounded on the live city database.\n\nYou can ask about open issues, ward hotspots, department SLAs, or resolution statistics.",
      },
    ];
  });

  const scrollRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem("civicfix_chat_history_v2", JSON.stringify(history));
    } catch {}
  }, [history]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, open]);

  const displayedQuestions = useMemo(() => {
    if (selectedCategory === "all") return QUESTION_BANK;
    return QUESTION_BANK.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const sendMessage = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || busy) return;

    const userMsg = { role: "user", text };
    const nextHistory = [...history, userMsg];
    setHistory(nextHistory);
    setInput("");
    setBusy(true);

    try {
      const { data } = await api.post("/ai/chat", {
        message: text,
        history: nextHistory.map((m) => ({ role: m.role, content: m.text })),
      });

      const cardPayload = data.data || data.card;
      const suggestions = data.data?.suggestions || (Array.isArray(data.suggestions) ? data.suggestions : []);

      setHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply || "I analyzed your query but could not extract a matching record. Please rephrase.",
          card: cardPayload,
          suggestions,
        },
      ]);
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "⚠️ Unable to query the civic database right now. Please verify backend connection and try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const clearChat = () => {
    setHistory([
      {
        role: "assistant",
        text: "Conversation reset. Feel free to ask any query regarding city issues, department performance, or ward analytics.",
      },
    ]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-purple-600 text-white shadow-2xl shadow-blue-500/30 transition-all duration-300 hover:scale-110 hover:shadow-cyan-500/40 active:scale-95 cursor-pointer ring-2 ring-white/20"
          aria-label="Open CivicFix AI Assistant"
        >
          <span className="text-2xl animate-pulse">🤖</span>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="fixed inset-x-2 bottom-2 z-50 flex h-[85vh] max-h-[660px] flex-col rounded-3xl border border-white/10 bg-[#10182A]/95 shadow-2xl backdrop-blur-2xl sm:bottom-6 sm:inset-x-auto sm:right-6 sm:w-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 shadow-lg shadow-cyan-500/20">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0B132B]">
                  <span className="text-lg">🤖</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">CivicFix AI Assistant</h3>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <p className="text-[11px] text-cyan-400 font-medium">
                  {user ? `${user.role} mode · Live SQLite database` : "Connected · Real city data"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={clearChat}
                className="rounded-xl border border-white/5 bg-slate-800/60 p-2 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-white"
                title="Clear conversation"
              >
                🗑️
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/5 bg-slate-800/60 p-2 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-white"
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Message List */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {history.map((msg, idx) => {
              const isUserMsg = msg.role === "user";
              return (
                <div key={idx} className={`flex ${isUserMsg ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                      isUserMsg
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-br-xs font-medium"
                        : "border border-white/10 bg-slate-900/80 text-slate-200 rounded-bl-xs backdrop-blur-md"
                    }`}
                  >
                    <div>{renderReply(msg.text)}</div>
                    {msg.card && <StructuredCard card={msg.card} onAsk={sendMessage} />}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                        {msg.suggestions.map((s, si) => (
                          <button
                            key={si}
                            type="button"
                            onClick={() => sendMessage(s)}
                            className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-[10px] font-semibold text-cyan-300 transition hover:bg-cyan-900/50 hover:text-white cursor-pointer active:scale-95"
                          >
                            💬 {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-xs border border-white/10 bg-slate-900/80 px-4 py-3 text-cyan-400">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[11px] text-slate-400">Querying city database…</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Comprehensive 25+ Prompt Library & Category Explorer */}
          <div className="border-t border-white/10 px-3.5 py-2.5 bg-slate-950/60">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="text-cyan-400">⚡</span>
                <span>Question Library ({QUESTION_BANK.length} Questions)</span>
              </p>
              <button
                type="button"
                onClick={() => setShowAllQuestions((v) => !v)}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-500/20"
              >
                <span>{showAllQuestions ? "Compact View ▲" : "Browse All 27 ▼"}</span>
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-none">
              {QUESTION_CATEGORIES.map((cat) => {
                const count = cat.id === "all" ? QUESTION_BANK.length : QUESTION_BANK.filter((q) => q.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm"
                        : "bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-white/5"
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Question Buttons */}
            <div
              className={`mt-1.5 flex gap-1.5 ${
                showAllQuestions
                  ? "flex-col max-h-48 overflow-y-auto pr-1"
                  : "overflow-x-auto pb-1 scrollbar-none"
              }`}
            >
              {displayedQuestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(item.q)}
                  className={`rounded-xl border border-white/10 bg-slate-900/70 text-[11px] font-medium text-slate-200 transition hover:border-cyan-500/50 hover:bg-cyan-950/40 hover:text-cyan-300 active:scale-95 text-left cursor-pointer ${
                    showAllQuestions
                      ? "w-full px-3 py-2 flex items-center justify-between"
                      : "shrink-0 px-3 py-1.5"
                  }`}
                >
                  <span>{item.q}</span>
                  {showAllQuestions && <span className="text-cyan-400 font-bold ml-2">➔</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 border-t border-white/10 p-3.5 bg-[#10182A]"
          >
            <input
              type="text"
              placeholder="Ask anything about city issues, statistics…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none backdrop-blur focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold transition hover:opacity-90 disabled:opacity-30 cursor-pointer shadow-md shadow-blue-500/20"
            >
              ➔
            </button>
          </form>
        </div>
      )}
    </>
  );
}
