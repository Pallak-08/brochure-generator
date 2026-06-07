"""Supabase Storage wrapper — uploads PDFs and produces signed URLs.

Why Supabase Storage: Render's filesystem is ephemeral (any container restart
wipes the runs/ folder). PDFs must live somewhere durable. Supabase Storage
gives us a private bucket + short-lived signed URLs for free, which is exactly
what we need for a portfolio demo.

The bucket is private — clients can only read via a time-limited signed URL.
The service_role key lets the backend bypass RLS to upload from anywhere.
"""
import os
from functools import lru_cache
from typing import Optional

from supabase import Client, create_client

BUCKET = "brochures"
DEFAULT_TTL = 60 * 60 * 24 * 7  # 7 days — fine for a portfolio demo


@lru_cache(maxsize=1)
def _client() -> Optional[Client]:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)


def is_configured() -> bool:
    return _client() is not None


def upload_pdf(run_id: str, pdf_bytes: bytes) -> str:
    """Upload PDF bytes to Supabase Storage. Returns the storage path."""
    c = _client()
    if c is None:
        raise RuntimeError("Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY missing)")
    path = f"{run_id}.pdf"
    # upsert=true means re-running with the same id overwrites cleanly.
    c.storage.from_(BUCKET).upload(
        path=path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )
    return path


def signed_url(path: str, ttl_seconds: int = DEFAULT_TTL) -> str:
    """Generate a time-limited signed URL for a PDF in the bucket."""
    c = _client()
    if c is None:
        raise RuntimeError("Supabase not configured")
    res = c.storage.from_(BUCKET).create_signed_url(path, ttl_seconds)
    # supabase-py returns dict with key 'signedURL' (legacy) or 'signedUrl'.
    return res.get("signedURL") or res.get("signedUrl") or ""
