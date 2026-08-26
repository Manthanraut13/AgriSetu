# ── AgriSetu Backend — Multi-stage Dockerfile ──
# Stage 1: builder — install all deps into a virtualenv
FROM python:3.11-slim AS builder

WORKDIR /app

# System deps needed only at build time (for cffi / cryptography)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt


# Stage 2: runtime — slim image with only runtime deps
FROM python:3.11-slim AS runtime

# Runtime system deps (libgomp for xgboost threading)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgomp1 curl && \
    rm -rf /var/lib/apt/lists/*

# Copy virtualenv from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Copy application code
COPY routers/ ./routers/
COPY services/ ./services/
COPY schemas/ ./schemas/
COPY data/ ./data/
COPY models/ ./models/
COPY main.py config.py constants.py ./

EXPOSE 8000

# Health check — hits the /health endpoint from inside the container
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
