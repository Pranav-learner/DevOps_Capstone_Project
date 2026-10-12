from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.routes import issues

app = FastAPI(
    title="DevTrack API",
    description="Developer Project & Issue Management Platform",
    version="0.1.0",
)

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
    """Basic metrics endpoint placeholder for future Prometheus integration."""
    return {
        "app": "devtrack-api",
        "version": "0.1.0",
        "uptime": "ok",
    }
