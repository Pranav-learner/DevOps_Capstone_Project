import time
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)
from app.routes import issues

app = FastAPI(
    title="DevTrack API",
    description="Developer Project & Issue Management Platform",
    version="0.1.0",
)

# Prometheus Metrics Instrumentation
REQUEST_COUNT = Counter(
    "devtrack_http_requests_total",
    "Total count of HTTP requests processed by DevTrack API",
    ["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "devtrack_http_request_duration_seconds",
    "HTTP request latency in seconds for DevTrack API",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

APP_INFO = Gauge(
    "devtrack_app_info",
    "DevTrack application build and version metadata",
    ["app", "version"],
)
APP_INFO.labels(app="devtrack-api", version="0.1.0").set(1)

# Enable CORS for frontend development
origins = [
    "http://localhost:5173",  # Vite default dev server
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def prometheus_request_middleware(request: Request, call_next):
    """Middleware recording HTTP request count and latency with normalized route endpoints."""
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    # Normalize endpoint using matched route template to avoid high cardinality
    route = request.scope.get("route")
    endpoint = (
        getattr(route, "path_format", getattr(route, "path", None))
        if route
        else request.url.path
    ) or request.url.path

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=endpoint,
        status_code=str(response.status_code),
    ).inc()

    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=endpoint,
    ).observe(duration)

    return response


# Register Issue API routes
app.include_router(issues.router)


@app.get("/", tags=["General"])
def read_root():
    """Root endpoint welcoming API consumers."""
    return {
        "message": "Welcome to DevTrack API",
        "docs_url": "/docs",
        "status": "healthy",
    }


@app.get("/health", tags=["Monitoring"], status_code=status.HTTP_200_OK)
def health_check():
    """Liveness probe: verifies the service process is alive."""
    return {"status": "healthy"}


@app.get("/ready", tags=["Monitoring"], status_code=status.HTTP_200_OK)
def readiness_check():
    """Readiness probe: verifies the service is ready to receive traffic."""
    return {"status": "ready"}


@app.get("/metrics", tags=["Monitoring"])
def metrics():
    """Prometheus exposition endpoint returning standard text format metrics."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
