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
