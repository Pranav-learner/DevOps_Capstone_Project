# DevTrack — Development Notes

## Project Overview
DevTrack is a developer project and issue management platform built as a DevOps Capstone.
Architecture: React (Vite) -> FastAPI -> PostgreSQL -> Docker -> Kubernetes (EKS).

## Architecture Decisions
- Decoupled 3-tier architecture:
  - Frontend (React / Vite) handles client UI and state.
  - Backend (FastAPI) handles REST routing, business rules, and validation.
  - Database (PostgreSQL) handles relational data storage.
- Monorepo folder layout:
  - `backend/`: FastAPI application, Alembic migrations, pytest suite.
  - `frontend/`: React + Vite client application with modular component hierarchy.
- Database Schema Versioning:
  - Managed via Alembic migrations (`alembic upgrade head`) rather than raw DDL.
- Secret Hygiene:
  - Credentials managed via `.env` (gitignored).
  - `.env.example` provides the checked-in blueprint.

## Completed Modules (Phase 1)
1. **1.1 Architecture & Repository Structure**: Monorepo layout, Git ignore, environment templates.
2. **1.2 FastAPI Backend Setup**: Application entrypoint, CORS configuration, health and readiness probes.
3. **1.3 PostgreSQL + SQLAlchemy**: Engine pooling, sessionmaker, declarative base, and request dependency injection (`get_db`).
4. **1.4 DevTrack Issue Model**: SQLAlchemy 2.0 ORM model with status & priority enums and audit timestamps.
5. **1.5 Pydantic Schemas**: `IssueBase`, `IssueCreate`, `IssueUpdate`, `IssueResponse`, and `IssueStats`.
6. **1.6 CRUD REST APIs**: 6 endpoints (`GET`, `POST`, `PUT`, `DELETE`, `stats`, single item lookup).
7. **1.7 Alembic Migrations**: Initial migration script generated and applied to PostgreSQL.
8. **1.8 React Frontend**: Modular components (`Sidebar`, `Header`, `StatCards`, `IssueTable`, `IssueModal`).
9. **1.9 Frontend <-> Backend Integration**: End-to-end asynchronous HTTP communication with loading & error handling.
10. **1.10 Phase 1 Verification**: Complete pytest automated test suite verifying all CRUD operations against PostgreSQL.

## Commands Reference
```bash
# Start PostgreSQL container
docker run -d --name devtrack-postgres -p 5433:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=devtrack postgres:17

# Backend run & test
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
pytest tests/

# Frontend run & build
cd frontend
npm run dev
npm run build
```

## Completed Modules (Phase 2 — Containerization & Docker)
1. **2.1 Docker Fundamentals & Architecture**: 3-tier container decoupled design, image vs container, ephemeral filesystems vs persistent storage.
2. **2.2 Backend Containerization**: `backend/Dockerfile` using `python:3.12-slim`, layer-cached dependency installation, clean `.dockerignore`, unbuffered output, non-root user `appuser`.
3. **2.3 Frontend Multi-Stage Build**: `frontend/Dockerfile` using two-stage pipeline (`node:20-alpine` for building $\rightarrow$ `nginxinc/nginx-unprivileged:alpine` for serving). Image reduced to ~26MB, zero Node.js runtime attack surface, SPA `try_files` routing.
4. **2.4 PostgreSQL Persistence & Env Configuration**: `postgres:16-alpine`, Docker named volume (`devtrack_postgres_data`), verified persistence across container deletion, environment variable decoupling.
5. **2.5 Multi-Container Orchestration**: `docker-compose.yml` declaring `frontend`, `backend`, and `postgres` with dependency health conditions and automatic Alembic migrations on startup.
6. **2.6 Service Discovery & Internal Networking**: Isolated bridge network `devtrack-network`, internal DNS resolving `postgres:5432`, verified container isolation vs `localhost`.
7. **2.7 Non-Root Security Hardening**: Verified non-root execution (`appuser` UID 999/1000 in backend, `nginx` UID 101 in frontend), restricted filesystem writes in root directories.
8. **2.8 Health Checks & Lifecycle Management**: Implemented container healthcheck probes (`pg_isready` for Postgres, native Python HTTP probe for `/health` in FastAPI).
9. **2.9 Full Docker Verification & Rubric Audit**: End-to-end CRUD verification, browser validation at `http://localhost:3000`, volume persistence audit.

## Docker Commands Reference
```bash
# Build and start all services in detached mode
docker compose up --build -d

# Check running services and health status
docker compose ps

# View service logs
docker compose logs -f backend
docker compose logs -f postgres

# Verify non-root UIDs
docker compose exec backend id
docker compose exec frontend id

# Stop containers without removing persistent volume data
docker compose down

# Teardown containers AND delete persistent volumes (destructive)
docker compose down -v
```

## Phase 2 Architecture Decisions & Security Model
- **Multi-Stage Build (Frontend)**: Compiles React with Node.js in stage 1, then discards all Node tooling and runtime dependencies. Production runtime uses `nginxinc/nginx-unprivileged:alpine` (~26MB), eliminating build tool CVE vulnerabilities.
- **Principle of Least Privilege (Non-Root)**:
  - Backend runs as system user `appuser` (UID 999/1000).
  - Frontend runs under official unprivileged user `nginx` (UID 101) on port 8080.
  - Mitigates container-escape risks by forbidding arbitrary root filesystem alterations.
- **Embedded DNS & Service Discovery**: Services talk using Compose service names (`postgres:5432`) over an isolated bridge network `devtrack-network`, avoiding brittle hardcoded IP configurations.
- **Stateful vs Stateless Lifecycle**: PostgreSQL data is decoupled into the named volume `devtrack_postgres_data` allowing stateless app container destruction without risking database state loss.
- **Automated Schema Sync**: Container entrypoint runs `alembic upgrade head` before Uvicorn starts, synchronizing database models automatically on service launch.

## Completed Modules (Phase 3 — CI/CD with GitHub Actions)
1. **3.1 CI/CD Fundamentals & Workflow Architecture**: Established 3-stage automated pipeline design (Quality Gates: Tests & Builds $\rightarrow$ Container Build $\rightarrow$ GHCR Publishing). Decoupled CI test environment from local host database.
2. **3.2 First GitHub Actions Workflow**: Created `.github/workflows/ci.yml` listening on `push` and `pull_request` to `main`, running on `ubuntu-latest`, verifying repository integrity and Git commit context.
3. **3.3 Backend Automated Testing**: Added `backend-test` job running an ephemeral `postgres:16-alpine` service container on the runner, applying Alembic migrations to `devtrack_test`, and executing the Pytest suite.
4. **3.4 Frontend Production Build**: Added `frontend-build` job compiling the React + Vite production bundle (`npm ci` $\rightarrow$ `npm run build`), running in parallel with backend tests.
5. **3.5 Docker Image Builds**: Added `docker-build` job gated sequentially via `needs: [backend-test, frontend-build]`, verifying Buildx compilation of both application images.
6. **3.6 GitHub Container Registry (GHCR)**: Configured least-privilege `packages: write` permissions, automated authentication via ephemeral `GITHUB_TOKEN`, normalized lowercase image paths, and established publishing to `ghcr.io`.
7. **3.7 Git SHA Image Tagging**: Implemented dual-tagging strategy applying full 40-character immutable Git commit SHA (`${{ github.sha }}`) alongside `latest` for both frontend and backend images.
8. **3.8 Pipeline Quality & Security**: Configured workflow concurrency control (`cancel-in-progress: true`), Docker Buildx GHA layer caching (`type=gha`), restricted publishing to trusted `push` events, and pinned actions.
9. **3.9 End-to-End Verification**: *(Planned)*

## Phase 3 CI/CD Architecture & Quality Gates
- **Trigger Strategy**: Pipeline triggers automatically on direct pushes to `main` and on pull requests targeting `main`. Image publishing runs exclusively on validated pushes to `main`.
- **Concurrency Control**: `concurrency: group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true` terminates redundant active runs on rapid commits to avoid race conditions.
- **Quality Gates Principle**: Builds and image publishing are gated strictly behind passing automated tests and front-end compilation (`needs: [backend-test, frontend-build]`). A single test failure immediately terminates the pipeline before any artifact is pushed.
- **Workflow File**: `.github/workflows/ci.yml`
- **Registry & Authentication**: Images publish to GitHub Container Registry (`ghcr.io`) using GitHub's built-in, ephemeral `GITHUB_TOKEN` with least-privilege `packages: write` permissions (no long-lived PATs required).
- **Immutable Tagging**: Images are tagged with the full 40-character Git commit SHA (`${{ github.sha }}`) to guarantee 100% auditability and enable reliable rollbacks.
- **Build Performance**: Leverages Buildx GitHub Actions Cache (`type=gha`, `mode=max`) to persist intermediate Docker layer caches across workflow runs.

## Phase 3 M5 Rubric & Evidence Tracker

| Criteria | Requirement | Status | Verification Location |
| :--- | :--- | :---: | :--- |
| **1. Workflow Exists** | At least one workflow in `.github/workflows/` | ✅ Verified | `.github/workflows/ci.yml` |
| **2. Trigger on `main`** | Triggers on push to `main` branch | ✅ Verified | `on.push.branches: [main]` |
| **3. Pytest Quality Gate** | Pytest runs in CI; failure fails build | ✅ Verified | `backend-test` job in `.github/workflows/ci.yml` |
| **4. Frontend Build Gate** | Production build runs in CI | ✅ Verified | `frontend-build` job in `.github/workflows/ci.yml` |
| **5. Docker Image Builds** | Both backend & frontend images build | ✅ Verified | `docker-build` job in `.github/workflows/ci.yml` |
| **6. Publish to GHCR** | Both images pushed to `ghcr.io` | ✅ Verified | `docker/login-action` + GHCR push in `ci.yml` |
| **7. Immutable SHA Tags** | Image tags use Git commit SHA (not just `latest`) | ✅ Verified | `docker-build` tags in `.github/workflows/ci.yml` |



