"use client";

import { useState, useEffect, useCallback } from "react";

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
  vibe: string;
  background: string;
  primary: string;
  accent: string;
  ink: string;
  muted: string;
  display_font: string;
  reasoning: string;
};

type Palette = {
  palette: string[];
  background: string;
  fonts: string[];
};

type Result = {
  run_id: string;
  brochure: Brochure;
  design: Design;
  palette_extracted: Palette;
  pdf_url: string;
};

type Status = "idle" | "loading" | "result" | "error";

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

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [sourceUrl, setSourceUrl] = useState("");

  useEffect(() => {
    if (status !== "loading") return;
    const id = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 1800);
    return () => clearInterval(id);
  }, [status]);

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    setLoadingStep(0);
    setSourceUrl(url);
    try {
      const res = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
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
  }

  return (
    <main className="flex-1 flex flex-col">
      {status === "idle" && <Landing url={url} setUrl={setUrl} onGenerate={onGenerate} />}
      {status === "loading" && <Loading step={LOADING_STEPS[loadingStep]} />}
      {status === "result" && result && (
        <Editor initial={result} sourceUrl={sourceUrl} onReset={reset} />
      )}
      {status === "error" && <ErrorView error={error || "Unknown error"} onReset={reset} />}
    </main>
  );
}

/* ============================================================ LANDING */
function Landing({
  url,
  setUrl,
  onGenerate,
}: {
  url: string;
  setUrl: (s: string) => void;
  onGenerate: (e: React.FormEvent) => void;
}) {
  return (
    <div className="aurora flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-2xl w-full">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-6">
          ● Brochure Generator
        </p>
        <h1 className="font-[family-name:var(--font-serif)] text-5xl sm:text-7xl leading-[1] tracking-tight italic">
          Any URL.<br />A branded brochure.
        </h1>
        <p className="mt-8 text-lg text-white/70 max-w-lg mx-auto">
          Paste a company website. We scrape its content, extract its real color palette,
          read its vibe, and design a one-of-a-kind PDF brochure. Then you can edit
          every word and swap the design.
        </p>

        <form onSubmit={onGenerate} className="mt-12">
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
              className="px-7 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition whitespace-nowrap"
            >
              Generate →
            </button>
          </div>
        </form>

        <p className="mt-6 text-xs text-white/40">Free · ~15 seconds · No signup</p>

        <div className="mt-16 flex flex-wrap justify-center gap-2 text-xs text-white/40">
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
    </div>
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
  initial,
  sourceUrl,
  onReset,
}: {
  initial: Result;
  sourceUrl: string;
  onReset: () => void;
}) {
  const [brochure, setBrochure] = useState<Brochure>(initial.brochure);
  const [design, setDesign] = useState<Design>(initial.design);
  const [pdfUrl, setPdfUrl] = useState(initial.pdf_url);
  const [dirty, setDirty] = useState(false);
  const [rerendering, setRerendering] = useState(false);
  const [pdfKey, setPdfKey] = useState(0); // bumps to force iframe reload
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
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 backdrop-blur bg-black/60 border-b border-white/10 px-5 py-3 flex items-center justify-between gap-3">
        <button
          onClick={onReset}
          className="text-sm text-white/60 hover:text-white transition"
        >
          ← New brochure
        </button>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs text-amber-300 uppercase tracking-widest">● unsaved</span>
          )}
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
        {/* ===== Left: editor ===== */}
        <div className="overflow-y-auto border-r border-white/10 p-5 space-y-6 max-h-[calc(100vh-58px)]">
          <DesignPanel
            design={design}
            palette={palette}
            updateDesign={updateDesign}
          />

          <Divider label="Brochure content" />

          <Field
            label="Company name"
            value={brochure.company_name}
            onChange={(v) => updateBrochure({ company_name: v })}
          />
          <Field
            label="Tagline"
            value={brochure.tagline}
            onChange={(v) => updateBrochure({ tagline: v })}
            multiline
          />
          <Field
            label="About"
            value={brochure.about}
            onChange={(v) => updateBrochure({ about: v })}
            multiline
          />
          <ListField
            label="What we do"
            value={brochure.what_we_do}
            onChange={(v) => updateBrochure({ what_we_do: v })}
          />
          <ListField
            label="Why us"
            value={brochure.why_us}
            onChange={(v) => updateBrochure({ why_us: v })}
          />
          <Field
            label="Culture"
            value={brochure.culture}
            onChange={(v) => updateBrochure({ culture: v })}
            multiline
          />
          <Field
            label="Careers"
            value={brochure.careers}
            onChange={(v) => updateBrochure({ careers: v })}
            multiline
          />
          <Field
            label="Call to action"
            value={brochure.call_to_action}
            onChange={(v) => updateBrochure({ call_to_action: v })}
            multiline
          />
        </div>

        {/* ===== Right: PDF preview ===== */}
        <div className="bg-zinc-900 flex flex-col min-h-[600px]">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
            <span>Live preview</span>
            <a
              href={pdfFull}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition"
            >
              Open ↗
            </a>
          </div>
          <iframe
            key={pdfKey}
            src={pdfFull}
            className="flex-1 w-full bg-white"
            title={`${brochure.company_name} brochure`}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================ DESIGN PANEL */
function DesignPanel({
  design,
  palette,
  updateDesign,
}: {
  design: Design;
  palette: Palette;
  updateDesign: (p: Partial<Design>) => void;
}) {
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
                design.vibe === v
                  ? "bg-white text-black border-white"
                  : "border-white/15 text-white/70 hover:border-white/40"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/40 mb-2">
          Display font
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {FONTS.map((f) => (
            <button
              key={f}
              onClick={() => updateDesign({ display_font: f })}
              className={`px-3 py-2 text-xs rounded-md border transition capitalize ${
                design.display_font === f
                  ? "bg-white text-black border-white"
                  : "border-white/15 text-white/70 hover:border-white/40"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <ColorRow label="Background" value={design.background} onChange={(c) => updateDesign({ background: c })} />
      <ColorRow label="Primary"    value={design.primary}    onChange={(c) => updateDesign({ primary: c })} />
      <ColorRow label="Accent"     value={design.accent}     onChange={(c) => updateDesign({ accent: c })} />
      <ColorRow label="Ink (text)" value={design.ink}        onChange={(c) => updateDesign({ ink: c })} />

      {palette.palette.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/40 mb-2">
            From the site — click to use as primary
          </p>
          <div className="flex flex-wrap gap-1.5">
            {palette.palette.map((c) => (
              <button
                key={c}
                onClick={() => updateDesign({ primary: c })}
                className="w-8 h-8 rounded-md border border-white/15 hover:scale-110 transition"
                style={{ background: c }}
                title={`${c} → primary`}
              />
            ))}
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/40 mt-3 mb-2">
            Or use as accent
          </p>
          <div className="flex flex-wrap gap-1.5">
            {palette.palette.map((c) => (
              <button
                key={c + "a"}
                onClick={() => updateDesign({ accent: c })}
                className="w-8 h-8 rounded-md border border-white/15 hover:scale-110 transition"
                style={{ background: c }}
                title={`${c} → accent`}
              />
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
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.25em] text-white/40 mb-1.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 transition resize-y"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 transition"
        />
      )}
    </div>
  );
}

function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs uppercase tracking-[0.25em] text-white/40">
          {label}
        </label>
        <button
          onClick={() => onChange([...value, ""])}
          className="text-xs text-white/60 hover:text-white transition"
        >
          + add
        </button>
      </div>
      <div className="space-y-1.5">
        {value.map((item, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              value={item}
              onChange={(e) => {
                const next = [...value];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 transition"
            />
            <button
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="px-2 text-white/40 hover:text-red-400 transition"
              title="remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs uppercase tracking-[0.25em] text-white/40 flex-1">
        {label}
      </label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-md border border-white/10 cursor-pointer bg-transparent"
        style={{ padding: 0 }}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-white/40 transition"
      />
    </div>
  );
}
