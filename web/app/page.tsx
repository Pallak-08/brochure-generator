"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Brochure = {
  company_name: string;
  tagline: string;
  about: string;
  what_we_do: string[];
  why_us: string[];
  culture: string;
  careers: string;
  call_to_action: string;
};

type Design = {
  vibe: string; background: string; primary: string; accent: string;
  ink: string; muted: string; display_font: string; reasoning: string;
};

type Palette = { palette: string[]; background: string; fonts: string[] };

type Result = {
  run_id: string; brochure: Brochure; design: Design;
  palette_extracted: Palette; pdf_url: string;
};

type Preset = {
  key: string; name: string; tagline: string;
  vibe: string; display_font: string;
  background: string; primary: string; accent: string; ink: string; muted: string;
};

type Status = "idle" | "picking" | "loading" | "result" | "error";

const VIBES = ["minimal", "editorial", "playful", "corporate", "warm"];
const FONTS = ["serif", "sans", "mono"];

const LOADING_STEPS = [
  "Scraping the homepage…",
  "Picking the most relevant pages…",
  "Extracting the brand palette…",
  "Reading the company's vibe…",
  "Writing the brochure copy…",
  "Designing the layout…",
  "Rendering the PDF…",
];

/* ------------------------------------------------------------------- *
 * useReveal — adds the `in-view` class to a ref'd element when it
 * scrolls into the viewport. The animation itself is defined in CSS
 * (fade-up, fade-in, slide-right in globals.css) so the initial
 * state lives in the stylesheet, before React touches the DOM.
 * This is more reliable than the inline-style + state approach,
 * which sometimes skips the transition on fast page loads.
 * ------------------------------------------------------------------- */
function useReveal<T extends HTMLElement>(delay = 0) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    let timer: number | undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            timer = window.setTimeout(() => el.classList.add("in-view"), delay);
            obs.disconnect();
          }
        });
      },
      // Fire as soon as 1px enters; also pre-trigger 120px before entering
      // so the reveal is mid-animation by the time the user sees it.
      { threshold: 0.01, rootMargin: "0px 0px 120px 0px" }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [delay]);
  return ref;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [sourceUrl, setSourceUrl] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/presets`)
      .then((r) => r.json())
      .then((d) => setPresets(d.presets || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== "loading") return;
    const id = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 1800);
    return () => clearInterval(id);
  }, [status]);

  function onSubmitUrl(e: React.FormEvent) {
    e.preventDefault();
    setSourceUrl(url);
    setStatus("picking");
  }

  async function generate(preset: string | null) {
    setError(null);
    setStatus("loading");
    setLoadingStep(0);
    try {
      const res = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl, preset }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: Result = await res.json();
      setResult(data);
      setStatus("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setError(null);
    setUrl("");
    setSourceUrl("");
  }

  return (
    <main className="flex-1 flex flex-col">
      {status === "idle" && <Landing url={url} setUrl={setUrl} onSubmit={onSubmitUrl} />}
      {status === "picking" && (
        <TemplatePicker presets={presets} sourceUrl={sourceUrl} onPick={generate} onBack={() => setStatus("idle")} />
      )}
      {status === "loading" && <Loading step={LOADING_STEPS[loadingStep]} />}
      {status === "result" && result && (
        <Editor initial={result} sourceUrl={sourceUrl} onReset={reset} />
      )}
      {status === "error" && <ErrorView error={error || "Unknown error"} onReset={reset} />}
    </main>
  );
}

/* ===============================================================
 * LANDING — full scrollable landing page with multiple sections
 * =============================================================== */
function Landing({
  url,
  setUrl,
  onSubmit,
}: {
  url: string;
  setUrl: (s: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <HeroSection url={url} setUrl={setUrl} onSubmit={onSubmit} />
      <HowItWorksSection />
      <ExamplesSection />
    </div>
  );
}

/* ============ HERO ============ */
function HeroSection({
  url,
  setUrl,
  onSubmit,
}: {
  url: string;
  setUrl: (s: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <section className="aurora relative min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center overflow-hidden">
      <div className="relative z-10 max-w-3xl w-full">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-6">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 align-middle" />
          Live · Free
        </p>
        <h1 className="font-[family-name:var(--font-serif)] text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-tight italic">
          Any URL.<br />
          <span className="text-white/70">A branded brochure.</span>
        </h1>
        <p className="mt-8 text-lg sm:text-xl text-white/70 max-w-xl mx-auto">
          Paste a company website. We extract its real colors and vibe, write
          the copy, and design a custom PDF brochure. Then you edit anything.
        </p>

        <form onSubmit={onSubmit} className="mt-12 max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://stripe.com"
              className="flex-1 px-5 py-4 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition"
            />
            <button
              type="submit"
              className="px-7 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 active:scale-95 transition whitespace-nowrap"
            >
              Continue →
            </button>
          </div>
        </form>

        <p className="mt-6 text-xs text-white/40">
          Free · ~15 seconds · No signup
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-2 text-xs text-white/40">
          Try:
          {["https://anthropic.com", "https://stripe.com", "https://linear.app"].map((u) => (
            <button
              key={u}
              onClick={() => setUrl(u)}
              className="text-white/60 underline underline-offset-2 hover:text-white transition"
            >
              {u}
            </button>
          ))}
        </div>
      </div>

    </section>
  );
}

/* ============ HOW IT WORKS ============ */
function HowItWorksSection() {
  const ref = useReveal<HTMLDivElement>();
  const steps = [
    {
      n: "01",
      title: "Paste a URL",
      body: "Any company website with public content — your own, a competitor, a brand you love.",
      icon: "🔗",
    },
    {
      n: "02",
      title: "Pick a template",
      body: "Choose from 10 hand-tuned designs (Editorial Cream, Tech Dark, Premium Noir, …) — or let AI pick the right one based on the brand.",
      icon: "🎨",
    },
    {
      n: "03",
      title: "AI writes & designs",
      body: "Gemini reads the site, extracts the real CSS palette, picks a vibe, and writes brochure copy from real facts (no fluff).",
      icon: "✨",
    },
    {
      n: "04",
      title: "Edit anything",
      body: "Rewrite any text, swap colors, change vibe, drop a different display font — the PDF re-renders in seconds.",
      icon: "✏️",
    },
  ];
  return (
    <section ref={ref} className="fade-up px-6 py-32 max-w-6xl mx-auto">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4 text-center">
        How it works
      </p>
      <h2 className="font-[family-name:var(--font-serif)] italic text-4xl sm:text-6xl text-center mb-20 leading-[1]">
        Four steps,<br />about fifteen seconds.
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((s, i) => (
          <StepCard key={s.n} step={s} delay={i * 120} />
        ))}
      </div>
    </section>
  );
}

function StepCard({
  step,
  delay,
}: {
  step: { n: string; title: string; body: string; icon: string };
  delay: number;
}) {
  const ref = useReveal<HTMLDivElement>(delay);
  return (
    <div
      ref={ref}
      className="fade-up relative p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30"
    >
      <div className="text-3xl mb-4">{step.icon}</div>
      <div className="font-[family-name:var(--font-serif)] italic text-2xl text-white/30 mb-1">
        {step.n}
      </div>
      <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{step.body}</p>
    </div>
  );
}

/* ============ EXAMPLES ============ */
function ExamplesSection() {
  const ref = useReveal<HTMLDivElement>();
  const examples = [
    {
      name: "Anthropic",
      url: "https://anthropic.com",
      bg: "#E8E6DC",
      primary: "#1F1B16",
      accent: "#D97757",
      ink: "#1F1B16",
      font: "var(--font-serif)",
      vibe: "Editorial · Cream + warm orange",
    },
    {
      name: "Stripe",
      url: "https://stripe.com",
      bg: "#FFFFFF",
      primary: "#1E1B4B",
      accent: "#635BFF",
      ink: "#0A0E27",
      font: "var(--font-sans)",
      vibe: "Corporate · Indigo on white",
    },
    {
      name: "Linear",
      url: "https://linear.app",
      bg: "#101113",
      primary: "#FFFFFF",
      accent: "#8A8FF7",
      ink: "#F5F5F5",
      font: "var(--font-mono)",
      vibe: "Minimal · Dark monospace",
    },
  ];
  return (
    <section ref={ref} className="fade-up px-6 py-32 max-w-6xl mx-auto">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4 text-center">
        It looks like the brand
      </p>
      <h2 className="font-[family-name:var(--font-serif)] italic text-4xl sm:text-6xl text-center mb-6 leading-[1]">
        Every brochure is different.
      </h2>
      <p className="text-center text-white/60 max-w-xl mx-auto mb-16">
        Same one-paragraph prompt, three brands, three completely different
        outputs — because the colors, fonts, and layout come from the actual
        site, not a template gallery.
      </p>
      <div className="grid md:grid-cols-3 gap-5">
        {examples.map((e, i) => (
          <ExampleCard key={e.name} {...e} delay={i * 150} />
        ))}
      </div>
    </section>
  );
}

function ExampleCard({
  name, url, bg, primary, accent, ink, font, vibe, delay,
}: {
  name: string; url: string; bg: string; primary: string;
  accent: string; ink: string; font: string; vibe: string; delay: number;
}) {
  const ref = useReveal<HTMLDivElement>(delay);
  return (
    <div
      ref={ref}
      className="fade-up group rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 hover:-translate-y-2"
    >
      {/* Mini brochure preview */}
      <div
        className="aspect-[3/4] p-6 flex flex-col relative overflow-hidden"
        style={{ background: bg, color: ink }}
      >
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-80"
          style={{ background: accent }}
        />
        <div
          className="text-[10px] uppercase tracking-widest font-semibold opacity-60"
          style={{ color: ink }}
        >
          Brochure · 2026
        </div>
        <div
          className="mt-auto text-4xl leading-none font-semibold mb-2"
          style={{
            fontFamily: font,
            color: primary,
            fontStyle: font.includes("serif") ? "italic" : "normal",
          }}
        >
          {name}
        </div>
        <div className="h-0.5 w-12 mt-1" style={{ background: accent }} />
        <div className="space-y-1 mt-3 opacity-50">
          <div className="h-0.5 w-full rounded" style={{ background: ink }} />
          <div className="h-0.5 w-4/5 rounded" style={{ background: ink }} />
          <div className="h-0.5 w-3/5 rounded" style={{ background: ink }} />
        </div>
      </div>
      <div className="px-5 py-4 bg-black/60">
        <div className="font-semibold">{name}</div>
        <div className="text-xs text-white/50 mt-0.5">{url}</div>
        <div className="text-xs text-white/40 mt-2">{vibe}</div>
      </div>
    </div>
  );
}

/* ====================================================== TEMPLATE PICKER */
function TemplatePicker({
  presets, sourceUrl, onPick, onBack,
}: {
  presets: Preset[]; sourceUrl: string;
  onPick: (preset: string | null) => void; onBack: () => void;
}) {
  return (
    <div className="flex-1 px-6 py-10 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-sm text-white/60 hover:text-white transition">
          ← change URL
        </button>
        <span className="text-xs uppercase tracking-[0.3em] text-white/40">
          For: <span className="text-white/70 normal-case tracking-normal">{sourceUrl}</span>
        </span>
      </div>

      <div className="text-center mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Step 2 of 3</p>
        <h2 className="font-[family-name:var(--font-serif)] italic text-4xl sm:text-5xl">
          Pick a template.
        </h2>
        <p className="mt-3 text-white/60 text-sm">
          Each generates a totally different look. Or let the AI pick the best fit.
        </p>
      </div>

      <button
        onClick={() => onPick(null)}
        className="group w-full mb-6 p-6 rounded-2xl border-2 border-white/20 bg-gradient-to-br from-violet-500/20 via-cyan-500/15 to-pink-500/20 hover:border-white/50 transition text-left flex items-center gap-5"
      >
        <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center text-2xl flex-shrink-0">✨</div>
        <div className="flex-1">
          <div className="flex items-baseline gap-3 mb-1">
            <h3 className="font-[family-name:var(--font-serif)] italic text-2xl">Let AI design it</h3>
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">recommended</span>
          </div>
          <p className="text-white/70 text-sm">
            We&apos;ll analyze {sourceUrl ? new URL(sourceUrl).hostname : "the site"}&apos;s
            real colors, fonts and vibe — then pick the design that fits.
          </p>
        </div>
        <span className="text-2xl text-white/40 group-hover:text-white transition">→</span>
      </button>

      <div className="relative my-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs uppercase tracking-[0.3em] text-white/40">Or pick one of 10</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {presets.length === 0 && (
          <p className="col-span-full text-center text-white/40 text-sm py-8">
            Loading templates… (if this hangs, the backend may be cold-starting)
          </p>
        )}
        {presets.map((p) => (
          <PresetCard key={p.key} preset={p} onClick={() => onPick(p.key)} />
        ))}
      </div>
    </div>
  );
}

function PresetCard({ preset, onClick }: { preset: Preset; onClick: () => void }) {
  const fontFamily =
    preset.display_font === "serif" ? "var(--font-serif)"
    : preset.display_font === "mono" ? "var(--font-mono)"
    : "var(--font-sans)";
  return (
    <button
      onClick={onClick}
      className="group rounded-xl overflow-hidden border border-white/10 hover:border-white/40 hover:-translate-y-1 transition text-left flex flex-col"
    >
      <div
        className="aspect-[3/4] p-3 flex flex-col gap-1.5 relative overflow-hidden"
        style={{ background: preset.background, color: preset.ink }}
      >
        <div
          className="absolute -top-6 -right-6 w-16 h-16 rounded-full"
          style={{ background: preset.accent, opacity: 0.85 }}
        />
        <div className="text-[10px] uppercase tracking-widest font-semibold opacity-70" style={{ color: preset.muted }}>
          Brochure
        </div>
        <div
          className="mt-auto text-xl leading-tight font-semibold"
          style={{
            fontFamily, color: preset.primary,
            fontStyle: preset.display_font === "serif" ? "italic" : "normal",
          }}
        >
          Company.
        </div>
        <div className="flex gap-1 mt-1">
          <div className="h-1 flex-1 rounded-full" style={{ background: preset.primary }} />
          <div className="h-1 w-1/3 rounded-full" style={{ background: preset.accent }} />
        </div>
        <div className="h-px w-full my-1 opacity-30" style={{ background: preset.ink }} />
        <div className="space-y-0.5">
          <div className="h-0.5 w-full opacity-50 rounded" style={{ background: preset.ink }} />
          <div className="h-0.5 w-4/5 opacity-50 rounded" style={{ background: preset.ink }} />
          <div className="h-0.5 w-2/3 opacity-50 rounded" style={{ background: preset.ink }} />
        </div>
      </div>

      <div className="px-3 py-2.5 bg-black/40 group-hover:bg-black/60 transition">
        <div className="text-sm font-semibold">{preset.name}</div>
        <div className="text-[11px] text-white/50 mt-0.5">{preset.tagline}</div>
      </div>
    </button>
  );
}

/* ============================================================ LOADING */
function Loading({ step }: { step: string }) {
  return (
    <div className="aurora flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="flex gap-2 mb-12">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="pulse-dot w-3 h-3 rounded-full bg-white inline-block"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <p className="font-[family-name:var(--font-serif)] italic text-3xl text-center max-w-xl">
        {step}
      </p>
      <p className="mt-8 text-xs uppercase tracking-[0.3em] text-white/40">
        Usually 15-30 seconds (Render free tier may cold-start)
      </p>
    </div>
  );
}

/* ============================================================ ERROR */
function ErrorView({ error, onReset }: { error: string; onReset: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-red-400 mb-6">Something broke</p>
      <h2 className="font-[family-name:var(--font-serif)] italic text-4xl mb-6">
        That URL didn&apos;t cooperate.
      </h2>
      <pre className="max-w-xl text-sm text-white/60 bg-white/5 rounded-lg p-4 overflow-auto whitespace-pre-wrap">
        {error}
      </pre>
      <button
        onClick={onReset}
        className="mt-10 px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition"
      >
        Try another URL
      </button>
    </div>
  );
}

/* ============================================================ EDITOR */
function Editor({
  initial, sourceUrl, onReset,
}: { initial: Result; sourceUrl: string; onReset: () => void }) {
  const [brochure, setBrochure] = useState<Brochure>(initial.brochure);
  const [design, setDesign] = useState<Design>(initial.design);
  const [pdfUrl, setPdfUrl] = useState(initial.pdf_url);
  const [dirty, setDirty] = useState(false);
  const [rerendering, setRerendering] = useState(false);
  const [pdfKey, setPdfKey] = useState(0);
  const palette = initial.palette_extracted;
  const runId = initial.run_id;
  const pdfFull = pdfUrl.startsWith("http") ? pdfUrl : `${API_URL}${pdfUrl}`;

  const updateBrochure = useCallback((patch: Partial<Brochure>) => {
    setBrochure((b) => ({ ...b, ...patch }));
    setDirty(true);
  }, []);
  const updateDesign = useCallback((patch: Partial<Design>) => {
    setDesign((d) => ({ ...d, ...patch }));
    setDirty(true);
  }, []);

  async function applyChanges() {
    setRerendering(true);
    try {
      const res = await fetch(`${API_URL}/runs/${runId}/rerender`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl, brochure, design }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPdfUrl(data.pdf_url);
      setPdfKey((k) => k + 1);
      setDirty(false);
    } catch (e) {
      alert("Re-render failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setRerendering(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="sticky top-0 z-10 backdrop-blur bg-black/60 border-b border-white/10 px-5 py-3 flex items-center justify-between gap-3">
        <button onClick={onReset} className="text-sm text-white/60 hover:text-white transition">
          ← New brochure
        </button>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-amber-300 uppercase tracking-widest">● unsaved</span>}
          <button
            onClick={applyChanges}
            disabled={!dirty || rerendering}
            className="px-4 py-2 bg-white text-black rounded-lg font-semibold text-sm hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            {rerendering ? "Re-rendering…" : "Apply changes"}
          </button>
          <a
            href={pdfFull}
            download={`${brochure.company_name || "brochure"}.pdf`}
            className="px-4 py-2 border border-white/20 rounded-lg font-semibold text-sm hover:bg-white/10 transition"
          >
            Download PDF
          </a>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] min-h-0">
        <div className="overflow-y-auto border-r border-white/10 p-5 space-y-6 max-h-[calc(100vh-58px)]">
          <DesignPanel design={design} palette={palette} updateDesign={updateDesign} />
          <Divider label="Brochure content" />
          <Field label="Company name" value={brochure.company_name} onChange={(v) => updateBrochure({ company_name: v })} />
          <Field label="Tagline" value={brochure.tagline} onChange={(v) => updateBrochure({ tagline: v })} multiline />
          <Field label="About" value={brochure.about} onChange={(v) => updateBrochure({ about: v })} multiline />
          <ListField label="What we do" value={brochure.what_we_do} onChange={(v) => updateBrochure({ what_we_do: v })} />
          <ListField label="Why us" value={brochure.why_us} onChange={(v) => updateBrochure({ why_us: v })} />
          <Field label="Culture" value={brochure.culture} onChange={(v) => updateBrochure({ culture: v })} multiline />
          <Field label="Careers" value={brochure.careers} onChange={(v) => updateBrochure({ careers: v })} multiline />
          <Field label="Call to action" value={brochure.call_to_action} onChange={(v) => updateBrochure({ call_to_action: v })} multiline />
        </div>

        <div className="bg-zinc-900 flex flex-col min-h-[600px]">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
            <span>Live preview</span>
            <a href={pdfFull} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition">Open ↗</a>
          </div>
          <iframe key={pdfKey} src={pdfFull} className="flex-1 w-full bg-white" title={`${brochure.company_name} brochure`} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================ DESIGN PANEL */
function DesignPanel({
  design, palette, updateDesign,
}: { design: Design; palette: Palette; updateDesign: (p: Partial<Design>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/40 mb-2">Vibe</p>
        <div className="grid grid-cols-3 gap-1.5">
          {VIBES.map((v) => (
            <button
              key={v}
              onClick={() => updateDesign({ vibe: v })}
              className={`px-3 py-2 text-xs rounded-md border transition capitalize ${
                design.vibe === v ? "bg-white text-black border-white" : "border-white/15 text-white/70 hover:border-white/40"
              }`}
            >{v}</button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/40 mb-2">Display font</p>
        <div className="grid grid-cols-3 gap-1.5">
          {FONTS.map((f) => (
            <button
              key={f}
              onClick={() => updateDesign({ display_font: f })}
              className={`px-3 py-2 text-xs rounded-md border transition capitalize ${
                design.display_font === f ? "bg-white text-black border-white" : "border-white/15 text-white/70 hover:border-white/40"
              }`}
            >{f}</button>
          ))}
        </div>
      </div>

      <ColorRow label="Background" value={design.background} onChange={(c) => updateDesign({ background: c })} />
      <ColorRow label="Primary" value={design.primary} onChange={(c) => updateDesign({ primary: c })} />
      <ColorRow label="Accent" value={design.accent} onChange={(c) => updateDesign({ accent: c })} />
      <ColorRow label="Ink (text)" value={design.ink} onChange={(c) => updateDesign({ ink: c })} />

      {palette.palette.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/40 mb-2">From the site — click to use as primary</p>
          <div className="flex flex-wrap gap-1.5">
            {palette.palette.map((c) => (
              <button key={c} onClick={() => updateDesign({ primary: c })} className="w-8 h-8 rounded-md border border-white/15 hover:scale-110 transition" style={{ background: c }} title={`${c} → primary`} />
            ))}
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/40 mt-3 mb-2">Or use as accent</p>
          <div className="flex flex-wrap gap-1.5">
            {palette.palette.map((c) => (
              <button key={c + "a"} onClick={() => updateDesign({ accent: c })} className="w-8 h-8 rounded-md border border-white/15 hover:scale-110 transition" style={{ background: c }} title={`${c} → accent`} />
            ))}
          </div>
        </div>
      )}

      {design.reasoning && (
        <p className="text-xs italic text-white/40 leading-relaxed border-t border-white/10 pt-4">
          AI: &ldquo;{design.reasoning}&rdquo;
        </p>
      )}
    </div>
  );
}

/* ============================================================ small bits */
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-xs uppercase tracking-[0.25em] text-white/40">{label}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

function Field({
  label, value, onChange, multiline,
}: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.25em] text-white/40 mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 transition resize-y" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 transition" />
      )}
    </div>
  );
}

function ListField({
  label, value, onChange,
}: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs uppercase tracking-[0.25em] text-white/40">{label}</label>
        <button onClick={() => onChange([...value, ""])} className="text-xs text-white/60 hover:text-white transition">+ add</button>
      </div>
      <div className="space-y-1.5">
        {value.map((item, i) => (
          <div key={i} className="flex gap-1.5">
            <input value={item} onChange={(e) => {
              const next = [...value]; next[i] = e.target.value; onChange(next);
            }} className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 transition" />
            <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="px-2 text-white/40 hover:text-red-400 transition" title="remove">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs uppercase tracking-[0.25em] text-white/40 flex-1">{label}</label>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded-md border border-white/10 cursor-pointer bg-transparent" style={{ padding: 0 }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-24 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-white/40 transition" />
    </div>
  );
}
