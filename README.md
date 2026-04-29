# PART 1: Infrastructure Documentation

## Background

This project demonstrates the **containerization, configuration, and infrastructure setup** of a simple application with **sign-up and sign-in functionality**.

### Tech Stack

- **Frontend:** Next.js  
- **Backend:** .NET (C#)  
- **Database:** PostgreSQL  

---

# Task 1: Dockerize the Application

## Approach

To dockerize the application, I:

- Created **separate Dockerfiles** for:
  - Frontend (Next.js)
  - Backend (.NET API)
- Used **multi-stage builds** to reduce final image size
- Set up **Docker Compose** to orchestrate:
  - Frontend
  - Backend
  - Database
  - Nginx reverse proxy
- Stored configuration in a `.env` file (**no hardcoding of secrets**)
- Ensured the entire application starts with a single command:

```bash
docker-compose up
```
## Frontend Dockerfile (Next.js)

```FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

This Dockerfile uses a **multi-stage build** to create a **small, secure, and production-ready image**.

---

## Summary of Build Stages

> This Dockerfile uses a multi-stage build to produce a small, secure, and production-ready image by separating dependency installation, application build, and runtime execution.

> Dependencies stage installs exact versions of packages using npm ci, enabling faster and consistent builds with Docker layer caching.
> Build stage compiles the Next.js application into an optimized production bundle (.next/standalone and .next/static) while injecting environment variables at build time.
> Runtime stage creates a minimal image by copying only the required build output, setting production environment variables, and running the application as a non-root user for improved security.

Only essential files (standalone server, static assets, and public files) are included in the final image, reducing size and attack surface while ensuring efficient performance.

---

## Backend Dockerfile (.NET API)

---

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

COPY casestudy_api.sln ./
COPY casestudy_api/*.csproj ./casestudy_api/

RUN dotnet restore --no-cache

COPY . .

WORKDIR /src/casestudy_api

RUN dotnet publish -c Release -o /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/publish .

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080

ENTRYPOINT ["dotnet", "casestudy_api.dll"]
```

## Summary of Build Stages

> This Dockerfile uses a multi-stage build to create a small, secure, and production-ready image by separating the build environment from the runtime environment.

> Build stage restores dependencies and compiles the application into an optimized release build using dotnet publish, ensuring all required binaries are packaged into a single output directory.
> Runtime stage uses a lightweight ASP.NET runtime image and includes only the published application, excluding SDK tools and source code to reduce image size.

The container is configured to run as a non-root user for improved security, and only the necessary application files are included in the final image, resulting in a minimal, efficient, and production-ready deployment artifact.

## Nginx Reverse Proxy Configuration

Nginx is used as a **reverse proxy** to route incoming requests to the appropriate service:

* `/` → Frontend (Next.js)
* `/api`, `/swagger`, `/Authentication` → Backend (.NET API)

This provides a **single entry point** for the entire application.

---

##  nginx.conf (Template)

```nginx
upstream backend {
    server ${BACKEND_HOST}:${BACKEND_PORT};
}

upstream frontend {
    server ${FRONTEND_HOST}:${FRONTEND_PORT};
}

server {
    listen ${NGINX_PORT};

    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /swagger/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /Authentication/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

# Explanation

##  Upstream Services

```nginx
upstream backend {
    server ${BACKEND_HOST}:${BACKEND_PORT};
}

upstream frontend {
    server ${FRONTEND_HOST}:${FRONTEND_PORT};
}
```

* Defines backend and frontend services
* Uses environment variables for flexibility
* Allows Nginx to route traffic dynamically

---

##  Server Block

```nginx
server {
    listen ${NGINX_PORT};
}
```

* Nginx listens on a configurable port
* Acts as the **entry point** for all requests

---

##  API Routing

```nginx
location /api/ {
    proxy_pass http://${BACKEND_HOST}:${BACKEND_PORT};
}
```

* Routes all `/api` requests to the backend
* Ensures frontend communicates with backend via Nginx

---

##  Swagger Routing

```nginx
location /swagger/ {
    proxy_pass http://${BACKEND_HOST}:${BACKEND_PORT};
}
```

* Exposes backend API documentation through Nginx

---

##  Authentication Routing

```nginx
location /Authentication/ {
    proxy_pass http://${BACKEND_HOST}:${BACKEND_PORT};
}
```

* Routes authentication-related requests to backend

---

##  Frontend Routing

```nginx
location / {
    proxy_pass http://${FRONTEND_HOST}:${FRONTEND_PORT};
}
```

* Routes all other traffic to the frontend
* Serves the Next.js application

---

##  Headers and Proxy Settings

### Common headers used:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

* Preserve original client request information
* Important for logging, security, and debugging

---

### WebSocket Support (Frontend)

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

* Enables support for WebSockets (used by Next.js)

---

#  Why Nginx is Used

* Provides a **single access point** for all services
* Simplifies frontend-backend communication
* Handles routing and request forwarding
* Improves scalability and maintainability

---

#  Final Outcome

* Frontend and backend are accessible through one URL
* Clean separation of concerns
* No direct exposure of internal services
* Environment-based configuration (no hardcoding)


### Docker Compose Setup

This project uses **Docker Compose** to orchestrate all services required to run the application locally.

The setup includes:

*  PostgreSQL database
*  Backend (.NET API)
*  Frontend (Next.js)
*  Nginx reverse proxy

All services are connected through a shared Docker network and configured using environment variables from a `.env` file.

##  docker-compose.yml

```yaml
services:
  db:
    container_name: ${POSTGRES_DB}
    env_file:
      - .env
    image: postgres:${POSTGRES_MAJOR_VERSION}.${POSTGRES_MINOR_VERSION}
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "${POSTGRES_PORT}:${POSTGRES_PORT}"
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}" ]
      interval: 30s
      retries: 5
      start_period: 80s
      timeout: 60s
    volumes:
      - db-data:/var/lib/postgresql
    networks:
      - casestudy-bridge

  backend:
    container_name: casestudy_backend
    build:
      context: ./Backend/casestudy_api/
      dockerfile: Dockerfile
    env_file:
      - .env
    environment:
      DOTNET_RUNNING_IN_CONTAINER: "true"
      ASPNETCORE_URLS: http://+:${BACKEND_PORT}
    ports:
      - "${BACKEND_PORT}:${BACKEND_PORT}"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - casestudy-bridge
    restart: always

  frontend:
    container_name: casestudy_frontend
    build:
      context: ./my-app
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    env_file:
      - .env
    ports:
      - "${FRONTEND_PORT}:${FRONTEND_PORT}"
    depends_on:
      - backend
    networks:
      - casestudy-bridge
    restart: always

  nginx:
    container_name: casestudy_nginx
    image: nginx:alpine
    ports:
      - "${EXT_NGINX_PORT}:${NGINX_PORT}"
    volumes:
      - ./nginx/nginx.conf.template:/etc/nginx/templates/default.conf.template:ro
    environment:
      - BACKEND_HOST=${BACKEND_HOST}
      - BACKEND_PORT=${BACKEND_PORT}
      - FRONTEND_HOST=${FRONTEND_HOST}
      - FRONTEND_PORT=${FRONTEND_PORT}
      - NGINX_PORT=${NGINX_PORT}
    depends_on:
      - backend
      - frontend
    networks:
      - casestudy-bridge
    restart: always

volumes:
  db-data:
  redis_data:

networks:
  casestudy-bridge:
```

---

#  Explanation of Services

##  Database Service (`db`)

* Uses **PostgreSQL image**
* Loads configuration from `.env`
* Stores persistent data using a Docker volume (`db-data`)
* Includes a **healthcheck** to ensure the database is ready before other services start

### Key Features

* Automatic restart (`restart: always`)
* Data persistence via volumes
* Health check using `pg_isready`

---

##  Backend Service (`backend`)

* Builds the .NET API from the local Dockerfile
* Uses environment variables from `.env`
* Waits for the database to be ready before starting

### Key Features

* Depends on database (`depends_on`)
* Exposes backend API port
* Runs inside the same network as other services

---

##  Frontend Service (`frontend`)

* Builds the Next.js app from its Dockerfile
* Injects API URL using build arguments
* Depends on the backend service

### Key Features

* Uses environment variables
* Connects to backend via internal Docker network
* Exposes frontend port

---

##  Nginx Service (`nginx`)

* Acts as a **reverse proxy**
* Routes traffic between frontend and backend

### Key Features

* Uses `nginx:alpine` (lightweight)
* Loads configuration from a template file
* Uses environment variables to dynamically configure routing

---

#  Networking

```yaml
networks:
  casestudy-bridge:
```

* All services are connected to a shared network
* Enables communication using service names (e.g., `backend`, `db`)

---

#  Volumes

```yaml
volumes:
  db-data:
```

* Ensures PostgreSQL data persists across container restarts

---

#  Environment Variables

All sensitive and environment-specific values are stored in a `.env` file.

#  Docker Build Optimization (.dockerignore Strategy)

To improve Docker build performance and ensure clean production images, both the frontend and backend use optimized `.dockerignore` files.

These files reduce the build context size by excluding unnecessary files from being sent to Docker during image creation.

---

##  What is excluded

- Build artifacts (`bin/`, `obj/`, `.next/`, `out/`)
- Dependencies (`node_modules/`)
- Environment files (`.env*`)
- Logs and debug files (`*.log`)
- IDE/editor files (`.vscode/`, `.idea/`, `.vs/`)
- Operating system files (`.DS_Store`, `Thumbs.db`)
- Git metadata (`.git`)

---

##  Why this matters

- Reduces Docker build time  
- Minimizes image size  
- Prevents leaking sensitive or local development files  
- Improves caching efficiency during builds  
- Ensures only production-relevant files are included  

---

##  Result

This optimization ensures a faster, cleaner, and more secure container build process aligned with production best practices.

> This setup provides a complete, reproducible local development environment with a single command.

#  Running the Application

Start all services with a single command:

```bash
docker-compose up --build
```

---

#  Expected Outcome

* All containers start successfully
* Services communicate via Docker network
* Application accessible via Nginx
* No secrets are hardcoded

---

# Enterprise Azure DevOps CI/CD Pipeline Documentation

## Overview

This pipeline implements a production-grade CI/CD workflow for a containerized application deployed to Azure. It prioritizes:

* Code quality
* Security at every stage
* Automated deployments
* Safe production releases
* Automatic rollback
* Full traceability

---

## Pipeline Triggers

The pipeline automatically runs when code is pushed to:

* `develop`
* `main`

It also validates pull requests targeting these branches.

```yaml
trigger:
  branches:
    include:
      - main
      - develop

pr:
  branches:
    include:
      - main
      - develop
```

### Why This Matters

* Prevents unvalidated code from entering important branches.
* Ensures every change is tested automatically.
* Provides immediate feedback during development.

---

## Variable Management

```yaml
variables:
  - group: casestudy-variable-group
```

### Recommended Variables

| Variable                   | Purpose                    |
| -------------------------- | -------------------------- |
| `AZURE_SERVICE_CONNECTION` | Azure authentication       |
| `AZURE_RESOURCE_GROUP`     | Azure resource group       |
| `ACR_REGISTRY`             | Container registry URL     |
| `ACR_LOGIN_SERVER`         | Registry login server      |
| `STAGING_URL`              | Staging application URL    |
| `PRODUCTION_URL`           | Production application URL |

Mark all secrets (passwords, tokens, keys) as secret variables inside the variable group.

---

## Image Tagging Strategy

Each Docker image is tagged using the Git commit SHA.

```yaml
variables:
- name: IMAGE_TAG
  value: $(Build.SourceVersion)
```

### Why This Matters

* Every deployment is fully traceable.
* Rollbacks become simple.
* Images remain immutable.
* Auditing is straightforward.

---

## Pipeline Stages

## 1. Lint, Test & Code Coverage

### Purpose

Validates code quality before any build or deployment occurs.

### What Happens

* Backend linting
* Frontend linting
* Unit tests
* Code coverage collection

### Quality Gate

The pipeline fails if coverage drops below 70%.

```bash
echo "##vso[task.logissue type=error]Code coverage is below 70%."
```

---

## 2. Software Composition Analysis (SCA)

### Purpose

Scans third-party dependencies for known vulnerabilities.

### Tools

* `npm audit`
* NuGet vulnerability scanning
* OWASP Dependency Check

---

## 3. Static Application Security Testing (SAST)

### Purpose

Scans source code for security weaknesses.

### Tool

* Microsoft Security DevOps

### Detects

* SQL injection risks
* Hardcoded secrets
* Unsafe coding patterns
* Security misconfigurations

---

## 4. Build & Push Docker Images

### Purpose

Builds production-ready container images.

### What Happens

* Build backend image
* Build frontend image
* Push both images to Azure Container Registry

---

## 5. Container Vulnerability Scan

### Purpose

Scans Docker images before deployment.

### Tool

* Trivy

### Security Gate

Deployment stops if HIGH or CRITICAL vulnerabilities are found.

### Example Configuration

```yaml
- script: |
    trivy image \
      --severity HIGH,CRITICAL \
      --exit-code 1 \
      $(ACR_LOGIN_SERVER)/backend:$(IMAGE_TAG)
  displayName: Scan Backend Container
```

### How It Works

* `--severity HIGH,CRITICAL` scans only serious vulnerabilities.
* `--exit-code 1` fails the pipeline if any are detected.
* Prevents insecure images from being deployed.

---

## 6. Deploy to Staging

### Purpose

Deploys the application to a safe validation environment.

---

## 7. Dynamic Application Security Testing (DAST)

### Purpose

Tests the live staging application.

### Detects

* Authentication weaknesses
* Missing security headers
* Runtime vulnerabilities
* Session management issues

### Key Difference

Unlike SAST, DAST tests the running application.

---

## 8. Manual Approval Gate

### Purpose

Requires human approval before production deployment.

### Why It Matters

* Prevents accidental releases.
* Adds executive or operations oversight.
* Supports compliance requirements.
* Provides a final verification checkpoint.

### How to Configure

1. Open Azure DevOps.
2. Navigate to **Pipelines > Environments**.
3. Select the Production environment.
4. Click **Approvals and Checks**.
5. Add an **Approval** check.
6. Specify approvers.
7. Save the configuration.

### Enforcement Flow

```text
Deploy to Staging
       │
       ▼
    DAST Passes
       │
       ▼
 Manual Approval Required
       │
       ▼
 Deploy to Production
```

Production deployment cannot proceed until an authorized approver approves the release.

---

## 9. Deploy to Production

### Conditions

Production deployment occurs only when:

* All previous stages succeed.
* Manual approval is granted.
* The branch is `main`.

```yaml
condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
```

---

## 10. Automatic Rollback

### When It Runs

If production deployment fails.

```yaml
condition: failed()
```

### Rollback Strategy

1. Download previous deployment artifact.
2. Read the last successful image tag.
3. Roll back backend.
4. Roll back frontend.
5. Restore service automatically.

### Rollback Workflow

```text
Production Failure
       │
       ▼
Download Previous Tag
       │
       ▼
Read Image Version
       │
       ▼
Rollback Backend
       │
       ▼
Rollback Frontend
       │
       ▼
Service Restored
```

### Benefits

* Recovery in minutes
* No manual intervention
* Reduced downtime
* Safer releases

---

## Security Gates

Every stage acts as a deployment gate.

| Stage           | Blocks Deployment on Failure |
| --------------- | ---------------------------- |
| Lint/Test       | Yes                          |
| SCA             | Yes                          |
| SAST            | Yes                          |
| Container Scan  | Yes                          |
| DAST            | Yes                          |
| Manual Approval | Yes                          |

No insecure or unstable code reaches production.

---

## Deployment Strategy

| Branch    | Environment |
| --------- | ----------- |
| `develop` | Staging     |
| `main`    | Production  |

This enables safe progressive delivery.

---

## Artifacts Generated

The pipeline stores:

* Test reports
* Coverage reports
* SCA results
* SAST results
* Container scan reports
* DAST reports
* Deployment image tags

### Why These Matter

* Auditing, Compliance, Troubleshooting, Rollbacks, Historical analysis

---

---

## Best Practices Implemented

* Shift-left security
* Immutable deployments
* Automated testing
* Security at every stage
* Manual production approval
* Automatic rollback
* Secure secret management
* Environment isolation

---

## Final Summary

This pipeline delivers enterprise-grade software delivery by combining:

* Continuous Integration, Continuous Delivery, Security Automation, Governance Controls, Operational Resilience

It ensures that only secure, tested, approved, and traceable code reaches production.



# Assumptions & Future Improvements

## Assumptions

### 1. Consistent Container Runtime Environment
Docker is available and supported across development, staging, and production environments, ensuring consistent builds and deployments.

### 2. Application is Container-Ready
Both frontend and backend services can be containerized without requiring major architectural changes.

### 3. Environment-Based Configuration is Supported
The application can safely consume configuration via environment variables (`.env`) without relying on hardcoded values.

### 4. Database Fits Containerized Development Model
PostgreSQL can run reliably in a containerized setup for development and testing, with persistence handled via Docker volumes.

### 5. Network Communication Within Containers is Reliable
Services within the Docker network can communicate using service names (e.g., `backend`, `db`) without additional networking complexity.

### 6. CI/CD Pipeline Has Access to Required Resources
The pipeline can:
- Build Docker images  
- Access a container registry (e.g., Docker Hub, Azure Container Registry)  
- Deploy to the target environment  

### 7. Basic DevOps Tooling is Available
The team can manage:
- Docker and Docker Compose  
- CI/CD pipelines  
- Basic debugging and logging  

### 8. Security Practices Can Be Gradually Introduced
Sensitive data (API keys, DB credentials) can be moved to secure storage (e.g., pipeline secrets, secret managers) without blocking current development workflows.

### 9. Build and Deployment Artifacts are Immutable
Docker images are treated as immutable artifacts, enabling consistent deployments and easier rollbacks.

### 10. Local and CI Environments are Aligned
The same Docker-based setup used locally (`docker-compose`) closely mirrors the CI/CD and deployment environments, reducing environment-specific issues.


---

## Improvement With More Time

### 1. Centralized Observability Across All Markets

Introduce a full observability stack to unify monitoring, logging, and tracing:

- **Metrics:** Prometheus  
- **Visualization:** Grafana  
- **Logging:** ELK Stack
- **Tracing:** OpenTelemetry  

#### Why This Matters

- Moves the team from **reactive** (customer complaints) to **proactive** (automated alerts)
- Enables **fast root cause analysis** (minutes instead of hours)

---

### 2. Transition to Kubernetes for Production

Evolve from Docker Compose to a container orchestration platform like Kubernetes (or K3s for simplicity).

#### Benefits

- **Auto-scaling:** Handle salary-date traffic spikes automatically  
- **Self-healing:** Restart failed services without manual intervention  
- **Rolling deployments & fast rollbacks:** Safer releases across all deployements   

---

## Summary

The current solution provides a strong, secure, and scalable foundation. With centralized observability and Kubernetes-based orchestration, it can evolve into a highly resilient, enterprise-grade platform capable of handling multi-market financial workloads reliably.


