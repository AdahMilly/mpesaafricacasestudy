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
