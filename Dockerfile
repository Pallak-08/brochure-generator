# Backend container — Python + WeasyPrint system deps.
# Used by Render. The frontend (web/) deploys to Vercel separately.

FROM python:3.12-slim

# WeasyPrint needs pango + cairo + harfbuzz at runtime. On Render the libs
# don't exist by default, so we install them here. (Mac has these via brew;
# Linux containers need apt.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libcairo2 \
    libffi-dev \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first so docker cache reuses the pip install layer when
# only application code changes.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the actual app code (excludes web/, .venv, runs/ via .dockerignore).
COPY app/ ./app/

# Render injects $PORT — bind to it. host=0.0.0.0 so the container is reachable.
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
