# CLAUDE.md — BookNest Working Memory

> This file is the **live, practical companion** to `AGENTS.md` (the engineering constitution).
> `AGENTS.md` = the rules. `CLAUDE.md` = where we are, what's decided, and how to run things.
> `PHASE_PROMPTS.md` = the phase-by-phase execution prompts.
>
> Read `AGENTS.md` in full before touching code. Re-read the relevant section of `AGENTS.md`
> cited in the active phase prompt before implementing that phase.

---

## 1. What BookNest Is

A reading-tracker web app built for an **AI Solutions Engineer I** hiring assessment (deliverable:
GitHub repo + 4–6 min demo video). It exists to demonstrate — not maximize features:

- relational data modeling (many-to-many, junction tables, referential integrity)
- backend-enforced RBAC (owner/editor/viewer on shared shelves)
- transactional cross-user state (lending, with concurrency-safe uniqueness)
- authenticated, room-scoped WebSocket real-time updates
- event-driven activity logging
- production-grade auth (Argon2 + JWT access/refresh rotation)

Full requirements: `Coding_Assessment__BookNest.pdf` (uploaded). Full rules: `AGENTS.md`.

---

## 2. Stack (Locked — do not re-litigate without a documented reason)

This stack was fixed by the architecture diagrams already produced for this project. Treat it as
decided, per `AGENTS.md` §40 (Architecture Decision Rule) and §41 (Do Not Overengineer).

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js / React | organized by domain (`features/auth`, `features/books`, `features/shelves`, `features/lending`, `features/dashboard`, `features/activity`) per §24 |
| Backend | FastAPI (Python) | layered: REST API → Services → Repositories, per §11–§12 |
| Database | PostgreSQL | source of truth, always — §8 |
| Auth | JWT access token (short-lived) + refresh token (long-lived, rotated, hash stored server-side) | Argon2 password hashing — §17, §18 |
| Real-time | Native WebSockets via a WebSocket Gateway, authenticated, room-scoped (`user:{id}`, `shelf:{id}`) | never global broadcast — §9 |
| Cache / fan-out | Redis (Pub/Sub) | **optional**, only wired in if we run multiple backend instances — §42. Single-instance dev uses an in-process event dispatcher. |
| Reverse proxy | HTTPS termination in front of Next.js / FastAPI / WebSocket Gateway | see `Deployment.png` |

Core entities (see `ER_Diagram.png` / `Database_Schema.png`, matches `AGENTS.md` §13):
`users, books, shelves, shelf_books, shelf_collaborators, lendings, activity_events, refresh_tokens`

Architecture flow to keep in your head at all times (`AGENTS.md` §8, `Event-Driven_Architecture.png`):

```
Command → Domain Service → DB Transaction → Domain Event → Event Dispatcher
                                                              ├── Activity Service → activity_events
                                                              └── WebSocket Router → authorized rooms
```

---

## 3. Repo Layout (target)

```
booknest/
├── AGENTS.md                  # engineering constitution (source of truth for rules)
├── CLAUDE.md                  # this file
├── PHASE_PROMPTS.md           # phase-by-phase execution prompts
├── README.md                  # written last (Phase 17), but keep notes as you go
├── .env.example
├── docker-compose.yml         # Phase 16, only if stable
├── backend/
│   ├── app/
│   │   ├── api/                # controllers — thin, per §12
│   │   ├── services/            # BookService, ShelfService, LendingService,
│   │   │                        # ProgressService, ActivityService, AuthService
│   │   ├── repositories/        # persistence, filtering, pagination, sorting
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/              # pydantic request/response
│   │   ├── auth/                 # JWT, refresh rotation, Argon2
│   │   ├── ws/                   # WebSocket gateway, room auth, event router
│   │   ├── events/                # domain event definitions + dispatcher
│   │   └── db/                    # session, migrations (alembic)
│   ├── tests/
│   └── seed.py
└── frontend/
    └── src/
        ├── app/
        ├── components/
        ├── features/{auth,books,shelves,lending,dashboard,activity}/
        ├── lib/{api,auth,websocket,validation}/
        ├── hooks/
        ├── types/
        └── utils/
```

---

## 4. Current Status

**Phase: 0 — Repository + architecture + tooling. ✅ Complete.**
**Phase: 1 — Database schema + migrations. ✅ Complete.**
**Phase: 2 — Authentication + JWT + refresh rotation. ✅ Complete.**
**Phase: 3 — Book domain (CRUD). ✅ Complete.**
**Phase: 4 — Filtering / search / pagination / sorting. ✅ Complete.**
**Phase: 5 — Shelves + many-to-many. ✅ Complete.**
**Phase: 6 — Shelf RBAC. ✅ Complete.**
**Phase: 7 — Reading progress. ✅ Complete.**
**Phase: 8 — Lending. 🟢 Active.**

Reading progress endpoint (`PATCH /api/v1/books/{id}/progress`), page validation rules (rejecting negative page & page > total_pages with HTTP 422), percentage calculation, atomic auto-finish transition (`current_page == total_pages` -> `status = FINISHED`, `finished_at = now()`), and frontend inline progress controls with non-blocking inline error messages are fully implemented and verified with 24/24 unit & integration tests passing cleanly.








> Maintenance note: update the line above every time a phase starts, completes, or gets
> blocked. Keep the "Current Status" blocks in `PHASE_PROMPTS.md` in sync with this line —
> they should never disagree about which phase is active.

---

## 5. Non-Negotiables (condensed — full detail in `AGENTS.md`)

Restated here because these are the ones an agent is most likely to accidentally violate
mid-implementation. This list does **not** replace reading `AGENTS.md` — see §54 Agent Rules.

- RBAC is enforced **server-side only**. A viewer calling `POST /shelves/{id}/books` directly
  must get `403`. Never trust the frontend to hide a button. (§3)
- `owner != borrower`, borrower must exist, book must not already have an active lending —
  and the "no double lending" rule must hold under **concurrent** requests, not just
  sequential ones. Prefer a DB-level unique constraint (`UNIQUE(book_id) WHERE returned_at IS
  NULL`) in addition to the application check. (§4, §5, §16)
- Never make the WebSocket the source of truth. PostgreSQL is authoritative. If the socket
  drops, the app must still work via REST, and reconnect must re-fetch state. (§8)
- Never broadcast a WebSocket event globally. Every event goes to a scoped room
  (`user:{id}` or `shelf:{id}`), and the server — never the client — decides which rooms a
  socket may join. (§9)
- Deleting a shelf never deletes its books. Deleting a book cleans every relationship (shelf
  membership, collaborators are shelf-scoped so unaffected) with no orphaned rows. (§2)
- Passwords: Argon2 only. Never log passwords, JWTs, refresh tokens, or raw auth headers. (§17, §30)
- Pagination/filtering/sorting/search happen in PostgreSQL, not by loading everything into
  memory and slicing in application code. (§22, §23)

---

## 6. Environment Variables (fill in as decided — keep `.env.example` in sync)

```
DATABASE_URL=
JWT_SECRET=
JWT_ACCESS_TTL=            # e.g. 15m
JWT_REFRESH_TTL=           # e.g. 30d
ARGON2_*                   # tuning params if non-default
REDIS_URL=                 # optional — only if multi-instance
CORS_ORIGINS=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
```

Never commit `.env`. Fail fast on missing required config (`AGENTS.md` §31).

---

## 7. Dev Commands (fill in once tooling is chosen in Phase 0)

```
# backend
uvicorn app.main:app --reload
alembic upgrade head
alembic revision --autogenerate -m "..."
python seed.py
pytest

# frontend
npm run dev
npm run build
npm run lint
```

---

## 8. How to Use These Three Files Together

1. Open `PHASE_PROMPTS.md`, find the current active phase (only one section is expanded).
2. Read every doc section it cites in `AGENTS.md` before writing any code — this is a hard
   gate, not a suggestion (§53 Agent Workflow: UNDERSTAND → INSPECT → IDENTIFY INVARIANTS →
   PLAN → IMPLEMENT).
3. Do the planning step the phase prompt asks for. Do not skip straight to code.
4. Implement, test, review the diff, check security, update docs (§53).
5. Check the phase's completion criteria against what you built.
6. Come back here and update the Current Status block, then move to the next phase.
7. If something in a phase prompt seems to require a real architectural decision not already
   settled in `AGENTS.md` or this file — stop and ask, per the stop-and-ask triggers in that
   phase's prompt. Don't guess on anything that affects an invariant listed in §51.
