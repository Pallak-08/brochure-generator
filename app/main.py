"""FastAPI app: POST /generate { url } -> brochure JSON + PDF download URL.

Each brochure is unique: we extract the real CSS palette from the target site,
the LLM picks a design spec to match (vibe, color roles, font style),
and the renderer adapts.
"""
import json
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl

from app.llm import generate_brochure_with_design
from app.pdf import render_pdf
from app import storage

load_dotenv()

RUNS_DIR = Path(__file__).parent.parent / "runs"
RUNS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="AI Brochure Generator")

# Open CORS — frontend will hit this from a different origin (Vercel → Render).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    url: HttpUrl


class RerenderRequest(BaseModel):
    """Used by the editor: client sends the full current brochure + design state
    (after the user's edits) and we re-render the PDF. Stateless on our end so
    this works across Render container restarts."""
    url: str
    brochure: dict
    design: dict


class GenerateResponse(BaseModel):
    run_id: str
    brochure: dict
    design: dict
    palette_extracted: dict
    pdf_url: str


@app.get("/")
def root():
    return {"ok": True, "service": "brochure-generator"}


@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    url = str(req.url)
    try:
        result = generate_brochure_with_design(url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Generation failed: {e}")

    brochure = result.get("brochure", {})
    design = result.get("design", {})
    palette_extracted = result.get("palette_extracted", {})

    run_id = uuid.uuid4().hex[:12]
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    (run_dir / "brochure.json").write_text(
        json.dumps({
            "url": url,
            "brochure": brochure,
            "design": design,
            "palette_extracted": palette_extracted,
        }, indent=2)
    )

    pdf_path = run_dir / "brochure.pdf"
    try:
        render_pdf(brochure, design, source_url=url, output_path=pdf_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF render failed: {e}")

    # Upload to Supabase Storage if configured; fall back to local serving otherwise.
    # On Render, local files are ephemeral so this upload is the only durable copy.
    pdf_url = f"/runs/{run_id}/pdf"
    if storage.is_configured():
        try:
            pdf_bytes = pdf_path.read_bytes()
            storage_path = storage.upload_pdf(run_id, pdf_bytes)
            pdf_url = storage.signed_url(storage_path)
        except Exception as e:
            print(f"  supabase upload failed, falling back to local: {e}")

    return GenerateResponse(
        run_id=run_id,
        brochure=brochure,
        design=design,
        palette_extracted=palette_extracted,
        pdf_url=pdf_url,
    )


@app.post("/runs/{run_id}/rerender", response_model=GenerateResponse)
def rerender(run_id: str, req: RerenderRequest):
    """Re-render PDF with edited brochure content and/or design overrides.
    Client passes the full current state so the backend stays stateless."""
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = run_dir / "brochure.pdf"
    try:
        render_pdf(req.brochure, req.design, source_url=req.url, output_path=pdf_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF render failed: {e}")

    pdf_url = f"/runs/{run_id}/pdf"
    if storage.is_configured():
        try:
            pdf_bytes = pdf_path.read_bytes()
            storage_path = storage.upload_pdf(run_id, pdf_bytes)
            pdf_url = storage.signed_url(storage_path)
        except Exception as e:
            print(f"  supabase upload failed: {e}")

    return GenerateResponse(
        run_id=run_id,
        brochure=req.brochure,
        design=req.design,
        palette_extracted={},
        pdf_url=pdf_url,
    )


@app.get("/runs/{run_id}/pdf")
def get_pdf(run_id: str):
    """Serve the PDF inline so the frontend iframe can render it.
    The frontend's <a download> attribute still forces download for the button."""
    pdf_path = RUNS_DIR / run_id / "brochure.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Run not found")
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        # No filename= means no Content-Disposition: attachment, so the browser
        # can render the PDF inline inside an <iframe>.
        headers={
            "Content-Disposition": f'inline; filename="brochure_{run_id}.pdf"',
            "Cache-Control": "public, max-age=3600",
        },
    )


@app.get("/runs/{run_id}")
def get_run(run_id: str):
    json_path = RUNS_DIR / run_id / "brochure.json"
    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Run not found")
    return json.loads(json_path.read_text())
