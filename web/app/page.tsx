"use client";

import { useState, useEffect } from "react";

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
    try {
      const res = await fetch(`${API_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `HTTP ${res.status}`);
      }
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
      {status === "result" && result && <ResultView result={result} onReset={reset} />}
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
          read its vibe, and design a one-of-a-kind PDF brochure that looks like the
          company actually made it.
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

        <p className="mt-6 text-xs text-white/40">
          Free · ~10 seconds per brochure · No signup
        </p>

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
        Usually 10–20 seconds
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

/* ============================================================ RESULT */
function ResultView({ result, onReset }: { result: Result; onReset: () => void }) {
  const { brochure, design, palette_extracted: palette, pdf_url } = result;
  const pdfFullUrl = `${API_URL}${pdf_url}`;

  return (
    <div className="flex-1 flex flex-col px-6 py-10 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onReset}
          className="text-sm text-white/60 hover:text-white transition"
        >
          ← Generate another
        </button>
        <a
          href={pdfFullUrl}
          download
          className="px-5 py-2.5 bg-white text-black rounded-lg font-semibold text-sm hover:bg-white/90 transition"
        >
          Download PDF
        </a>
      </div>

      <div className="border border-white/10 rounded-2xl p-8 mb-6 bg-white/[0.02]">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Result</p>
        <h2 className="font-[family-name:var(--font-serif)] italic text-5xl mb-3">
          {brochure.company_name}
        </h2>
        <p className="text-xl text-white/80 max-w-2xl">{brochure.tagline}</p>
      </div>

      <div className="border border-white/10 rounded-2xl p-6 mb-6 bg-white/[0.02]">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">
          Design decisions
        </p>
        <p className="italic text-white/80 mb-5 font-[family-name:var(--font-serif)] text-lg">
          &ldquo;{design.reasoning}&rdquo;
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <Pill label="vibe" value={design.vibe} />
          <Pill label="font" value={design.display_font} />
          <Swatch color={design.background} label="background" />
          <Swatch color={design.primary} label="primary" />
          <Swatch color={design.accent} label="accent" />
          <Swatch color={design.ink} label="ink" />
        </div>
        {palette.palette.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-3">
              Extracted from the site
            </p>
            <div className="flex flex-wrap gap-2">
              {palette.palette.map((c) => (
                <div
                  key={c}
                  className="w-9 h-9 rounded-md border border-white/10"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
        <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Preview</p>
          <a
            href={pdfFullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/60 hover:text-white transition"
          >
            Open in new tab ↗
          </a>
        </div>
        <iframe
          src={pdfFullUrl}
          className="w-full h-[800px] bg-white"
          title={`${brochure.company_name} brochure`}
        />
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs">
      <span className="text-white/50 mr-2">{label}</span>
      <span className="text-white font-medium capitalize">{value}</span>
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs">
      <span
        className="w-4 h-4 rounded-full border border-white/20"
        style={{ background: color }}
      />
      <span className="text-white/50">{label}</span>
      <span className="font-mono text-white/80">{color}</span>
    </div>
  );
}
