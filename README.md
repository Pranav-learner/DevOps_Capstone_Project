# DevTrack 🚀
> **Enterprise Developer Project & Issue Management Platform — DevOps Capstone Project**

[![DevTrack CI/CD Pipeline](https://github.com/Pranav-learner/DevOps_Capstone_Project/actions/workflows/ci.yml/badge.svg)](https://github.com/Pranav-learner/DevOps_Capstone_Project/actions/workflows/ci.yml)
[![Live Demo Walkthrough](https://img.shields.io/badge/Live%20Demo-Walkthrough%20Video-ff5722.svg)](demo/devtrack_live_walkthrough.mp4)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-v1.31-blue.svg)](https://kubernetes.io/)
[![Terraform](https://img.shields.io/badge/Terraform-IaC-purple.svg)](https://www.terraform.io/)
[![Security: Trivy](https://img.shields.io/badge/Security-Trivy%20Clean-brightgreen.svg)](https://trivy.dev/)

> 📺 **Live Video Walkthrough:** Watch the complete end-to-end DevOps demonstration (Codebase, CI/CD, Terraform, ArgoCD, Kubernetes, Prometheus & Grafana) in [demo/devtrack_live_walkthrough.mp4](demo/devtrack_live_walkthrough.mp4).

DevTrack is a production-grade 3-tier issue tracking and project management platform built to demonstrate advanced modern DevOps engineering from source code and containerization to automated CI/CD pipelines, container security scanning, infrastructure-as-code (IaC) on AWS, Kubernetes cluster orchestration via Helm, and enterprise observability with Prometheus and Grafana.

---

## 1. Architecture Overview

```
                                  Client Browser
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           │                                                         │
   [Local Development]                                       [AWS Production]
   http://localhost:3000                           http://<AWS-NLB-DNS-Hostname>/
           │                                                         │
           ▼                                                         ▼
┌───────────────────────┐                                 ┌───────────────────────┐
│     devtrack-web      │                                 │   Ingress NGINX NLB   │
│ (Nginx Unprivileged)  │                                 └───────────┬───────────┘
└──────────┬────────────┘                                             │
           │                                          ┌───────────────┴───────────────┐
           │                                          ▼ (Path: /)                     ▼ (Path: /api, /docs)
           │                                ┌───────────────────┐           ┌───────────────────┐
           │                                │ devtrack-frontend │           │  devtrack-backend │
           │                                │    (3 Replicas)   │           │    (2 Replicas)   │
           │                                └───────────────────┘           └─────────┬─────────┘
           ▼                                                                          │
┌───────────────────────┐                                                             │
│   devtrack-backend    │◄────────────────────────────────────────────────────────────┘
│    (FastAPI:8000)     │
└──────────┬────────────┘
           │
           │ (Internal Network Discovery)
           ▼
┌───────────────────────┐
│   PostgreSQL 16 DB    │
│  (Alembic Migrations) │
└──────────┬────────────┘
           │
     [EBS Volume]
  (Dynamic gp2 PVC)
```

---

## 2. Technology Stack

| Domain / Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 19, Vite, Vanilla CSS | `19.0.0` | Dark-mode workspace overview, issue filters, modal lifecycle |
| **Frontend Server** | Nginx (`nginx-unprivileged`) | `alpine` | High-performance non-root static asset server (Port 8080) |
| **Backend API** | FastAPI, Python, Uvicorn | `3.12-slim` | RESTful API, Pydantic v2 schemas, Prometheus instrumentation |
| **Database** | PostgreSQL | `16-alpine` | Relational storage for tasks, priorities, projects, and users |
| **ORM & Migrations** | SQLAlchemy, Alembic | `2.0+` | Database abstraction layer and versioned schema revisions |
| **Containerization** | Docker, Docker Compose | `v2+` | Multi-container local orchestration with healthchecks |
| **CI/CD Automation** | GitHub Actions | `v4` | Automated parallel quality gates, testing, and container delivery |
| **Container Security**| Aqua Security Trivy | `v0.75+` | Automated vulnerability & secret scanning gating PRs & builds |
| **Container Registry**| GitHub Packages (GHCR) | `OCI` | Immutable Git commit SHA-tagged container image distribution |
| **Infrastructure (IaC)**| Terraform | `v1.5+` | Automated cloud provisioning (AWS VPC, Subnets, IGW, NAT, EKS) |
| **Cloud Platform** | Amazon Web Services (AWS) | `ap-southeast-2` | Sydney region VPC, IAM, EC2 Managed Node Groups, EBS CSI |
| **Kubernetes** | Amazon EKS | `v1.31` | Production container orchestration with auto-repairing worker nodes |
| **Packaging & CD** | Helm 3 | `v3.15+` | Declarative templated application releases (`devtrack` chart) |
| **Observability** | Prometheus & Grafana | `v2.54 / v11.2` | Metrics scraping, latency histograms, and live dashboards |

---

## 3. Local Setup & Quickstart (Docker Compose)

### Prerequisites
* Docker Engine 24+ and Docker Compose v2+
* Python 3.12+ (optional, for local pytest execution)

### 1. Boot the Stack
Clone the repository and boot the multi-container stack in detached mode:
```bash
# Clone the repository
git clone https://github.com/Pranav-learner/DevOps_Capstone_Project.git
cd DevOps_Capstone_Project

# Boot Frontend, Backend, and PostgreSQL with healthcheck synchronization
docker compose up --build -d
```

### 2. Verify Service Status
```bash
docker compose ps
```
*Expected Output: All 3 containers (`devtrack-frontend`, `devtrack-backend`, `devtrack-postgres`) in `Up (healthy)` state.*

### 3. Access Local Endpoints
* **Frontend Web Dashboard:** [http://localhost:3000](http://localhost:3000)
* **Interactive OpenAPI Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **API Health Check Probe:** [http://localhost:8000/health](http://localhost:8000/health)
* **Prometheus Application Metrics:** [http://localhost:8000/metrics](http://localhost:8000/metrics)

### 4. Stop the Stack
```bash
docker compose down -v
```

---

## 4. Testing & Code Quality

The backend features an isolated, regression-tested test suite built with `pytest`:
* **Isolated Test Database:** Uses an in-memory SQLite fixture with isolated session rollbacks—preventing test pollution of production data.
* **16 Automated Test Cases:** Validates full CRUD lifecycles, Pydantic schema validations, pagination, filtering by project/assignee, statistics aggregation, and metrics exposition.

Run the test suite locally:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -v
```
*Test Result: `16 passed, 1 warning in ~0.70s`*

---

## 5. CI/CD Pipeline & DevSecOps (GitHub Actions)

Our automated continuous integration and delivery workflow is defined in [.github/workflows/ci.yml](.github/workflows/ci.yml).

### Pipeline Flow & Quality Gates
1. **Parallel Quality Gates:**
   - **`backend-test`:** Boots an ephemeral `postgres:16-alpine` service container, executes Alembic migrations (`alembic upgrade head`), and executes the complete `pytest -v` test suite.
   - **`frontend-build`:** Installs clean dependencies with `npm ci` and compiles the React Vite production bundle (`npm run build`).
2. **Quality Gate Dependency:** The `docker-build` job strictly requires `needs: [backend-test, frontend-build]`. If tests or builds fail, Docker container building and publishing are immediately halted.
3. **Immutable Git Commit SHA Tagging:** Images are published to GitHub Container Registry tagged with the full 40-character Git commit SHA (`${{ github.sha }}`) ensuring reproducible, rollback-safe deployments.
4. **Trivy Vulnerability Scanner:** Scans both `devtrack-backend` and `devtrack-frontend` container images, configured with `exit-code: 1` and `severity: CRITICAL,HIGH`. The build passes with **0 vulnerabilities and 0 leaked secrets**.

---

## 6. Infrastructure as Code (Terraform & AWS EKS)

The complete AWS cloud infrastructure is declaratively managed under [`terraform/`](terraform/):
* **Cloud Region:** AWS Sydney (`ap-southeast-2`).
* **Virtual Private Cloud (VPC):** Custom CIDR `10.0.0.0/16` with DNS hostnames enabled.
* **Subnet Topology:**
  - 2 Public Subnets (`10.0.1.0/24`, `10.0.2.0/24`) across Availability Zones `ap-southeast-2a` and `ap-southeast-2b` equipped with an Internet Gateway and public NAT Gateway.
  - 2 Private Subnets (`10.0.10.0/24`, `10.0.11.0/24`) hosting worker node workloads with zero direct internet exposure.
* **Amazon EKS Control Plane:** Version `1.31` managed Kubernetes cluster with least-privilege IAM control roles.
* **Worker Node Group:** Auto-scaling `t3.medium` instances running Amazon Linux 2023 (AL2023) managed node group.
* **EBS CSI Addon:** Deployed with IAM roles for service accounts (IRSA) for automated dynamic persistent volume provisioning.

### Deploying Infrastructure
```bash
cd terraform
terraform init
terraform plan
terraform apply -auto-approve
```

---

## 7. Kubernetes & Helm Deployment

Workloads are packaged using standard Helm charts located in [`helm/devtrack`](helm/devtrack):
* **Isolated Namespace:** Deployed inside `devtrack`.
* **Stateless Multi-Replica Pods:**
  - `devtrack-backend`: 2 replicas, RollingUpdate strategy, liveness & readiness HTTP probes.
  - `devtrack-frontend`: 3 replicas, unprivileged Nginx serving optimized static single-page bundle.
* **Stateful Storage:** `devtrack-postgres` deployed with a `PersistentVolumeClaim` dynamically bound to an AWS EBS GP2 volume via `aws-ebs-csi-driver`.
* **ClusterIP Networking:** Internal zero-trust ClusterIP services (`devtrack-backend:8000`, `devtrack-frontend:80`, `devtrack-postgres:5432`).
* **Ingress-NGINX Controller:** Public Network Load Balancer (NLB) routing:
  - `/` $\rightarrow$ Frontend UI
  - `/api` $\rightarrow$ Backend REST API
  - `/docs` $\rightarrow$ Swagger OpenAPI Documentation

### Deploying via Helm
```bash
helm upgrade --install devtrack helm/devtrack --namespace devtrack --create-namespace
```

---

## 8. Observability Setup (Prometheus & Grafana)

The observability stack is deployed in the `monitoring` namespace:
* **Prometheus Exporter:** DevTrack API exposes native Prometheus metrics (`devtrack_http_requests_total`, `devtrack_http_request_duration_seconds`, process RSS memory, and CPU utilization) at `/metrics`.
* **Prometheus Server:** Configured with Kubernetes service discovery scraping `devtrack-backend:8000/metrics` every 15 seconds. Target status is healthy (`1/1 UP`).
* **Grafana Dashboards:** Pre-provisioned declarative dashboard (`DevTrack — Application Observability & Performance`, UID: `devtrack-app-overview`) tracking:
  - Overall Backend Availability (100%)
  - Total HTTP Requests Counter & Request Rates
  - P95 / P99 Request Latency Histograms
  - HTTP 5xx Error Rates
  - Process Memory (RSS) & CPU Usage

### Accessing Dashboards
```bash
# Forward Prometheus Web UI
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Forward Grafana Dashboard
kubectl port-forward -n monitoring svc/grafana 3001:3000
```
Open [http://localhost:3001/d/devtrack-app-overview/777fce9e-37f0-5a05-9fe9-ab9b252b0107](http://localhost:3001/d/devtrack-app-overview/777fce9e-37f0-5a05-9fe9-ab9b252b0107) to view the live dashboard.

---

## 9. Known Issues & Operational Considerations

1. **AWS EC2 IMDSv2 Hop Limit on EKS AL2023:** On Amazon Linux 2023 node groups, `HttpPutResponseHopLimit` defaults to 1. Pods on overlay container networks (such as the `aws-ebs-csi-driver` controller) require `HttpPutResponseHopLimit = 2` to obtain AWS credentials from the EC2 instance metadata service.
2. **EBS Volume Single-AZ Attachment:** AWS EBS gp2/gp3 volumes are AZ-scoped (ReadWriteOnce). The PostgreSQL pod is scheduled in the availability zone matching its bound EBS volume.
3. **Grafana Anonymous Authentication:** Grafana is configured with anonymous viewer access enabled (`GF_AUTH_ANONYMOUS_ENABLED=true`) for seamless internal dashboard inspection.

---

## 10. Capstone Evidence & Submission Artifacts

All verification artifacts and evidence screenshots are maintained directly in the repository:
* **📹 Live Video Walkthrough (2m 40s):** [demo/devtrack_live_walkthrough.mp4](demo/devtrack_live_walkthrough.mp4) — *Full end-to-end operational walkthrough covering Codebase, CI/CD, Terraform, ArgoCD, Kubernetes, Prometheus & Grafana.*
* **Presentation Slide Deck:** [demo/presentation.pptx](demo/presentation.pptx) *(also available under [demo/ppt/](demo/ppt/))*
* **Engineering Notes & Audits:** [DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md)
* **Evidence Screenshots Directory:** [demo/screenshots/](demo/screenshots/)
  - [M1-application-browser.png](demo/screenshots/M1-application-browser.png) — Live DevTrack application UI
  - [M2-pytest-passing.png](demo/screenshots/M2-pytest-passing.png) — 16 passing unit tests
  - [M3-github-commit-history.png](demo/screenshots/M3-github-commit-history.png) — 10+ conventional commits on main
  - [M4-docker-compose-running.png](demo/screenshots/M4-docker-compose-running.png) — Docker Compose services status
  - [M4-application-localhost.png](demo/screenshots/M4-application-localhost.png) — Localhost application verification
  - [M5-github-actions-success.png](demo/screenshots/M5-github-actions-success.png) — Green GitHub Actions workflow run
  - [M5-ghcr-sha-tags.png](demo/screenshots/M5-ghcr-sha-tags.png) — GHCR packages with immutable commit SHA tags
  - [M6-trivy-scan.png](demo/screenshots/M6-trivy-scan.png) — Clean Trivy security scan report
  - [M7-terraform-plan.png](demo/screenshots/M7-terraform-plan.png) — Zero-drift Terraform plan
  - [M7-aws-vpc.png](demo/screenshots/M7-aws-vpc.png) — AWS Console VPC and subnets
  - [M7-aws-eks-cluster.png](demo/screenshots/M7-aws-eks-cluster.png) — AWS Console EKS cluster status
  - [M7-aws-eks-node-groups.png](demo/screenshots/M7-aws-eks-node-groups.png) — AWS Console EKS worker node group
  - [M8-kubernetes-pods.png](demo/screenshots/M8-kubernetes-pods.png) — Running Kubernetes pods in `devtrack`
  - [M8-kubernetes-services.png](demo/screenshots/M8-kubernetes-services.png) — ClusterIP services configuration
  - [M8-helm-release.png](demo/screenshots/M8-helm-release.png) — Helm release list
  - [M8-ingress-application.png](demo/screenshots/M8-ingress-application.png) — Application accessed via public AWS NLB Ingress
  - [M9-backend-metrics.png](demo/screenshots/M9-backend-metrics.png) — Prometheus `/metrics` exposition
  - [M9-prometheus-targets.png](demo/screenshots/M9-prometheus-targets.png) — Prometheus targets UP (`1/1`)
  - [M9-grafana-dashboard.png](demo/screenshots/M9-grafana-dashboard.png) — Live populated Grafana dashboard panels
