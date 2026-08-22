# BookNest — Production-Minded Reading Tracker

BookNest is a reading-tracker web application built with Python (FastAPI), Next.js (React/TypeScript), PostgreSQL, and WebSockets.

Designed and architected to demonstrate:
- Relational data modeling (many-to-many, junction tables, referential integrity)
- Backend-enforced RBAC (`OWNER`, `EDITOR`, `VIEWER` on shared shelves)
- Transactional cross-user state (lending with concurrency-safe uniqueness constraints)
- Authenticated, room-scoped WebSockets (`user:{id}`, `shelf:{id}`)
- Event-driven activity logging
- Production-grade authentication (Argon2 password hashing + JWT access/refresh token rotation)

## Architecture Overview

```text
                    CLIENT (Next.js App Router)
                               |
               +---------------+---------------+
               |                               |
            REST API                       WebSocket
               |                               |
               +---------------+---------------+
                               |
                        FASTAPI BACKEND
                               |
        +----------------------+----------------------+
        |                      |                      |
     Auth/RBAC               Domain               Event System
        |                      |                      |
        |              +-------+-------+              |
        |              |       |       |              |
        |            Books   Shelves Lending          |
        |              |       |       |              |
        |              +-------+-------+              |
        |                      |                      |
        +----------------------+----------------------+
                               |
                           PostgreSQL
```

## Directory Layout

- `backend/` — FastAPI backend service (layered REST API → Services → Repositories → PostgreSQL models)
- `frontend/` — Next.js 14 frontend organized by domain (`features/auth`, `features/books`, `features/shelves`, `features/lending`, `features/dashboard`, `features/activity`)
- `AGENTS.md` — BookNest Engineering Constitution & architectural invariants
- `CLAUDE.md` — Live working memory & current project status
- `PHASE_PROMPTS.md` — Step-by-step execution roadmap

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ / npm
- PostgreSQL

### Local Development

1. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Development & Tooling

- **Backend Linting & Formatting**: `ruff check backend/` / `ruff format backend/`
- **Frontend Linting**: `npm run lint` inside `frontend/`
- **Tests**: `pytest` inside `backend/`
