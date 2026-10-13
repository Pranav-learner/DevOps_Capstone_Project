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
9. **3.9 End-to-End Verification**: Validated full pipeline execution through GitHub Actions, including deliberate failure injection (commit `e80c487`) proving the quality gate blocks image publication, followed by green restoration (commit `f43cc78`).

## Phase 3 CI/CD Architecture & Quality Gates
- **Trigger Strategy**: Pipeline triggers automatically on direct pushes to `main` and on pull requests targeting `main`. Image publishing runs exclusively on validated pushes to `main`.
- **Concurrency Control**: `concurrency: group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true` terminates redundant active runs on rapid commits to avoid race conditions.
- **Quality Gates Principle**: Builds and image publishing are gated strictly behind passing automated tests and front-end compilation (`needs: [backend-test, frontend-build]`). A single test failure immediately terminates the pipeline before any artifact is pushed.
- **Workflow File**: `.github/workflows/ci.yml`
- **Registry & Authentication**: Images publish to GitHub Container Registry (`ghcr.io`) using GitHub's built-in, ephemeral `GITHUB_TOKEN` with least-privilege `packages: write` permissions (no long-lived PATs required).
- **Immutable Tagging**: Images are tagged with the full 40-character Git commit SHA (`${{ github.sha }}`) to guarantee 100% auditability and enable reliable rollbacks.
- **Build Performance**: Leverages Buildx GitHub Actions Cache (`type=gha`, `mode=max`) to persist intermediate Docker layer caches across workflow runs.

### Quality Gate Verification Flow
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

## Phase 3 M5 Rubric & Evidence Tracker

| Criteria | Requirement | Status | Verification Location / Evidence |
| :--- | :--- | :---: | :--- |
| **1. Workflow Exists** | At least one workflow in `.github/workflows/` | ✅ Verified | `.github/workflows/ci.yml` |
| **2. Trigger on `main`** | Triggers on push to `main` branch | ✅ Verified | `on.push.branches: [main]` |
| **3. Pytest Quality Gate** | Pytest runs in CI; failure fails build | ✅ Verified | `backend-test` job; verified blocking via commit `e80c487` |
| **4. Frontend Build Gate** | Production build runs in CI | ✅ Verified | `frontend-build` job in `.github/workflows/ci.yml` |
| **5. Docker Image Builds** | Both backend & frontend images build | ✅ Verified | `docker-build` job in `.github/workflows/ci.yml` |
| **6. Publish to GHCR** | Both images pushed to `ghcr.io` | ✅ Verified | Published to `ghcr.io/pranav-learner/devtrack-*` |
| **7. Immutable SHA Tags** | Image tags use Git commit SHA (not just `latest`) | ✅ Verified | Tagged with `${{ github.sha }}` and `latest` in GHCR |

## Phase 4 — Terraform & AWS Infrastructure (Underway)

### Overview & High-Level Architecture
In Phase 4, we provision the production cloud infrastructure for DevTrack on Amazon Web Services (AWS) using Terraform (Infrastructure as Code - IaC).
The target environment consists of:
- **Virtual Private Cloud (VPC)** in `ap-south-1` (Mumbai) spanning two Availability Zones (`ap-south-1a`, `ap-south-1b`).
- **Subnet Topology**: Public subnets (with Internet Gateway) and Private subnets (for EKS worker nodes).
- **Elastic Kubernetes Service (EKS)**: AWS-managed control plane with managed node groups (EC2 instances).
- **IAM Security**: Dedicated least-privilege IAM roles for the EKS cluster and node groups.

```text
                               AWS Cloud (Region: ap-south-1)
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ Virtual Private Cloud (VPC: 10.0.0.0/16)                                               │
 │                                                                                        │
 │  Availability Zone 1 (ap-south-1a)                 Availability Zone 2 (ap-south-1b)   │
 │ ┌───────────────────────────────────────┐         ┌──────────────────────────────────┐ │
 │ │ Public Subnet A (10.0.1.0/24)         │         │ Public Subnet B (10.0.2.0/24)    │ │
 │ │  • Ingress / ALBs                     │         │  • Ingress / ALBs                │ │
 │ └───────────────────┬───────────────────┘         └──────────────────┬───────────────┘ │
 │                     │                                                │                 │
 │                     └───────────────────────┬────────────────────────┘                 │
 │                                             ▼                                          │
 │                                [Internet Gateway (IGW)]                                │
 │                                             ▲                                          │
 │                                             │                                          │
 │ ┌───────────────────────────────────────┐   │     ┌──────────────────────────────────┐ │
 │ │ Private Subnet A (10.0.10.0/24)       │   │     │ Private Subnet B (10.0.11.0/24)  │ │
 │ │  • EKS Worker Node (EC2)              │───┴────▶│  • EKS Worker Node (EC2)         │ │
 │ │    - DevTrack Pods (Frontend, API)    │         │    - DevTrack Pods (PostgreSQL)  │ │
 │ └───────────────────────────────────────┘         └──────────────────────────────────┘ │
 │                                             ▲                                          │
 │                                             │                                          │
 │                          [EKS Managed Control Plane]                                   │
 │                           (Kubernetes API Server / etcd)                               │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

### Module 4.1 — AWS and Terraform Fundamentals
- **Infrastructure as Code (IaC)**: Eliminates manual "ClickOps" in the AWS Management Console by defining all infrastructure in declarative, version-controlled HashiCorp Configuration Language (HCL).
- **Key Terraform Concepts**:
  - `terraform init`: Initializes the workspace, downloads specified AWS provider plugins.
  - `terraform validate`: Verifies syntax and internal consistency of HCL files without cloud calls.
  - `terraform plan`: Generates an execution plan, computing drift against current state and calculating additions (`+`), changes (`~`), and destructions (`-`).
  - `terraform apply`: Provisions declared infrastructure in the exact dependency order.
  - `terraform destroy`: Tears down all resources recorded in the state file in reverse dependency order.
  - `terraform.tfstate`: JSON file recording real-world cloud resource IDs and attributes mapped to Terraform declarations.
- **Local Tooling Verification**:
  - `terraform`: v1.9.8 (verified installed)
  - `aws-cli`: v2.37.10 (verified installed)
  - `kubectl`: v1.35.1 (verified installed)
  - AWS Credentials: Checked via `aws sts get-caller-identity`; credentials to be configured securely before Phase 4.8 apply.
- **Cost Drivers Identified**:
  - EKS Control Plane: ~$0.10/hour (~$72/month if left running).
  - EC2 Worker Nodes: `t3.medium` instances (~$0.0416/hour each in `ap-south-1`).
  - NAT Gateway (if enabled): ~$0.045/hour (~$32.40/month per NAT) + data processing.
  - Cost Strategy: Deploy, verify, capture evidence for rubric & demo, then run `terraform destroy` promptly.


### Module 4.2 — Terraform Project Configuration
- **Directory Layout**: Created dedicated `terraform/` root directory isolating infrastructure code from application source code.
- **Provider & Version Constraints (`versions.tf`)**:
  - Terraform core pinned to `>= 1.5.0, < 2.0.0` (matching local Terraform `v1.9.8`).
  - AWS provider pinned to `hashicorp/aws` `~> 5.50` for up-to-date EKS and VPC resource support.
- **Provider Configuration (`providers.tf`)**:
  - AWS provider configured to target `var.aws_region` (`ap-south-1`).
  - Added global `default_tags` (`Project: DevTrack`, `Environment: var.environment`, `ManagedBy: Terraform`) for cost allocation and tag governance.
  - Zero hardcoded credentials in source code.
- **Variables & Defaults (`variables.tf`)**:
  - Parameterized region, cluster name, Kubernetes version (`1.30`), CIDR ranges, and worker node scaling bounds.
- **Outputs (`outputs.tf`)**:
  - Declared outputs for region, environment, and cluster name.
- **Example Blueprint (`terraform.tfvars.example`)**:
  - Checked-in blueprint for parameter overrides containing zero real secrets.
- **Security & Git Hygiene (`.gitignore`)**:
  - Configured gitignore to exclude `.terraform/`, `*.tfstate*`, `*.tfplan*`, and local `terraform.tfvars`, while explicitly permitting `!terraform.tfvars.example`.

### Module 4.3 — VPC and Networking Topology
- **VPC Definition (`networking.tf`)**:
  - CIDR block `10.0.0.0/16` providing 65,536 private IP addresses.
  - Enabled DNS hostnames and DNS support (prerequisite for Kubernetes worker nodes and AWS VPC CNI).
  - Tagged with `kubernetes.io/cluster/${var.cluster_name} = shared`.
- **Availability Zone Dynamic Discovery**:
  - Leverages `data "aws_availability_zones" "available"` to discover region AZs dynamically (`ap-south-1a`, `ap-south-1b`).
- **Subnet Segmentation & CIDR Calculations**:
  - **Public Subnets**: `10.0.1.0/24` (AZ a) and `10.0.2.0/24` (AZ b). Configured with `map_public_ip_on_launch = true`.
  - **Private Subnets**: `10.0.10.0/24` (AZ a) and `10.0.11.0/24` (AZ b). Configured with `map_public_ip_on_launch = false`.
- **Kubernetes Load Balancer Subnet Discovery Tags**:
  - Public Subnets: `kubernetes.io/role/elb = "1"` (allows AWS Load Balancer Controller to auto-discover subnets for external ALBs/NLBs).
  - Private Subnets: `kubernetes.io/role/internal-elb = "1"` (allows auto-discovery for internal load balancers).
- **Internet Gateway & Routing**:
  - `aws_internet_gateway` attached to the VPC.
  - Dedicated public route table routing `0.0.0.0/0` $\rightarrow$ Internet Gateway.
  - Associated with both public subnets via `aws_route_table_association`.
- **Network Outputs**:
  - Exported `vpc_id`, `vpc_cidr_block`, `public_subnet_ids`, and `private_subnet_ids` in `outputs.tf`.

### Module 4.4 — NAT Architecture and Security Groups
- **NAT Gateway Trade-off Analysis**:
  - *Internet Gateway vs NAT Gateway*: IGW enables two-way internet traffic for public instances; NAT Gateway enables one-way outbound internet access for private instances without exposing their private IPs to incoming internet connections.
  - *Architecture Choice*: Single NAT Gateway deployed in Public Subnet 1 (`enable_nat_gateway = true`), shared by both private subnets.
  - *Cost Control*: ~$0.045/hour (~$0.045 to $0.09 for our testing session). Controlled via parameter `var.enable_nat_gateway`.
- **EKS Control Plane Security Group (`aws_security_group.cluster`)**:
  - Ingress: HTTPS (port 443) strictly from the worker node security group.
  - Egress: Full outbound access to communicate with worker nodes and AWS APIs.
- **Worker Node Security Group (`aws_security_group.node`)**:
  - Intra-cluster ingress: All protocols/ports allowed between members of the same security group (`self = true`) for pod-to-pod networking across nodes.
  - Ingress from Control Plane: Kubelet API (port 10250) for `kubectl exec`/`logs`, and HTTPS (port 443).
  - Outbound egress: Full egress (`0.0.0.0/0`) for container image pulls (GHCR), DNS, and external dependencies.
- **Tagged for Kubernetes**: `kubernetes.io/cluster/${var.cluster_name} = "owned"`.

### Module 4.5 — Amazon EKS Cluster & Managed Node Group
- **Kubernetes Version Selection**:
  - Pinned to `1.30` in `variables.tf`. Fully supported across AWS EKS and the AWS provider `~> 5.50`.
- **EKS Control Plane (`aws_eks_cluster.devtrack`)**:
  - AWS-managed Kubernetes master nodes running API server, controller manager, and etcd.
  - Subnet configuration: Associated with all public and private subnets across `ap-south-1a` and `ap-south-1b` for resilient cross-account ENI placement.
  - Endpoint Access: Enabled both `endpoint_private_access = true` and `endpoint_public_access = true` (enables developer laptop access via `kubectl` without requiring an AWS Client VPN or bastion host).
- **Cluster IAM Role (`aws_iam_role.cluster`)**:
  - Assume role policy for `eks.amazonaws.com`.
  - Attached policies: `AmazonEKSClusterPolicy` and `AmazonEKSVPCResourceController`.
- **Managed Worker Node Group (`aws_eks_node_group.devtrack`)**:
  - Placed strictly in private subnets (`aws_subnet.private[*].id`) for workload isolation.
  - EC2 instance type: `t3.medium` (2 vCPU, 4 GiB RAM), providing sufficient headroom for AWS VPC CNI, CoreDNS, kube-proxy, and DevTrack 3-tier microservices.
  - Scaling boundaries: `desired_size = 2`, `min_size = 1`, `max_size = 3`.
  - Rolling update strategy: `max_unavailable = 1`.
- **Worker Node IAM Role (`aws_iam_role.node`)**:
  - Assume role policy for `ec2.amazonaws.com`.
  - Attached policies: `AmazonEKSWorkerNodePolicy`, `AmazonEKS_CNI_Policy` (for ENI IP management), and `AmazonEC2ContainerRegistryReadOnly`.
- **EKS Outputs**:
  - Exported `cluster_endpoint`, `cluster_certificate_authority_data`, `cluster_oidc_issuer_url`, `node_group_id`, and `node_group_status` in `outputs.tf`.

### Module 4.6 — Terraform State and Lifecycle Management
- **State File Anatomy (`terraform.tfstate`)**:
  - Acts as the definitive ledger mapping declarative HCL resources to real-world AWS resource IDs (e.g., `vpc-0123...`, `eks-cluster-...`).
  - Records dependencies, provider metadata, and computed attributes.
- **Resource Addressing & Dependency Graph**:
  - Address notation: `<resource_type>.<name>` (e.g., `aws_vpc.devtrack`, `aws_eks_node_group.devtrack`).
  - Count indices: `<resource_type>.<name>[<index>]` (e.g., `aws_subnet.public[0]`).
  - Terraform builds a Directed Acyclic Graph (DAG) determining execution order:
    1. Independent resources (VPC, IAM roles) are created concurrently.
    2. Dependent subnets and route tables are created once VPC exists.
    3. EKS Cluster is created once subnets, security groups, and IAM role attachments exist.
    4. Node group is created last once EKS cluster is ACTIVE.
- **Drift Detection & Cloud Reconciliation**:
  - During `terraform plan` or `refresh`, Terraform queries the AWS API to check whether real infrastructure matches state.
  - If a resource was modified or deleted manually in the AWS Console ("ClickOps"), Terraform calculates the drift and plans additions or updates to restore the declared state.
- **State Locking & Collaboration Models**:
  - *Local State (Capstone)*: Stored in `terraform/terraform.tfstate`. Fast, self-contained, requiring zero pre-existing cloud storage. Safe for single-student capstone workflows.
  - *Remote State (Production / Team)*: AWS S3 backend (encrypted with KMS, versioned) paired with DynamoDB table for distributed write locking (`StateLock`), preventing concurrent apply collisions.
  - *Security Mandate*: `.tfstate` files are strictly excluded from version control via `.gitignore` to prevent secret leakage.

### Module 4.7 — Validation, Initialization, and Plan Preparation
- **Code Style Verification (`terraform fmt -check`)**:
  - Validated all `.tf` files in `terraform/` directory. Zero syntax or indentation deviations.
- **Provider Initialization (`terraform init`)**:
  - Successfully connected to HashiCorp Registry and installed `hashicorp/aws v5.100.0`.
  - Created `.terraform.lock.hcl` pinning provider checksums.
  - Exit code `0` achieved (Rubric Item 2 completed).
- **Static Schema Validation (`terraform validate`)**:
  - Validated all HCL resources, blocks, types, and variables across `versions.tf`, `providers.tf`, `variables.tf`, `networking.tf`, `security.tf`, `eks.tf`, and `outputs.tf`.
  - Returned: `Success! The configuration is valid.` with 0 errors.
- **Plan Preparation (`terraform plan`)**:
  - Requires AWS credentials to query live Availability Zones via `data "aws_availability_zones" "available"` before calculating resource additions.
  - Secure credential configuration guided via `aws configure` (avoiding hardcoded secrets).

### Phase 4 M7 Rubric & Evidence Tracker (15 Points Total)

| Rubric Item | Points | Requirement | Status | Verification / Evidence |
| :--- | :---: | :--- | :---: | :--- |
| **1. Terraform Directory & HCL** | 2 | Clean directory with valid, modular `.tf` files | ✅ Implemented | `terraform/` with `versions.tf`, `providers.tf`, `variables.tf`, `networking.tf`, `security.tf`, `eks.tf`, `outputs.tf` (`fmt` checked) |
| **2. `terraform init` Success** | 1 | Provider download and backend initialization | ✅ Verified | `terraform init` exited with code 0; installed `aws v5.100.0` |
| **3. `terraform plan` Output** | 2 | Valid, non-empty plan showing resources to add | ⏳ Ready for Auth | Validated via `terraform validate`; awaiting `aws configure` for cloud refresh |
| **4. VPC & Public Subnets** | 3 | VPC provisioned with $\ge 2$ public subnets in distinct AZs | ⏳ Code Ready | Defined in `networking.tf`; awaiting apply in Part 4.8 |
| **5. EKS Cluster & Node Group** | 4 | ACTIVE EKS cluster and ACTIVE managed worker node group | ⏳ Code Ready | Defined in `eks.tf`; awaiting apply in Part 4.8 |
| **6. Clean `terraform destroy`** | 2 | Clean teardown of all managed infrastructure | ⏳ Pending | Scheduled for Part 4.9 |
| **7. `terraform.tfvars.example`** | 1 | Example variables file committed without real secrets | ✅ Verified | `terraform/terraform.tfvars.example` created & tracked |

## Phase 5 — Kubernetes Workloads & Helm (Underway)

### Overview
In Phase 5, we transition DevTrack from Docker Compose containerization to declarative Kubernetes workloads and reusable Helm charts.
All workloads target the dedicated `devtrack` namespace and pull verified OCI images from GitHub Container Registry (`ghcr.io/pranav-learner/devtrack-*`).

### Module 5.1 — Preflight Discovery
- **Toolchain Audited**:
  - `kubectl`: v1.35.1 (Active)
  - `helm`: v3.17.1 (Active)
  - `minikube`: v1.38.1 (Installed)
- **Container Registry Baseline**:
  - Backend: `ghcr.io/pranav-learner/devtrack-backend`
  - Frontend: `ghcr.io/pranav-learner/devtrack-frontend`
  - Tag Strategy: Pinned full Git commit SHA (`bb56f13b43164745584512374d5e1f66cbdf75b6`) alongside `latest`.

### Module 5.2 — Kubernetes Resource Fundamentals & Core Workloads
- **Dedicated Namespace (`k8s/namespace.yaml`)**:
  - Namespace `devtrack` with standard Kubernetes recommended labels.
- **Backend Workload (`k8s/backend-deployment.yaml` & `k8s/backend-service.yaml`)**:
  - 2 Replicas for high availability (satisfies rubric requirement).
  - RollingUpdate deployment strategy (`maxSurge: 1`, `maxUnavailable: 0`).
  - Container port 8000 mapped to ClusterIP service `devtrack-backend`.
  - Non-root security context (`appuser` UID 1000).
  - Resource requests: CPU 100m, Memory 128Mi; limits: CPU 300m, Memory 256Mi.
  - Liveness probe (`/health`) and readiness probe (`/ready`).
- **Frontend Workload (`k8s/frontend-deployment.yaml` & `k8s/frontend-service.yaml`)**:
  - 2 Replicas of Nginx unprivileged SPA.
  - Container port 8080 exposed via ClusterIP service `devtrack-frontend` on port 80.
  - Non-root security context (`nginx` UID 101).
  - Liveness probe (`/`) and readiness probe (`/`).
  - Resource requests: CPU 50m, Memory 64Mi; limits: CPU 200m, Memory 128Mi.

### Module 5.3 — ConfigMaps, Secrets, and PostgreSQL Persistence
- **Decoupled Configuration (`k8s/configmap.yaml`)**:
  - ConfigMap `devtrack-config` isolating non-sensitive variables (`POSTGRES_DB: devtrack`, `POSTGRES_USER: postgres`, `POSTGRES_HOST: devtrack-postgres`, `POSTGRES_PORT: 5432`, `ENVIRONMENT: production`).
- **Secret Hygiene (`k8s/secret.example.yaml`)**:
  - Clean template blueprint providing connection string format without real credentials.
  - Excluded `k8s/secret.yaml` from Git tracking via `.gitignore`.
- **Database Persistence (`k8s/postgres-pvc.yaml`)**:
  - 1 GiB ReadWriteOnce `PersistentVolumeClaim` ensuring issue and user data persists across Pod restarts and upgrades.
- **PostgreSQL Stateful Workload (`k8s/postgres-deployment.yaml` & `k8s/postgres-service.yaml`)**:
  - Single replica with `strategy: Recreate` preventing dual-pod write lock collisions on the PVC.
  - Backed by official `postgres:16-alpine`.
  - Mounted volume at `/var/lib/postgresql/data` with `subPath: postgres`.
  - Health probes using `pg_isready -U postgres -d devtrack` for liveness and readiness.
  - ClusterIP service exposing port 5432 resolving `devtrack-postgres:5432` internally for backend Pods.

### Module 5.4 — Ingress Routing & Declarative Manifest Management
- **Unified Ingress Entrypoint (`k8s/ingress.yaml`)**:
  - `ingressClassName: nginx` standard routing for Kubernetes Ingress Controllers.
  - Path-based routing:
    - `/` (Prefix) $\rightarrow$ Service `devtrack-frontend` on port 80 (React web application).
    - `/api` (Prefix) $\rightarrow$ Service `devtrack-backend` on port 8000 (FastAPI REST endpoints).
    - `/docs` (Prefix) & `/openapi.json` (Exact) $\rightarrow$ Service `devtrack-backend` on port 8000 (Interactive API documentation).
- **Declarative Kustomization (`k8s/kustomization.yaml`)**:
  - Manages the complete resource manifest set across namespace, configs, secrets, PVC, stateful database, stateless API, and UI in proper dependency sequence.
  - Validated offline via `kubectl kustomize k8s/` exiting with status code 0.

### Module 5.5 — Helm Chart Packaging & Templating (`helm/devtrack`)
- **Chart Architecture**:
  - `helm/devtrack/Chart.yaml` defining chart version `0.1.0` and application version `1.0.0`.
  - `helm/devtrack/values.yaml` centralizing environment, replica counts, image tags, service ports, resource allocations, and ingress annotations.
  - `helm/devtrack/templates/_helpers.tpl` generating standardized Kubernetes labels (`helm.sh/chart`, `app.kubernetes.io/managed-by: Helm`, `app.kubernetes.io/part-of: devtrack`).
- **Templated Workloads**:
  - `templates/namespace.yaml`: Conditional or configurable namespace creation.
  - `templates/configmap.yaml` & `templates/secret.yaml`: Parameterized application runtime configuration and credentials.
  - `templates/postgres-pvc.yaml`, `postgres-deployment.yaml`, `postgres-service.yaml`: Persistent database stack with configurable storage and resource limits.
  - `templates/backend-deployment.yaml` & `backend-service.yaml`: 2-replica API deployment with probes and resource requests/limits.
  - `templates/frontend-deployment.yaml` & `frontend-service.yaml`: 2-replica UI deployment with probes and non-root security context.
  - `templates/ingress.yaml`: Flexible path-based Ingress routing with configurable annotations.
- **Verification**:
  - `helm lint helm/devtrack`: 0 chart(s) failed (`PASS`).
  - `helm template devtrack helm/devtrack`: Cleanly rendered all 11 Kubernetes manifests (`PASS`).
  - `helm package helm/devtrack -d helm/`: Successfully packaged release archive `helm/devtrack-0.1.0.tgz`.

### Module 5.6 — Health Probes, Rolling Updates & Troubleshooting Guide
- **Rolling Update Mechanics**:
  - `maxSurge: 1`, `maxUnavailable: 0` ensures zero-downtime rolling deployments by spinning up a new container and validating its readiness probe before terminating an old instance.
  - PostgreSQL uses `strategy: Recreate` to avoid ReadWriteOnce PVC volume lock contentions.
- **Probe Timing & Thresholds**:
  - Backend Liveness (`GET /health`): `initialDelaySeconds: 15`, `periodSeconds: 10`, `timeoutSeconds: 3`, `failureThreshold: 3`.
  - Backend Readiness (`GET /ready`): `initialDelaySeconds: 5`, `periodSeconds: 5`, `timeoutSeconds: 2`, `failureThreshold: 2`.
  - Frontend Probes (`GET /`): `initialDelaySeconds: 10` (liveness), `5` (readiness).
  - Postgres Probes (`exec: pg_isready -U postgres -d devtrack`): `initialDelaySeconds: 15` (liveness), `5` (readiness).
- **Kubernetes Diagnostic Workflow**:
  - Rollout tracking: `kubectl rollout status deployment/devtrack-backend -n devtrack`.
  - Rollback capability: `kubectl rollout undo deployment/devtrack-backend -n devtrack`.
  - Crash diagnosis: `kubectl describe pod <pod-name> -n devtrack` and `kubectl logs <pod-name> -n devtrack --previous`.

### Module 5.7 — Phase 5 Capstone Rubric Audit Table

| Rubric Requirement | Status | Verification & Evidence |
| :--- | :---: | :--- |
| **1. Dedicated Namespace** | ✅ Verified | `k8s/namespace.yaml` defines `devtrack` with standard Kubernetes labels. |
| **2. Multi-Replica Backend Workload** | ✅ Verified | `k8s/backend-deployment.yaml` specifies `replicas: 2`, `RollingUpdate` (`maxSurge: 1`, `maxUnavailable: 0`), non-root UID 1000, CPU/memory requests & limits, and liveness/readiness probes. |
| **3. Backend Service Exposure** | ✅ Verified | `k8s/backend-service.yaml` provides internal `ClusterIP` on port 8000. |
| **4. Multi-Replica Frontend Workload** | ✅ Verified | `k8s/frontend-deployment.yaml` specifies `replicas: 2`, unprivileged port 8080, non-root UID 101, and liveness/readiness probes. |
| **5. Frontend Service Exposure** | ✅ Verified | `k8s/frontend-service.yaml` provides internal `ClusterIP` on port 80 routing to container targetPort 8080. |
| **6. Stateful Database & Persistence** | ✅ Verified | `k8s/postgres-pvc.yaml` claims 1Gi RWO volume; `k8s/postgres-deployment.yaml` mounts volume with `strategy: Recreate` and `pg_isready` probes; `k8s/postgres-service.yaml` exposes port 5432. |
| **7. Configuration & Secrets Hygiene** | ✅ Verified | `k8s/configmap.yaml` separates non-sensitive environment keys; `k8s/secret.example.yaml` provides safe template; real secrets excluded via `.gitignore`. |
| **8. Ingress Path-Based Routing** | ✅ Verified | `k8s/ingress.yaml` routes `/` $\rightarrow$ `devtrack-frontend:80`, and `/api`, `/docs`, `/openapi.json` $\rightarrow$ `devtrack-backend:8000`. |
| **9. Reusable Helm Chart** | ✅ Verified | `helm/devtrack` includes `Chart.yaml`, `values.yaml`, `_helpers.tpl`, and complete templates. Passed `helm lint` and `helm template`. Packaged into `helm/devtrack-0.1.0.tgz`. |
| **10. Security Hardening** | ✅ Verified | All application workloads enforce `runAsNonRoot: true`, unprivileged user IDs, and `allowPrivilegeEscalation: false`. |

## Phase 4 & 5 Live Cloud Deployment & Validation (EKS Sydney `ap-southeast-2`)

### 1. AWS Provisioning Evidence
- **VPC ID**: `vpc-0b5a01107a7464a86` (`10.0.0.0/16`)
- **Public Subnets**: `subnet-0e18cd2e1e0a27700` (`ap-southeast-2a`), `subnet-0fb875614044780ee` (`ap-southeast-2b`)
- **Private Subnets**: `subnet-0c2f2501ce5d92171` (`ap-southeast-2a`), `subnet-044aed6bda4f59b19` (`ap-southeast-2b`)
- **NAT Gateway**: `nat-0120d7adb18ae9a60` with EIP `eipalloc-0fca3f4fb61b4e0ce`
- **EKS Cluster**: `devtrack-eks-cluster` (Kubernetes v1.30)
- **Worker Node Group**: `production-devtrack-managed-nodes` (2x `t3.medium`, AL2023 `AL2023_x86_64_STANDARD`)
- **Worker Nodes**:
  - `ip-10-0-10-155.ap-southeast-2.compute.internal` (`STATUS: Ready`)
  - `ip-10-0-11-119.ap-southeast-2.compute.internal` (`STATUS: Ready`)

### 2. Live Kubernetes Workloads Status
- **Namespace**: `devtrack`
- **Frontend Pods**: 2/2 Running (`devtrack-frontend-*`)
- **Backend Pods**: 2/2 Running (`devtrack-backend-*`)
- **PostgreSQL Pod**: 1/1 Running (`devtrack-postgres-*`)
- **Persistent Volume**: Bound dynamically via AWS EBS CSI driver (`gp2`, 1Gi, volume `pvc-c43c306e-5088-40a6-986a-92d40efa8ed1`)

### 3. End-to-End Application Validation
- **Health Probe**: `/health` returned `{"status":"healthy"}` (HTTP 200)
- **Readiness Probe**: `/ready` returned `{"status":"ready"}` with live database connectivity (HTTP 200)
- **Database Migrations**: Alembic revision `149d7d96f47b` applied cleanly in the cloud database
- **Data Persistence Verification**: Successfully created Issue #1 (`Deploy to AWS EKS`) via REST API and persisted to AWS EBS storage.

