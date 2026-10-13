# DevTrack 🚀
> **Developer Project & Issue Management Platform — DevOps Capstone Project**

[![DevTrack CI/CD Pipeline](https://github.com/Pranav-learner/DevOps_Capstone_Project/actions/workflows/ci.yml/badge.svg)](https://github.com/Pranav-learner/DevOps_Capstone_Project/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

DevTrack is a production-grade 3-tier issue tracking and project management platform built to demonstrate advanced modern DevOps practices from development and containerization to automated CI/CD pipelines, container registries, and cloud infrastructure.

---

## 1. Architecture Overview

```
                      Browser / Client
                             │
                   http://localhost:3000
                             │
                   ┌─────────▼─────────┐
                   │     Frontend      │
                   │   (Nginx :8080)   │ (React 19 + Vite, SPA)
                   └─────────┬─────────┘
                             │ API calls
                   http://localhost:8000
                             │
                   ┌─────────▼─────────┐
                   │     Backend       │
                   │  (FastAPI :8000)  │ (Python 3.12, Uvicorn)
                   └─────────┬─────────┘
                             │ Internal Bridge Network
                             │ postgres:5432
                   ┌─────────▼─────────┐
                   │    PostgreSQL     │
                   │ (Postgres 16 DB)  │
                   └─────────┬─────────┘
                             │
                      [Named Volume]
                   (Persistent Storage)
```

---

## 2. Technology Stack

| Tier / Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Vanilla CSS | Interactive issue management dashboard & modals |
| **Frontend Server** | Nginx (`nginx-unprivileged:alpine`) | High-performance, non-root static asset server |
| **Backend API** | FastAPI, Python 3.12, Uvicorn | RESTful API, Pydantic data schemas, CRUD endpoints |
| **Database** | PostgreSQL 16 | Relational persistence for issues and project metadata |
| **ORM & Migrations** | SQLAlchemy 2.0, Alembic | Object-relational mapping, version-controlled DDL |
| **Containerization** | Docker, Docker Compose | Multi-container isolated local runtime environment |
| **CI/CD Automation** | GitHub Actions | Automated quality gates, testing, and container delivery |
| **Container Registry** | GitHub Container Registry (GHCR) | Secure, immutable OCI image hosting (`ghcr.io`) |

---

## 3. Project Milestones

### Phase 1 — Application Foundation (Complete)
* **FastAPI Backend:** `/health`, `/ready`, `/docs`, `/metrics` endpoints.
* **Database & ORM:** PostgreSQL connection pooling, SQLAlchemy 2.0 models, Alembic schema migrations.
* **REST APIs:** Full Issue CRUD (`GET`, `POST`, `PUT`, `DELETE`), filtering by project, and `/api/issues/stats`.
* **React Dashboard:** Modern responsive dark-mode UI with stats cards, status filters, and issue creation modals.
* **Pytest Suite:** Automated unit and integration tests verifying all API and database operations.

### Phase 2 — Containerization & Docker (Complete)
* **Backend Image:** `python:3.12-slim`, layer-cached dependency installation, unbuffered logging, running under dedicated non-root user `appuser`.
* **Frontend Multi-Stage Build:** `node:20-alpine` (builder) $\rightarrow$ `nginxinc/nginx-unprivileged:alpine` (runtime). Reduced image footprint to ~26MB with zero Node.js CVE surface.
* **PostgreSQL Service:** Decoupled database container backed by `devtrack_postgres_data` persistent named volume.
* **Docker Compose Orchestration:** Declarative multi-container configuration (`docker-compose.yml`) managing startup order via health checks and automated migration synchronization.
* **Network Isolation:** Custom bridge network `devtrack-network` utilizing embedded DNS service discovery.

---

### Phase 3 — CI/CD Pipeline & GitHub Container Registry (Complete)

Our automated CI/CD pipeline runs on every push and pull request to `main` via [.github/workflows/ci.yml](.github/workflows/ci.yml).

#### Automated Quality Gates & Delivery Flow
```text
                    TEST 1: Normal Healthy Commit
                    ─────────────────────────────
                             git push
                                │
               ┌────────────────┴────────────────┐
               ▼ (PASS)                          ▼ (PASS)
        [backend-test]                    [frontend-build]
               └────────────────┬────────────────┘
                                │
                                ▼ (EXECUTES)
                         [docker-build]
                                │
                                ▼
                       ✅ Published to GHCR


                    TEST 2: Deliberate Failure Injection
                    ────────────────────────────────────
                       git push (broken test)
                                │
               ┌────────────────┴────────────────┐
               ▼ (FAILS ❌)                      ▼ (PASS)
        [backend-test]                    [frontend-build]
               │                                 │
               └────────────────┬────────────────┘
                                │
                                ▼ (BLOCKED ⛔)
                         [docker-build]
                           (SKIPPED!)
                                │
                                ▼
                     Zero images published!
                   Quality Gate Protected Repo!
```

#### Pipeline Highlights
1. **Parallel Quality Gates:** Runs `backend-test` (with an ephemeral `postgres:16-alpine` service container) and `frontend-build` (`npm ci` $\rightarrow$ `npm run build`) in parallel.
2. **Quality Gate Protection:** The `docker-build` job is gated via `needs: [backend-test, frontend-build]`. If tests fail, container building and publishing are halted immediately.
3. **Immutable Git SHA Tagging:** Images are published to GitHub Container Registry (`ghcr.io/pranav-learner/devtrack-*`) tagged with the full 40-character Git commit SHA (`${{ github.sha }}`) alongside `latest`.
4. **Least-Privilege Security:** Authenticates using short-lived, runner-scoped `secrets.GITHUB_TOKEN` with restricted `packages: write` permissions.
5. **BuildKit Caching:** Uses GitHub Actions Cache (`type=gha`) for fast Docker layer reuse.
6. **Concurrency Control:** Cancels obsolete in-progress runs when rapid commits are pushed.

---

### Phase 4 — Terraform & AWS Infrastructure (Underway)
* **Infrastructure as Code (IaC):** Modular, production-ready Terraform configuration under [`terraform/`](terraform/) targeting AWS region `ap-south-1` (Mumbai).
* **Resilient VPC Networking:** Custom VPC (`10.0.0.0/16`), 2 public subnets across distinct Availability Zones (`ap-south-1a`, `ap-south-1b`), 2 private subnets, Internet Gateway, NAT Gateway, route tables, and official Kubernetes discovery tags (`kubernetes.io/role/elb = 1`).
* **Amazon EKS Cluster:** AWS-managed Kubernetes control plane pinned to version `1.30` with least-privilege cluster IAM roles.
* **Managed Worker Node Group:** Auto-scaling `t3.medium` EC2 worker nodes deployed strictly in private subnets, isolated from direct internet ingress.
* **Security & Lifecycle:** Hardened Security Groups with least-privilege ingress/egress rules, pod-to-pod networking, and validated with `terraform fmt`, `terraform init`, and `terraform validate`.

---

## 4. Quick Start (Local Docker Compose)

### Prerequisites
* Docker Engine 24+ & Docker Compose v2+
* Git

### Running the Entire Stack
```bash
# 1. Clone the repository
git clone https://github.com/Pranav-learner/DevOps_Capstone_Project.git
cd DevOps_Capstone_Project

# 2. Build and boot all containers
docker compose up --build -d

# 3. Verify running containers and health probes
docker compose ps
```

### Accessing the Application
* **Frontend Web Dashboard:** [http://localhost:3000](http://localhost:3000)
* **FastAPI Interactive Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check Probe:** [http://localhost:8000/health](http://localhost:8000/health)

### Stopping the Stack
```bash
# Stop containers (preserves database volume data)
docker compose down

# Stop containers AND wipe database volume (clean reset)
docker compose down -v
```

---

## 5. Engineering Documentation
For in-depth architectural decisions, security audits, troubleshooting notes, and rubric tracking, refer to:
* **[DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md)**
