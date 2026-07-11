import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, MessageSquare, FileText, Target, ArrowRight, ChevronRight,
  Terminal, Send, Loader2, BookOpen, Cpu, Layers, GitBranch, Rocket,
  ChevronDown, Menu, X, Zap, ShieldCheck, Info,
} from "lucide-react";

/* ============================================================
   CONFIG — point this at your actual Space.
   Space id "Gourabswain/placement-assistant" becomes this host
   under HF's standard owner-name slug convention. Double check
   the exact URL via your Space's "Embed this Space" button if
   calls fail — casing/hyphenation is occasionally slightly
   different from the simple lowercase rule.
============================================================ */
const SPACE_HOST = "https://gourabswain-placement-assistant.hf.space";
const API_NAME = "respond";

async function callAssistant(message, onChunk) {
  const kickoff = await fetch(`${SPACE_HOST}/gradio_api/call/${API_NAME}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [message] }),
  });
  if (!kickoff.ok) throw new Error(`Space returned ${kickoff.status}`);
  const { event_id } = await kickoff.json();

  const stream = await fetch(`${SPACE_HOST}/gradio_api/call/${API_NAME}/${event_id}`);
  const reader = stream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      try {
        const parsed = JSON.parse(line.slice(5).trim());
        if (Array.isArray(parsed) && typeof parsed[0] === "string") {
          final = parsed[0];
          onChunk?.(final);
        }
      } catch (_) { /* ignore heartbeat/meta lines */ }
    }
  }
  return final;
}

/* ============================================================
   3D TILT WRAPPER — mouse-tracking parallax on any card
============================================================ */
function TiltCard({ children, className = "", intensity = 10 }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setStyle({
      transform: `perspective(900px) rotateX(${(-py * intensity).toFixed(2)}deg) rotateY(${(px * intensity).toFixed(2)}deg) translateZ(0)`,
      "--glow-x": `${(px + 0.5) * 100}%`,
      "--glow-y": `${(py + 0.5) * 100}%`,
    });
  };
  const onLeave = () => setStyle({ transform: "perspective(900px) rotateX(0) rotateY(0)" });

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transition: "transform 300ms cubic-bezier(0.22,1,0.36,1)", ...style }}
      className={className}
    >
      {children}
    </div>
  );
}

/* ============================================================
   SCROLL REVEAL — fade+rise on intersection
============================================================ */
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================
   NAVBAR
============================================================ */
function Navbar({ view, setView }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { id: "home", label: "Home" },
    { id: "features", label: "Capabilities" },
    { id: "try", label: "Try It" },
    { id: "docs", label: "Docs" },
  ];

  const go = (id) => {
    setOpen(false);
    if (id === "docs") { setView("docs"); window.scrollTo({ top: 0 }); return; }
    setView("home");
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className="w-full max-w-5xl flex items-center justify-between px-5 py-3 rounded-2xl border border-white/10"
        style={{
          background: scrolled ? "rgba(8,9,18,0.72)" : "rgba(8,9,18,0.45)",
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
          boxShadow: scrolled ? "0 8px 30px rgba(0,0,0,0.4)" : "none",
          transition: "background 400ms ease, box-shadow 400ms ease",
        }}
      >
        <button onClick={() => go("home")} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_20px_rgba(139,92,246,0.5)] group-hover:shadow-[0_0_28px_rgba(139,92,246,0.8)] transition-shadow duration-300">
            <Terminal size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">Placement Interview Assistant</span>
        </button>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className={`px-3.5 py-1.5 text-sm rounded-lg transition-all duration-300 ${
                view === "docs" && l.id === "docs" ? "text-white bg-white/10" : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => go("try")}
          className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:shadow-[0_0_24px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
        >
          Launch console <ArrowRight size={14} />
        </button>

        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="absolute top-20 left-4 right-4 rounded-2xl border border-white/10 bg-[#0a0b14]/95 backdrop-blur-xl p-3 flex flex-col gap-1 md:hidden">
          {links.map((l) => (
            <button key={l.id} onClick={() => go(l.id)} className="text-left px-4 py-3 rounded-xl text-slate-200 hover:bg-white/5 text-sm">
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   HERO — with live "interview console" signature element
============================================================ */
function Hero() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Ask me anything about placements — Amazon rounds, DSA priorities, resume gaps, negotiation. I'm the fine-tuned model, live." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setErr(null);
    setMessages((m) => [...m, { role: "user", text: q }, { role: "assistant", text: "" }]);
    setBusy(true);
    try {
      await callAssistant(q, (partial) => {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", text: partial };
          return copy;
        });
      });
    } catch (e) {
      setErr("Console offline — the Space may be asleep (cold starts take ~30-60s) or is between deployments. Try again in a moment.");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="home" className="relative pt-40 pb-28 px-6 overflow-hidden">
      {/* ambient glow field */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-30 blur-[120px]"
        style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 65%)" }} />
      <div className="pointer-events-none absolute top-60 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
        style={{ background: "radial-gradient(circle, #A855F7 0%, transparent 65%)" }} />

      <div className="relative max-w-5xl mx-auto text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-indigo-300 mb-8">
            <Sparkles size={12} /> Fine-tuned on real placement Q&A · Stage 1 → SFT → DPO
          </div>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="text-[2.75rem] sm:text-6xl md:text-7xl font-semibold tracking-tight text-white leading-[1.05]">
            Practice interviews<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              with a model that studied for them.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A domain-tuned Qwen2.5, trained end-to-end on Indian campus placement data —
            round formats, DSA priorities, negotiation, backlog policy. Talk to it below, live.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              onClick={() => document.getElementById("console-input")?.focus()}
              className="group flex items-center gap-2 px-6 py-3.5 rounded-2xl text-[15px] font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:shadow-[0_0_36px_rgba(99,102,241,0.55)] hover:-translate-y-0.5 transition-all duration-300"
            >
              Start the mock interview <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
            </button>
            <a href="#features" className="px-6 py-3.5 rounded-2xl text-[15px] font-medium text-slate-300 border border-white/10 hover:border-white/25 hover:text-white transition-all duration-300">
              See capabilities
            </a>
          </div>
        </Reveal>

        {/* SIGNATURE ELEMENT: live glass console */}
        <Reveal delay={400}>
          <TiltCard intensity={4} className="mt-16 mx-auto max-w-2xl">
            <div
              className="relative rounded-[28px] border border-white/10 overflow-hidden text-left"
              style={{
                background: "linear-gradient(180deg, rgba(20,22,38,0.85) 0%, rgba(10,11,20,0.9) 100%)",
                boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
              }}
            >
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                </div>
                <span className="ml-2 text-xs text-slate-500 font-mono">interview-console — live</span>
                <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> connected
                </span>
              </div>

              <div ref={scrollRef} className="px-5 py-5 h-64 overflow-y-auto flex flex-col gap-3 font-mono text-[13px]">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-xl leading-relaxed ${
                        m.role === "user"
                          ? "bg-gradient-to-br from-indigo-500/90 to-violet-600/90 text-white rounded-br-sm"
                          : "bg-white/[0.06] text-slate-200 border border-white/8 rounded-bl-sm"
                      }`}
                    >
                      {m.text || <Loader2 size={13} className="animate-spin text-slate-400" />}
                    </div>
                  </div>
                ))}
                {err && <div className="text-amber-400 text-xs flex items-start gap-1.5"><Info size={13} className="mt-0.5 shrink-0" />{err}</div>}
              </div>

              <div className="flex items-center gap-2 px-4 py-3.5 border-t border-white/8">
                <input
                  id="console-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="How should I prepare for Amazon SDE-1?"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none font-sans"
                />
                <button
                  onClick={() => send()}
                  disabled={busy}
                  className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 disabled:opacity-40 hover:shadow-[0_0_16px_rgba(99,102,241,0.6)] transition-all duration-300"
                >
                  {busy ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} className="text-white" />}
                </button>
              </div>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   FEATURE GRID
============================================================ */
const FEATURES = [
  { icon: MessageSquare, title: "Real-time mock interviews", desc: "Conversational, round-aware answers — bar-raiser style follow-ups, OA-specific tips, no generic filler.", grad: "from-indigo-500 to-blue-500" },
  { icon: FileText, title: "Resume gap analysis", desc: "Ask about CGPA cutoffs, backlog impact, or resume structure and get placement-context answers, not generic career advice.", grad: "from-violet-500 to-fuchsia-500" },
  { icon: Target, title: "Behavioral feedback loop", desc: "Trained via DPO on preferred vs. rejected answer pairs — it's learned what NOT to say, not just what to say.", grad: "from-fuchsia-500 to-rose-500" },
];

function FeatureGrid() {
  return (
    <section id="features" className="px-6 py-28 relative">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">Built for one job.</h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">Three stages of training, one purpose: give placement-accurate answers instead of generic career coaching.</p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 120}>
              <TiltCard intensity={6}>
                <div
                  className="group relative h-full rounded-3xl p-7 border border-white/10 hover:border-white/20 transition-colors duration-300 overflow-hidden"
                  style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))" }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: "radial-gradient(400px circle at var(--glow-x,50%) var(--glow-y,50%), rgba(139,92,246,0.15), transparent 60%)" }}
                  />
                  <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${f.grad} shadow-lg mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon size={20} className="text-white" strokeWidth={2} />
                  </div>
                  <h3 className="relative text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="relative text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   TRY IT — full chat panel
============================================================ */
function TryIt() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const scrollRef = useRef(null);
  const examples = [
    "What DSA topics matter most for product companies?",
    "I have a 6.5 CGPA — can I still get into good companies?",
    "How do I negotiate my first offer letter?",
  ];

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setErr(null);
    setMessages((m) => [...m, { role: "user", text: q }, { role: "assistant", text: "" }]);
    setBusy(true);
    try {
      await callAssistant(q, (partial) => {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", text: partial };
          return copy;
        });
      });
    } catch (e) {
      setErr("Couldn't reach the Space. It may be asleep — free-tier Spaces cold-start in ~30-60s after inactivity.");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="try" className="px-6 py-28">
      <div className="max-w-3xl mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">Full console.</h2>
            <p className="mt-4 text-slate-400">Same model, same live endpoint — more room to work.</p>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div
            className="rounded-[28px] border border-white/10 overflow-hidden"
            style={{ background: "linear-gradient(180deg, rgba(20,22,38,0.85), rgba(10,11,20,0.92))", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)" }}
          >
            <div ref={scrollRef} className="h-96 overflow-y-auto px-6 py-6 flex flex-col gap-4">
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                  <Terminal size={28} className="text-slate-600" />
                  <p className="text-sm text-slate-500 max-w-xs">Ask about round formats, DSA priorities, resumes, or negotiation.</p>
                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    {examples.map((ex) => (
                      <button key={ex} onClick={() => send(ex)} className="text-left px-4 py-2.5 rounded-xl text-xs text-slate-300 border border-white/10 hover:border-indigo-400/40 hover:bg-white/5 transition-all duration-300">
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === "user" ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-md" : "bg-white/[0.06] border border-white/8 text-slate-200 rounded-bl-md"
                  }`}>
                    {m.text || <Loader2 size={14} className="animate-spin text-slate-400" />}
                  </div>
                </div>
              ))}
              {err && <div className="text-amber-400 text-xs flex items-start gap-1.5 justify-center"><Info size={13} className="mt-0.5 shrink-0" />{err}</div>}
            </div>

            <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type your question..."
                className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none border border-white/10 focus:border-indigo-400/50 transition-colors duration-300"
              />
              <button
                onClick={() => send()}
                disabled={busy}
                className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 disabled:opacity-40 hover:shadow-[0_0_20px_rgba(99,102,241,0.55)] transition-all duration-300"
              >
                {busy ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   DOCS HUB
============================================================ */
const DOCS = [
  {
    id: "overview", title: "Overview", icon: BookOpen,
    content: (
      <>
        <p>Placement Interview Assistant is a domain-tuned <code>Qwen2.5-1.5B-Instruct</code> model,
        trained specifically on Indian campus placement Q&A — round structures, DSA priorities,
        resume guidance, and offer negotiation.</p>
        <blockquote>Unlike a general-purpose assistant, every answer is grounded in placement-specific
        training data rather than broad internet knowledge.</blockquote>
        <p>The model went through three distinct training stages before being served here.</p>
      </>
    ),
  },
  {
    id: "pipeline", title: "Training pipeline", icon: Layers,
    content: (
      <>
        <ul>
          <li><strong>Stage 1 — Domain fine-tuning.</strong> Continued pre-training on raw placement-domain text to build vocabulary and context before any instruction tuning.</li>
          <li><strong>Stage 2 — Supervised fine-tuning (SFT).</strong> 175 instruction/response pairs teach the model how to answer, not just what topics exist.</li>
          <li><strong>Stage 3 — DPO alignment.</strong> 77 preference pairs (chosen vs. rejected) teach the model what <em>not</em> to say — reducing off-topic drift and hallucinated specifics.</li>
        </ul>
        <blockquote>Each stage merges its LoRA adapter into the base weights before the next stage starts, so every stage trains on a clean, fully-merged checkpoint.</blockquote>
        <pre><code>{`LoRA rank (r):        32
LoRA alpha:            64
Stage 1/2 LR:          2e-4
Stage 3 (DPO) LR:      5e-5
DPO beta:              0.1
Effective batch size:  8`}</code></pre>
      </>
    ),
  },
  {
    id: "api", title: "API usage", icon: Cpu,
    content: (
      <>
        <p>The model is served from a Hugging Face Space via Gradio. From Python:</p>
        <pre><code>{`from gradio_client import Client

client = Client("Gourabswain/placement-assistant")
result = client.predict(
    message="How do I prepare for Amazon SDE-1?",
    api_name="/respond",
)
print(result)`}</code></pre>
        <p>From a browser or any non-Python client, call the same endpoint over REST/SSE — this is
        exactly what powers the live console on this page:</p>
        <pre><code>{`POST /gradio_api/call/respond   { data: [message] }
GET  /gradio_api/call/respond/{event_id}   // SSE stream of the answer`}</code></pre>
        <blockquote>Free-tier Spaces sleep after inactivity. First request after idle time can take
        30-60 seconds to cold-start — this is expected, not an error.</blockquote>
      </>
    ),
  },
  {
    id: "model-card", title: "Model & artifacts", icon: GitBranch,
    content: (
      <>
        <p>All six training artifacts — three LoRA adapters and three merged checkpoints — are
        published as separate public repos:</p>
        <ul>
          <li><code>placement-assistant-stage1-merged</code></li>
          <li><code>placement-assistant-stage2-merged</code></li>
          <li><code>placement-assistant-final-merged</code> — served in production</li>
          <li><code>placement-assistant-gguf</code> — quantized (q4_k_m / q8_0) for CPU inference</li>
        </ul>
        <p>The Space runs the <code>q4_k_m</code> GGUF quant via <code>llama-cpp-python</code>, chosen
        for the best speed/quality tradeoff on free-tier CPU hardware.</p>
      </>
    ),
  },
  {
    id: "limitations", title: "Known limitations", icon: ShieldCheck,
    content: (
      <>
        <p>Evaluated against 10 showcase questions across all three stages, the model shows two
        recurring weak spots:</p>
        <ul>
          <li>Salary negotiation questions occasionally drift off-topic toward resume advice.</li>
          <li>Backlog-policy questions have thinner preference-data coverage than interview-prep topics.</li>
        </ul>
        <blockquote>Both are attributed to limited coverage in the 77-example DPO dataset, not a
        training defect — documented here rather than hidden, per the project's evaluation report.</blockquote>
      </>
    ),
  },
];

function DocsHub() {
  const [active, setActive] = useState(DOCS[0].id);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sectionRefs = useRef({});

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const goTo = (id) => {
    setMobileNavOpen(false);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="px-6 pt-32 pb-24 max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">Documentation</h1>
        <p className="mt-2 text-slate-400 text-sm">Pipeline, API, and model details for the Placement Interview Assistant.</p>
      </div>

      <button
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        className="md:hidden mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-slate-200 w-full justify-between"
      >
        <span className="flex items-center gap-2">{DOCS.find((d) => d.id === active)?.title}</span>
        <ChevronDown size={16} className={`transition-transform duration-300 ${mobileNavOpen ? "rotate-180" : ""}`} />
      </button>

      <div className="grid md:grid-cols-[220px_1fr] gap-10">
        <aside className={`md:sticky md:top-28 md:h-fit ${mobileNavOpen ? "block" : "hidden"} md:block`}>
          <nav className="flex flex-col gap-1 rounded-2xl border border-white/10 p-2 bg-white/[0.02]">
            {DOCS.map((d) => (
              <button
                key={d.id}
                onClick={() => goTo(d.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-left transition-all duration-300 ${
                  active === d.id ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-white border border-indigo-400/30" : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <d.icon size={15} className={active === d.id ? "text-indigo-400" : "text-slate-500"} />
                {d.title}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex flex-col gap-16 min-w-0 docs-content">
          {DOCS.map((d) => (
            <div key={d.id} id={d.id} ref={(el) => (sectionRefs.current[d.id] = el)} className="scroll-mt-28">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-400/20">
                  <d.icon size={15} className="text-indigo-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white tracking-tight">{d.title}</h2>
              </div>
              <div className="text-slate-300 text-[15px] leading-relaxed">{d.content}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FOOTER
============================================================ */
function Footer() {
  return (
    <footer className="px-6 py-10 border-t border-white/8 mt-10">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Terminal size={14} /> Placement Interview Assistant
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={13} className="text-indigo-400" /> Fine-tuned Qwen2.5-1.5B · Served via Hugging Face Spaces
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   ROOT APP
============================================================ */
export default function App() {
  const [view, setView] = useState("home");

  return (
    <div className="min-h-screen w-full font-sans" style={{ background: "#05050A" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; }
        ::selection { background: rgba(139,92,246,0.35); }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 8px; }
        code { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 6px; font-size: 0.85em; color: #c4b5fd; font-family: 'SF Mono', Menlo, monospace; }
        .docs-content pre { background: #0c0d16; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px 20px; overflow-x: auto; margin: 14px 0; }
        .docs-content pre code { background: none; padding: 0; color: #e2e8f0; font-size: 0.85rem; line-height: 1.6; }
        .docs-content blockquote { border-left: 2px solid #8b5cf6; background: rgba(139,92,246,0.06); padding: 12px 18px; border-radius: 0 10px 10px 0; margin: 16px 0; color: #cbd5e1; font-size: 0.92rem; }
        .docs-content ul { display: flex; flex-direction: column; gap: 10px; margin: 14px 0; }
        .docs-content li { padding-left: 22px; position: relative; }
        .docs-content li::before { content: ''; position: absolute; left: 4px; top: 9px; width: 6px; height: 6px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7); }
        .docs-content p { margin: 12px 0; }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <Navbar view={view} setView={setView} />

      <div
        key={view}
        style={{ animation: "fadeIn 500ms cubic-bezier(0.22,1,0.36,1)" }}
      >
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: translateY(0);} }`}</style>
        {view === "home" ? (
          <>
            <Hero />
            <FeatureGrid />
            <TryIt />
          </>
        ) : (
          <DocsHub />
        )}
      </div>

      <Footer />
    </div>
  );
}
