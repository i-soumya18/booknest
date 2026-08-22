# BookNest — Production-Minded Reading Tracker

BookNest is a full-stack reading-tracker application where users can manage their personal book libraries, create and share shelves with fine-grained role-based access control, lend books to other users with real-time notifications, and track reading progress with automatic status transitions.

Built as a coding assessment to demonstrate real-world backend and frontend engineering: relational data modeling, JWT authentication with refresh-token rotation, backend-enforced RBAC, transactional lending with concurrency-safe uniqueness constraints, authenticated WebSocket rooms, event-driven activity logging, and a live-updating dashboard.

---

## Table of Contents

1. [What the App Does](#1-what-the-app-does)
2. [How to Run It (Clean Clone)](#2-how-to-run-it-clean-clone)
3. [Seed Data](#3-seed-data)
4. [Data Model](#4-data-model)
5. [Stack & Rationale](#5-stack--rationale)
6. [Refresh-Token Flow](#6-refresh-token-flow)
7. [RBAC Enforcement](#7-rbac-enforcement)
8. [WebSocket Setup](#8-websocket-setup)
9. [What Was Hard](#9-what-was-hard)
10. [Known Issues](#10-known-issues)
11. [Future Improvements](#11-future-improvements)
12. [AI Usage](#12-ai-usage)

---

## 1. What the App Does

- **Book Library** — Add, update, delete, and search books with rich metadata (title, author, ISBN, cover image URL, notes, total pages, rating). Filter by status (`WANT_TO_READ`, `READING`, `FINISHED`, `DNF`), search by title/author, sort by rating or date.
- **Reading Progress** — Track current page; the backend auto-calculates percentage and auto-transitions book status to `FINISHED` when `current_page == total_pages`.
- **Shelves** — Create named collections of books. Shelves support a many-to-many `shelf_books` junction with explicit `added_at` timestamps.
- **Shared Shelves + RBAC** — Invite other users to a shelf as `EDITOR` (can add/remove books) or `VIEWER` (read-only). Only the `OWNER` can rename/delete the shelf or manage collaborators. The role is enforced at the API layer — a Viewer that attempts `POST /shelves/{id}/books/{book_id}` directly receives `403 INSUFFICIENT_SHELF_PERMISSIONS`.
- **Lending** — Book owners lend books to registered borrowers by email. A PostgreSQL partial unique index (`UNIQUE(book_id) WHERE returned_at IS NULL`) makes double-lending impossible even under concurrent requests. Borrowers get a read-only view of borrowed books.
- **Real-Time Notifications** — Every domain mutation (lending, returning, shelf book changes, collaborator changes, progress updates) is dispatched as a `DomainEvent` and routed over authenticated WebSocket rooms (`user:{id}`, `shelf:{id}`) to relevant users without polling.
- **Activity Feed** — A reverse-chronological log of all domain events (`BOOK_ADDED`, `BOOK_LENT`, `SHELF_SHARED`, `COLLABORATOR_ROLE_CHANGED`, etc.) stored in `activity_events` and rendered live on the frontend.
- **Dashboard** — Aggregate metrics computed directly from the live database state: total books, books by status, finished this year, average rating, most-populated shelf, active lendings, shelves shared with the user, and recent activity.

---

## 2. How to Run It (Clean Clone)

### Prerequisites

- Python 3.11+
- Node.js 18+ / npm
- PostgreSQL 14+ running locally

### 1. Clone & Environment

```bash
git clone <repo-url>
cd booknest
cp .env.example .env
```

Edit `.env` and set:
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/booknest
JWT_SECRET=your-secret-at-least-32-chars-long
```

### 2. Create the Database

```bash
psql -U postgres -c "CREATE DATABASE booknest;"
```

### 3. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run database migrations:
```bash
alembic upgrade head
```

Start the server:
```bash
uvicorn app.main:app --reload --port 8000
```

API will be available at `http://localhost:8000`.
Interactive API docs at `http://localhost:8000/docs`.

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:3000`.

### 5. Run the Test Suite

```bash
cd backend
.venv/bin/pytest
# 53 tests, all passing
```

---

## 3. Seed Data

To populate a ready-to-demo database without manually creating users and data:

```bash
cd backend
.venv/bin/python scripts/seed.py
```

This creates:

| User | Email | Password | Role |
|---|---|---|---|
| Alice Owner | `alice@example.com` | `Password123!` | Primary owner |
| Bob Borrower | `bob@example.com` | `Password123!` | Editor on *Tech Classics*, borrower |
| Charlie Viewer | `charlie@example.com` | `Password123!` | Viewer on *Tech Classics* |

**What gets seeded:**
- 5 books for Alice across all reading statuses (WANT_TO_READ, READING, FINISHED)
- 3 books for Bob
- 4 shelves: *Tech Classics* (Alice owns, Bob=Editor, Charlie=Viewer), *System Design* (Alice owns, Bob=Viewer), *Alice's Favorites* (private), *DevOps Essentials* (Bob owns, Alice=Editor)
- 1 active lending: Alice has lent *"Refactoring"* to Bob
- Pre-populated activity events for immediate feed content

The script is **idempotent** — re-running it on an already-seeded database is a no-op.

---

## 4. Data Model

### ER Diagram

![ER Diagram](Diagrams/ER%20Diagram.png)

### Database Schema

![Database Schema](Diagrams/Database%20Schema.png)

### Key Tables

| Table | Purpose |
|---|---|
| `users` | User accounts. Passwords stored as Argon2id hashes, never plaintext. |
| `refresh_tokens` | One row per issued refresh token. Stores a hashed token + `family_id` for rotation. |
| `books` | User-owned books. `status` is an enum. `owner_id` FK to `users`. |
| `shelves` | Named collections owned by a user. |
| `shelf_books` | Junction table — many-to-many between `shelves` and `books`, with `added_at`. |
| `shelf_collaborators` | Junction table — many-to-many between `shelves` and `users`. `role` column: `OWNER / EDITOR / VIEWER`. |
| `lendings` | Book lending records. `returned_at IS NULL` = active. A partial unique index on `(book_id) WHERE returned_at IS NULL` enforces one-active-lending-per-book at the DB level. |
| `reading_progress` | Per-user, per-book progress tracking (`current_page`, `percentage_complete`). |
| `activity_events` | Append-only domain event log. `event_type`, `actor_id`, `book_id`, `shelf_id`, `target_user_id`, `payload` (JSONB). |

### Critical Constraints

- `CHECK (owner_id != borrower_id)` on `lendings` — prevents self-lending in the DB itself.
- `UNIQUE (book_id) WHERE returned_at IS NULL` on `lendings` — makes concurrent double-lending impossible without application-level locking.
- `CASCADE DELETE` chains: deleting a user deletes their books, shelves, collaborator entries, and refresh tokens.

---

## 5. Stack & Rationale

### Backend

| Technology | Reason |
|---|---|
| **FastAPI** | Native async, automatic OpenAPI docs, Pydantic validation throughout, WebSocket support built-in. |
| **SQLAlchemy 2.0 (async)** | Type-safe ORM with native `asyncpg` support. Declarative models with explicit relationship mapping make the data model self-documenting. |
| **Alembic** | SQL-level migration tracking, keeps schema and ORM models in sync. |
| **PostgreSQL** | JSONB for activity event payload, partial unique indexes (concurrency-safe lending), `CASCADE DELETE` for referential integrity. |
| **Argon2id** | Current OWASP-recommended password hashing algorithm. argon2-cffi wraps the reference C implementation. |
| **PyJWT** | JWT access tokens (short-lived, 15 min), refresh tokens with rotation (30-day, stored as hashed cookies). |

### Frontend

| Technology | Reason |
|---|---|
| **Next.js 14 (App Router)** | React 18 server/client component model, TypeScript throughout, built-in fetch with caching. |
| **Vanilla CSS Modules** | Zero dependency, co-located with components, no runtime overhead. Preferred over Tailwind for full visual control. |
| **WebSocket (native browser API)** | No library needed for event subscription; reconnect logic is lightweight and explicit. |

### Architecture

![High-Level System Architecture](Diagrams/High-Level%20System%20Architecture.png)

![Final Architecture](Diagrams/Final%20Architecture.png)

The backend is layered: `API Router → Service → Repository → SQLAlchemy Model`. Services own transactions. Repositories own queries. The API layer does not touch the database directly. Every domain mutation publishes a `DomainEvent` through a central `EventDispatcher` which fans out to (1) the Activity Log writer and (2) the WebSocket router — without the domain service needing to know about either subscriber.

![Complete End-to-End Data Flow Diagram](Diagrams/Complete%20End-to-End%20Data%20Flow%20Diagram.png)

---

## 6. Refresh-Token Flow

### What Is Stored Where

| Token | Storage | Lifetime | Content |
|---|---|---|---|
| **Access token** | Frontend memory (`useState`) / `Authorization: Bearer` header | 15 minutes | JWT with `sub` (user UUID), `exp`, `iat` |
| **Refresh token** | `HttpOnly; Secure; SameSite=Strict` cookie (`refresh_token`) | 30 days | Opaque random token (the JWT-signed value is hashed before DB storage) |

The raw refresh token is **never stored in the database** — only its Argon2 hash plus a `family_id` UUID are stored, so a database leak cannot be used to forge sessions.

### Rotation Flow

```
1. POST /auth/login
   → Server issues access_token (JWT) + refresh_token (cookie)
   → Stores hashed(refresh_token) + family_id in refresh_tokens table

2. POST /auth/refresh (before access_token expires)
   → Server validates cookie token against stored hash
   → Issues NEW access_token + NEW refresh_token (new cookie)
   → Deletes OLD refresh_token row
   → Stores NEW hashed(refresh_token) with same family_id

3. Refresh token used twice (replay attack)
   → Server detects the old hash is gone (deleted after rotation)
   → Immediately invalidates the ENTIRE token family (all tokens with same family_id)
   → Returns 401; user must log in again

4. POST /auth/logout
   → Deletes the current refresh_token row from DB
   → Clears the cookie
```

![Authentication Sequence Diagram](Diagrams/Authentication%20Sequence%20Diagram.png)

### On Expiry

If the access token expires and the refresh token is also expired (or absent), `POST /auth/refresh` returns `401`. The frontend handles this by redirecting to `/login`. No silent token recycling occurs.

---

## 7. RBAC Enforcement

### Roles

| Role | Can Read Shelf | Can Add/Remove Books | Can Rename Shelf | Can Delete Shelf | Can Manage Collaborators |
|---|---|---|---|---|---|
| `OWNER` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `EDITOR` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `VIEWER` | ✅ | ❌ | ❌ | ❌ | ❌ |
| *(non-member)* | ❌ (404) | ❌ (404) | ❌ (404) | ❌ (404) | ❌ (404) |

Non-members receive `404 Not Found` rather than `403 Forbidden` to avoid shelf enumeration.

### How RBAC Is Enforced

Every shelf endpoint resolves the requesting user's effective role from `shelf_collaborators` before executing any mutation:

```python
# In ShelfService (before any write operation):
collab = await shelf_repo.get_collaborator(shelf_id=shelf_id, user_id=actor_id)
effective_role = collab.role if collab else None  # None = non-member → 404
if effective_role not in ALLOWED_ROLES_FOR_ACTION:
    raise InsufficientPermissionsError(code="INSUFFICIENT_SHELF_PERMISSIONS")
```

### Direct API Rejection Example

A Viewer making a direct API call (bypassing the frontend):
```bash
curl -X POST http://localhost:8000/api/v1/shelves/{shelf_id}/books/{book_id} \
  -H "Authorization: Bearer <viewer_access_token>"
# → 403 {"error": {"code": "INSUFFICIENT_SHELF_PERMISSIONS", "message": "..."}}
```

This is a database-backed check on every request, not a frontend-only guard.

![RBAC Authorization Flow](Diagrams/RBAC%20Authorization%20Flow.png)

---

## 8. WebSocket Setup

### Authentication

The WebSocket handshake authenticates via a JWT access token passed as a query parameter:
```
ws://localhost:8000/api/v1/ws?token=<access_token>
```

On connection, the server:
1. Validates the JWT (signature, expiry, `sub` claim).
2. Looks up the user in the database.
3. Computes the full set of authorized rooms from the DB: `user:{user_id}` + `shelf:{id}` for every shelf the user owns or is a collaborator on.
4. Joins the socket to those rooms server-side.
5. **Never** trusts or processes a client-supplied room ID.

If the token is missing or invalid, the server closes the socket with code `1008 (Policy Violation)`.

### Event Scoping / Room Architecture

```
Domain Mutation
     ↓
DomainEvent published
     ↓
EventDispatcher fans out to:
  ┌── ActivityLogHandler  → writes to activity_events table
  └── WebSocketRouter     → sends to target rooms:
         user:{actor_id}         (always)
         user:{target_user_id}   (lending, collaborator events)
         shelf:{shelf_id}        (shelf book / collaborator changes)
```

A user in `shelf:{id}` receives events for that shelf only if they were already authorized at connection time. A user who is later removed as a collaborator will stop receiving future shelf events on reconnect — there is no mid-session room revocation (see Known Issues).

![WebSocket Architecture](Diagrams/WebSocket%20Architecture.png)

![Event-Driven Architecture](Diagrams/Event-Driven%20Architecture.png)

![Activity Feed Data Flow](Diagrams/Activity%20Feed%20Data%20Flow.png)

### Disconnect / Reconnect

The frontend WebSocket client uses exponential backoff reconnect with jitter (max 5 attempts before surfacing a "Connection lost" error to the user). On each reconnect, a fresh JWT is sent and server-side room membership is recomputed from the current database state — so a user who lost a shelf collaboration while disconnected will correctly be excluded from that shelf's room on reconnect.

---

## 9. What Was Hard

### 1. Lending Concurrency without Application-Level Locks

The requirement that a book can only have one active lending at a time seems simple until you consider concurrent `POST /lendings` requests. An application-level check (`SELECT + INSERT`) is a TOCTOU race. The solution was a **PostgreSQL partial unique index**:

```sql
CREATE UNIQUE INDEX idx_lendings_active_book
  ON lendings(book_id)
  WHERE returned_at IS NULL;
```

This makes the DB the enforcement point — two concurrent inserts for the same `book_id` with `returned_at = NULL` will result in exactly one succeeding and the other getting a `UniqueViolationError` that the service layer catches and re-raises as `HTTP 409 BOOK_ALREADY_LENT`. This works correctly under any concurrency model without needing `SELECT FOR UPDATE` or explicit locking.

### 2. WebSocket Room Membership Without Mid-Session Revocation

Computing rooms at connection time is simple, but it means a Viewer whose role is revoked mid-session keeps their existing socket room memberships until they disconnect. A fully correct solution would require broadcasting a `COLLABORATOR_REMOVED` event and having the server forcibly remove the affected socket from the room. This works correctly today because the client re-authenticates on each reconnect, but the gap exists within a single session.

### 3. Refresh Token Rotation with Replay Detection

Storing the full token in the database would let a DB leak compromise sessions. Storing only a hash (Argon2) and `family_id` means rotation is: hash new token, insert, delete old hash. A replayed old token fails because its hash is gone. The family-invalidation on replay (deleting all rows with `family_id`) required careful thought about the failure mode: if a legitimate client's rotation response is lost in transit, they'll replay the old token and trigger full family invalidation. This is intentionally conservative — it forces re-login on ambiguous replay rather than silently accepting a potentially stolen token.

---

## 10. Known Issues

- **Mid-session RBAC revocation not propagated over WebSocket**: If a collaborator's role is revoked while they have an open WebSocket connection, their existing socket remains in the `shelf:{id}` room until they disconnect. They will stop receiving shelf events after the next reconnect, but not immediately. Mitigation: emit `COLLABORATOR_REMOVED` events and handle them client-side to close the socket.

- **No pagination on activity feed or shelves list**: The `/activity` and `/shelves` endpoints return all records. For the assessment scope this is acceptable, but for production these would need cursor-based pagination.

- **WebSocket token expiry handling**: If the JWT passed at connection time expires while the socket is open, the server does not proactively close the socket. The connection stays alive until the client disconnects. On reconnect with an expired token, the server correctly rejects it. A production implementation would add server-side JWT expiry enforcement via periodic checks or a dedicated keep-alive/auth-refresh flow.

- **Seed script targets production DB by default**: Running `python scripts/seed.py` connects to the `DATABASE_URL` in `.env`, which is the production/local PostgreSQL instance. There is no separate `--env` flag to target a test database. Running it against a fresh clone with an empty database is safe; running it against an existing seeded database is a no-op.

---

## 11. Future Improvements

- **Cursor-based pagination** on all list endpoints (books, shelves, activity, lendings).
- **WebSocket session refresh** — re-validate JWT expiry on the open socket and close gracefully with `4001` when expired.
- **Mid-session room revocation** — broadcast `COLLABORATOR_REMOVED` and server-side remove socket from room immediately.
- **Book cover image uploads** — currently `cover_image_url` is a URL field. A proper upload flow with S3/GCS + presigned URLs would replace this.
- **Email notifications** — borrow/return events could trigger transactional email via SendGrid/Postmark.
- **Docker Compose** — single `docker compose up` to start PostgreSQL, backend, and frontend together.
- **Rate limiting** on auth endpoints (`/signup`, `/login`, `/refresh`) to mitigate brute-force attacks.
- **Audit log immutability** — currently `activity_events` rows can be deleted by DB admin. An append-only table policy or row-level security would enforce immutability.

---

## 12. AI Usage

This project was built with significant AI assistance (Google Gemini / Antigravity IDE). The following is an honest account of where it was used, what was learned, and what was changed:

### Where AI Was Used

- **Architecture & Phase Planning**: The project was broken into 19 phases with an `AGENTS.md` engineering constitution. AI was used to structure these phases, identify ordering dependencies (e.g. RBAC must precede activity events which must precede WebSocket routing), and write the phase prompts themselves.

- **Boilerplate generation**: SQLAlchemy model definitions, Alembic migration stubs, FastAPI route skeletons, and Pydantic schema definitions were drafted by AI and then reviewed and corrected. This was correct roughly 80% of the time with the remaining 20% requiring manual fixes for things like import paths, enum naming conventions, and relationship cascade configurations.

- **Test suite**: The critical-path test suite was AI-generated from the test plan in `AGENTS.md §33`. The test names follow the business-rule convention specified in §34 (`test_viewer_cannot_add_book_to_shared_shelf`, etc.). Several tests required human correction for fixture setup ordering and for understanding that the test SQLite database uses `aiosqlite` rather than `asyncpg`.

- **Frontend component structure**: The Next.js feature-folder structure and initial component shells (loading/success/empty/error states, form validation error badges, disabled button states) were generated by AI. The CSS design system and color palette were iteratively refined through prompts.

- **Debugging**: Import resolution errors (e.g. `BookStatusEnum` living in `app.schemas.book` not `app.models.book`), SQLite vs PostgreSQL partial-index incompatibilities in the test environment, and WebSocket room-membership computation bugs were diagnosed by AI after I described the error output.

### What Was Learned

- PostgreSQL **partial unique indexes** can replace application-level locking for single-active-constraint patterns — the AI suggested this approach and explained why TOCTOU made the naive check unsafe.
- **Refresh token family invalidation** on replay is the correct threat model, even though it means legitimate clients get logged out on ambiguous retransmission. AI helped reason through why silent acceptance is worse.
- The **layered architecture** (API → Service → Repository) with an `EventDispatcher` fan-out is cleaner than embedding activity logging inside service methods — keeping services unaware of who subscribes to their events.

### What Was Changed from AI Output

- The AI initially placed JWT verification inside the repository layer. This was moved to `app/api/dependencies.py` as a FastAPI dependency, which is the correct FastAPI pattern.
- Generated Alembic migrations sometimes used `String(255)` for enum columns. These were corrected to PostgreSQL-native `ENUM` types in the final schema.
- The AI suggested storing refresh tokens as plain JWTs in the database. This was changed to hash-only storage (Argon2) to limit the blast radius of a database leak.
- Several frontend components initially used browser `alert()` for error display. These were replaced with inline error callout components as part of Phase 13 — the AI-generated version was corrected to match the §25 UX requirements.

---

## Directory Layout

```
booknest/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (auth, books, shelves, lending, progress, activity, dashboard, ws)
│   │   ├── auth/         # Argon2id hashing, JWT encode/decode, refresh token logic
│   │   ├── db/           # SQLAlchemy async engine & session factory
│   │   ├── events/       # DomainEvent dataclass, EventDispatcher, activity log handler
│   │   ├── models/       # SQLAlchemy ORM models (user, book, shelf, lending, progress, activity)
│   │   ├── repositories/ # DB query layer (one repo per domain entity)
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Business logic & transaction ownership
│   │   └── ws/           # WebSocket auth, ConnectionManager, event router
│   ├── scripts/
│   │   └── seed.py       # Deterministic seed script
│   ├── tests/            # 53 critical-path pytest tests
│   └── alembic/          # SQL migration scripts
├── frontend/
│   └── src/
│       └── features/     # Domain-scoped feature folders (auth, books, shelves, lending, dashboard, activity)
├── Diagrams/             # 15 architecture & data-model diagrams
├── AGENTS.md             # Engineering constitution & invariants
└── .env.example          # Environment variable template
```

---

## Diagrams Reference

| Diagram | Used In |
|---|---|
| [ER Diagram](Diagrams/ER%20Diagram.png) | §4 Data Model |
| [Database Schema](Diagrams/Database%20Schema.png) | §4 Data Model |
| [Authentication Sequence Diagram](Diagrams/Authentication%20Sequence%20Diagram.png) | §6 Refresh-Token Flow |
| [RBAC Authorization Flow](Diagrams/RBAC%20Authorization%20Flow.png) | §7 RBAC Enforcement |
| [WebSocket Architecture](Diagrams/WebSocket%20Architecture.png) | §8 WebSocket Setup |
| [Event-Driven Architecture](Diagrams/Event-Driven%20Architecture.png) | §8 WebSocket Setup |
| [Activity Feed Data Flow](Diagrams/Activity%20Feed%20Data%20Flow.png) | §8 WebSocket Setup |
| [High-Level System Architecture](Diagrams/High-Level%20System%20Architecture.png) | §5 Stack & Rationale |
| [Final Architecture](Diagrams/Final%20Architecture.png) | §5 Stack & Rationale |
| [Complete End-to-End Data Flow](Diagrams/Complete%20End-to-End%20Data%20Flow%20Diagram.png) | §5 Stack & Rationale |
| [Lending Data Flow](Diagrams/Lending%20Data%20Flow.png) | Reference |
| [Lending State Machine](Diagrams/Lending%20State%20Machine.png) | Reference |
| [Reading Progress State Machine](Diagrams/Reading%20Progress%20State%20Machine.png) | Reference |
| [System Context](Diagrams/System%20Context.png) | Reference |
| [Deployment](Diagrams/Deployment.png) | Reference |
