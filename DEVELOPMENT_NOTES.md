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
