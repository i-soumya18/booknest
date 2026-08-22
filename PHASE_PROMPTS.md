# PHASE_PROMPTS.md — BookNest

Companion to `AGENTS.md` (rules) and `CLAUDE.md` (working memory). Each phase below is a
**self-contained prompt** — hand a section to a coding agent on its own and it should have
everything it needs, provided `AGENTS.md` and the referenced diagrams are in the repo.

> **Maintenance note:** exactly one phase should be expanded (the active one) at any time.
> When a phase completes, collapse it, mark it `✅ Complete`, expand the next one, and update
> the "Current Status" line in `CLAUDE.md` to match. When a phase is blocked, mark it
> `⛔ Blocked on Phase N` instead of `Not Started`.## Current Status (top-level)

| Phase | Name | Status |
|---|---|---|
| 0 | Repository + architecture + tooling | ✅ **Complete** |
| 1 | Database schema + migrations | ✅ **Complete** |
| 2 | Authentication + JWT + refresh rotation | ✅ **Complete** |
| 3 | Book domain (CRUD) | ✅ **Complete** |
| 4 | Filtering / search / pagination / sorting | ✅ **Complete** |
| 5 | Shelves + many-to-many | 🟢 **Active** |
| 6 | Shelf RBAC | ⛔ Blocked on Phase 5 |

| 7 | Reading progress | ⛔ Blocked on Phase 3 |
| 8 | Lending | ⛔ Blocked on Phases 2, 3 |
| 9 | Activity events | ⛔ Blocked on Phases 5, 6, 7, 8 |
| 10 | WebSocket authentication | ⛔ Blocked on Phase 2 |
| 11 | WebSocket event routing | ⛔ Blocked on Phases 9, 10 |
| 12 | Dashboard | ⛔ Blocked on Phase 11 |
| 13 | Frontend polish | ⛔ Blocked on Phase 12 |
| 14 | Critical-path tests | ⛔ Blocked on Phase 13 |
| 15 | Seed data | ⛔ Blocked on Phase 14 |
| 16 | Docker (stretch) | ⛔ Blocked on Phase 15 |
| 17 | README + diagrams | ⛔ Blocked on Phase 15 |
| 18 | Demo rehearsal | ⛔ Blocked on Phase 17 |
| 19 | Security + edge-case review | ⛔ Blocked on Phase 18 |

Order follows `AGENTS.md` §52 exactly. Phases 5 and 7 both depend only on Phase 2+3, and
could be parallelized if you have two workstreams — but §52 recommends building sequentially
so each phase's invariants are settled before the next one builds on them. Don't jump to UI
polish early (§52 closing line).

---

<details>
<summary><strong>PHASE 0 — Repository + architecture + tooling ✅ Complete</strong></summary>

### Status
Complete. Scaffold, tooling, env setup, initial commits, and planning documents complete.

### Mandatory reading (read these `AGENTS.md` sections in full before doing anything)
- §11 Architecture — the logical layering (Client → REST API/WebSocket → Application →
  Auth/RBAC + Domain + Event System → PostgreSQL)
- §12 Layer Responsibilities — what belongs in controllers vs. services vs. repositories
- §24 Frontend Architecture — the `features/` folder-by-domain structure
- §31 Configuration — env var discipline, fail-fast on missing config
- §36 Dependency Discipline — the four questions before adding any dependency
- §38 Git Strategy — commit cadence and message style (no "initial commit" / "final commit")
- §39 Code Style — small functions, explicit names, no god classes
- §41 Do Not Overengineer — explicit list of things NOT to build
- `CLAUDE.md` §2 (Stack — locked) and §3 (target repo layout)

### Planning gate — do NOT write application code yet
Before scaffolding, produce (in a scratch note or PR description, not necessarily committed):
1. Confirmation of the stack in `CLAUDE.md` §2, or a documented reason to deviate.
2. The exact folder tree you'll create, matching `CLAUDE.md` §3 (or a justified variant).
3. The dependency list for backend and frontend, each with a one-line justification per §36
   — no dependency without a reason a reviewer could accept.
4. How migrations will be managed (e.g. Alembic) — decide now, don't discover it in Phase 1.
5. Linting/formatting tooling for both sides.

### Load-bearing rules to hold in your head
- Controllers stay thin: validate request → authenticate → call service → serialize response.
  Business logic never lives in a route function. (§12)
- Do not build microservices, Kafka, event sourcing, GraphQL, or any of the infrastructure
  listed in §41 "unless a real requirement appears." BookNest's challenge is relationships,
  authorization, state, transactions, and real-time — not infrastructure theater.
- Every commit should represent one coherent engineering change, not a giant dump. (§38)

### Completion criteria (from `AGENTS.md` §52 Phase 0 scope + §39/§41)
- [x] Backend and frontend scaffolds exist and boot (even with placeholder routes/pages)
- [x] Folder structure matches the layered architecture in §11–§12 and §24
- [x] Linting/formatting configured for both sides
- [x] `.env.example` exists with placeholders for every config value you already know you'll need
- [x] Git repo initialized with a real commit history starting now (§38) — no monolithic first commit
- [x] `AGENTS.md`, `CLAUDE.md`, `PHASE_PROMPTS.md` are committed at the repo root

### Stop and ask if...
- You're tempted to add a dependency that doesn't have a one-line justification you could
  defend in the follow-up interview (§36, §37).
- You're unsure whether something belongs in `backend/app/services/` vs.
  `backend/app/repositories/` — this boundary matters for every later phase; get it right now
  rather than refactoring later.
- Anything makes you want to deviate from the locked stack in `CLAUDE.md` §2.

### Deliverables
Booted backend + frontend scaffold, folder structure, tooling config, `.env.example`,
initial commit history, this repo's three planning docs committed.

</details>

---

<details>
<summary><strong>PHASE 1 — Database schema + migrations ✅ Complete</strong></summary>

### Status
Complete. All 8 core entity tables, foreign keys, check constraints, composite primary keys, partial unique index (`idx_lendings_active_book`), and initial Alembic migration script created.

### Mandatory reading
- §13 Database — the seven core entities and their relationships (User 1:N Book, User 1:N
  Shelf, Shelf M:N Book, User M:N Shelf through `shelf_collaborators`, Book 1:N Lending, User
  1:N Lending as owner, User 1:N Lending as borrower, User 1:N ActivityEvent, User 1:N
  RefreshToken)
- §14 Database Integrity — which invariants must be DB constraints, not just app checks
  (unique email, rating CHECK 1..5, `current_page >= 0`, composite PKs on junction tables,
  and critically the partial-unique-index pattern for "one active lending per book")
- §2 Shelves — "do NOT store shelf IDs as an array inside `books`... do NOT store book IDs as
  an array inside `shelves`" — use a real junction table
- `ER_Diagram.png` and `Database_Schema.png` (uploaded) — these are the authoritative visual
  schema; your migration must match them exactly, including PK/FK/UK annotations
- `AGENTS.md` §44 Performance Checklist — the index list at the bottom (you're adding these
  indexes now, not retrofitting them later)

### Planning gate — do NOT write migration code yet
1. Write out the full table list with every column, type, and constraint, cross-checked
   against `ER_Diagram.png` field-by-field.
2. Identify every foreign key and its `ON DELETE` behavior — this determines whether
   cascading cleanup happens at the DB level or the app level for shelf/book deletion (§2).
3. Write the exact SQL (or ORM-equivalent) for the "no double active lending" constraint:
   conceptually `UNIQUE(book_id) WHERE returned_at IS NULL` (§14, §16). Confirm your ORM/DB
   actually supports partial unique indexes before committing to this approach.
4. List every index from §44 and confirm each is in your migration.

### Load-bearing rules
- `shelf_books` and `shelf_collaborators` are junction tables with **composite primary
  keys** (`shelf_id + book_id`, `shelf_id + user_id`) — not surrogate IDs with a separate
  unique constraint bolted on. (ER diagram, §2)
- The active-lending uniqueness constraint must be enforced at the database level, not only
  in application code, because concurrent requests can race past an app-level check. (§14, §16)
- `refresh_tokens` stores a **hash** of the token, never the raw token. (§17)

### Completion criteria (from `AGENTS.md` §13, §14, §52)
- [x] All 8 tables exist: `users, books, shelves, shelf_books, shelf_collaborators, lendings,
      activity_events, refresh_tokens`
- [x] Every relationship in §13's list is represented by an actual FK
- [x] `users.email` UNIQUE, `books.rating` CHECK 1..5, `books.current_page >= 0` enforced at DB level
- [x] Partial unique index/constraint prevents two simultaneous active lendings on one book
- [x] Deleting a book cascades cleanup of its `shelf_books` rows with no orphans; deleting a
      shelf cascades cleanup of `shelf_books` and `shelf_collaborators` without touching `books`
- [x] All indexes listed in §44 exist
- [x] Migrations run cleanly on a fresh database from a clean clone

### Stop and ask if...
- Your ORM/DB choice can't express a partial unique index cleanly — this is a real
  architectural decision (app-level advisory lock vs. `SELECT ... FOR UPDATE` vs. partial
  index), not something to silently work around. (§16)
- The ER diagram and the PDF spec seem to disagree on any field — they shouldn't, but if you
  spot one, flag it rather than picking silently.

### Deliverables
Full migration set, ERD-matching schema, all constraints and indexes live, migrations
verified against a clean database.

</details>

---

<details>
<summary><strong>PHASE 2 — Authentication + JWT + refresh rotation ✅ Complete</strong></summary>

### Status
Complete. Argon2id password hashing, documented password policy, JWT access token issuance, server-side hashed refresh token rotation, HttpOnly cookie handling, protected endpoint middleware, and frontend 401 transparent refresh interceptor are live and verified.

### Mandatory reading
- §17 Authentication — Argon2 only, JWT claim discipline (never put password, refresh token,
  or sensitive data in claims)
- §18 Refresh Token Rotation — the full flow: validate → check expiry/revocation → revoke/
  rotate old token → issue new access + refresh token; frontend behavior on 401 (refresh
  once, retry, and on refresh failure clear state + redirect — never loop infinitely)
- `Authentication_Sequence_Diagram.png` (uploaded) — the exact sequence: signup/login →
  tokens issued → protected request → token expires → 401 → `POST /auth/refresh` → validate
  → rotate → new access JWT → retry original request → 200
- PDF "Authentication and accounts" items 1–5 (signup fields + validation, JWT + refresh
  flow, Argon2, backend-enforced "own data only," 401 behavior + transparent refresh)
- §19 API Conventions — `POST /auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout`
- §20/§21 — status codes and the error contract shape (`{"error": {"code", "message"}}`)

### Planning gate — do NOT write application code yet
1. Decide and document your password policy (the assignment requires you to define and
   document one — pick something real, e.g. min length + complexity, not just "min 6 chars").
2. Decide where the refresh token lives on the client (cookie vs. storage) and document why,
   per the README requirement in §48 — this is a decision the evaluator will ask about.
3. Map out the exact refresh-rotation sequence against `Authentication_Sequence_Diagram.png`
   step by step before coding it.
4. Decide JWT claims (user id, maybe email) and confirm nothing sensitive is in there.

### Load-bearing rules
- Argon2 for hashing, full stop — no MD5/SHA1/bare SHA256. (§17)
- Store a **hash** of the refresh token server-side, not the raw token; make it revocable and
  rotatable. (§17, §18)
- Unauthenticated request to a protected endpoint → `401`. Expired access token → `401`, and
  the frontend must transparently refresh-and-retry exactly once — never an infinite loop. (§18)

### Completion criteria (from `AGENTS.md` §47 + PDF items 1–5)
- [x] Signup works, with email format validation and the documented password policy enforced
- [x] Login works, logout works
- [x] Refresh works and rotates the refresh token
- [x] Passwords are Argon2-hashed, never stored or logged in plaintext
- [x] Protected endpoints return 401 when unauthenticated
- [x] Expired access token returns 401; frontend refresh-and-retry works transparently
- [x] A user cannot see or modify another user's data via any endpoint built so far

### Stop and ask if...
- You're unsure whether to store the refresh token in an HttpOnly cookie vs. elsewhere — this
  has real security tradeoffs worth deciding deliberately, not defaulting into.
- Anything about the rotation sequence doesn't match `Authentication_Sequence_Diagram.png` —
  the diagram is the agreed contract; either the code or the diagram is wrong, and that's
  worth surfacing rather than quietly picking one.

### Deliverables
Working signup/login/logout/refresh endpoints, Argon2 hashing, JWT issuance + validation
middleware, refresh-token rotation with revocation, frontend axios/fetch interceptor (or
equivalent) implementing refresh-and-retry.

</details>

---

<details>
<summary><strong>PHASE 3 — Book domain (CRUD) ✅ Complete</strong></summary>

### Status
Complete. Book CRUD endpoints, BookService ownership enforcement, Pydantic validation, unit tests, and frontend library components complete.

### Mandatory reading
- PDF "Books" items 6–7 (fields: title, author, status enum, total pages, current page,
  optional rating 1–5, optional notes; create/list/retrieve/update/delete)
- `AGENTS.md` §19 API Conventions — book endpoint shapes
- §20/§21 — status codes + error contract (reuse from Phase 2, don't reinvent)
- §39 Code Style — service method naming (`lend_book()` not `process_data()`) applies here too

### Planning gate — do NOT write filtering/pagination/sorting yet (that's Phase 4)
1. Confirm the `BookService` owns create/update/delete business rules (ownership checks),
   and the repository only does persistence — per §12.
2. Decide the exact status enum values (`WANT_TO_READ`, `READING`, `FINISHED` per §Books
   section of `AGENTS.md`) and confirm they match the migration from Phase 1.
3. Confirm every book mutation checks `book.owner_id == current_user.id` before proceeding.

### Load-bearing rules
- Ownership is checked server-side on every mutation — no relying on the frontend only
  showing a user their own books. (§3 general principle, applied to books)
- Rating is optional and, when present, constrained 1–5 at the DB level already (Phase 1) —
  the service layer should still validate before hitting the DB for a clean error message.

### Completion criteria (from PDF items 6–7 + `AGENTS.md` §47)
- [x] Create, list, retrieve, update, delete all work
- [x] A book's status, total pages, current page, rating, notes are all persisted correctly
- [x] Ownership enforced: a user cannot retrieve/update/delete another user's book

### Stop and ask if...
- The status auto-transition logic (finishing a book) starts creeping into this phase — that
  belongs to Phase 7 (Reading Progress); keep this phase to plain CRUD.

### Deliverables
Full book CRUD API + basic frontend list/create/edit/delete views with loading/error states
per §25 (even if minimal — full polish is Phase 13).

</details>

---

<details open>
<summary><strong>PHASE 4 — Filtering / search / pagination / sorting ✅ Complete</strong></summary>

### Status
Complete. Server-side PostgreSQL pagination, ILIKE search, status filter, combined AND query composition, multi-field sorting, and frontend filter bar & controls complete.

### Mandatory reading
- §22 Pagination — query contract (`page`, `page_size`, `search`, `status`, `sort_by`,
  `sort_order`), the required response shape (`items`, `page`, `page_size`, `total`,
  `total_pages`), and the explicit anti-pattern: never "fetch everything → slice in app code"
- §23 Search — title/author search, and critically that filter + search must **AND**
  together, not **OR** (`status == READING AND (title OR author contains search)`)
- PDF item 8–9 — combined filter+search must be active together; sort by rating, title, or
  date added; frontend sends the params, backend does the work

### Planning gate — do NOT write code yet
1. Write out the exact SQL/ORM query shape you'll use, confirming filter, search, and sort
   compose as `WHERE status = ? AND (title ILIKE ? OR author ILIKE ?) ORDER BY ? LIMIT ? OFFSET ?`
   — not three separate queries merged in Python.
2. Confirm indexes from §44 (`books(status)`, `books(created_at)`, `books(rating)`) actually
   support the query patterns you're about to write.

### Load-bearing rules
- Pagination, filtering, sorting, and search all happen **in PostgreSQL**. If you can point
  to a line of Python that loads all rows and slices them, that's a violation of §22. (§22)
- Filter and search combine with AND, not OR. (§23)

### Completion criteria (from `AGENTS.md` §47 + PDF item 8–9)
- [x] Status filter works alone
- [x] Title/author search works alone
- [x] Status filter + search work together (AND, not OR)
- [x] Pagination is server-side (confirm via query plan or logging — not just "it looks right")
- [x] Sorting by rating, title, and date added all work
- [x] Response includes `items, page, page_size, total, total_pages`

### Stop and ask if...
- You find yourself writing `.all()` (or equivalent full-table fetch) anywhere in this code
  path — that's the exact anti-pattern §22 calls out.

### Deliverables
Query-param-driven `GET /books` with server-side filter+search+sort+pagination, frontend
list view wired to send those params.

</details>

---

per the sequential order in §52.)

### Mandatory reading
- §2 Shelves — shelf owns one owner, contains many books, deleting a shelf never deletes
  books, deleting a book cleans it out of every shelf with no orphaned junction rows
- PDF "Shelves (many-to-many)" items 10–11
- `ER_Diagram.png` — `shelf_books` junction table shape (composite PK `shelf_id + book_id`)
- §19 API Conventions — shelf endpoints (`GET/POST /shelves`, `GET/DELETE /shelves/{id}`,
  `POST/DELETE /shelves/{shelf_id}/books/{book_id}`)

### Planning gate — do NOT write code yet
1. Confirm the `shelf_books` junction table from Phase 1 is exactly what you'll use — no
   array-of-IDs shortcuts (§2 explicitly forbids this).
2. Decide the transaction boundaries for shelf deletion (§15: `BEGIN → delete
   shelf_collaborators → delete shelf_books → delete shelf → COMMIT`).

### Load-bearing rules
- A book can belong to many shelves; a shelf holds many books — real junction table, not an
  array column on either side. (§2)
- Shelf deletion is transactional and must never delete the books on it. (§2, §15)

### Completion criteria (from PDF items 10–11 + `AGENTS.md` §47)
- [ ] Create shelf, list shelves, view books on a shelf
- [ ] Add/remove book to/from shelf via the junction table
- [ ] Deleting a shelf leaves its books untouched
- [ ] Deleting a book removes it from every shelf with no orphaned `shelf_books` rows

### Stop and ask if...
- You're tempted to add a `shelf_ids` array column to `books` "just for convenience" —
  this is explicitly forbidden in §2.

### Deliverables
Shelf CRUD, shelf↔book association endpoints, transactional shelf deletion.

</details>

---

<details>
<summary><strong>PHASE 6 — Shelf RBAC ⛔ Blocked on Phase 5</strong></summary>

### Status
Blocked until shelves and the shelf↔book relationship exist.

### Mandatory reading
- §3 Shelf RBAC — full OWNER/EDITOR/VIEWER capability matrix, and the critical rule: "Never
  rely on hidden button / disabled button / frontend route protection as security." A viewer
  calling `POST /shelves/{shelf_id}/books` directly must get a clear authorization error.
  Auth failure → 401; auth success + insufficient permission → 403.
- PDF "Shared shelves and roles (RBAC)" items 12–16 — including the "Shared with me" view and
  clean collaborator removal (no orphaned share records, books never deleted)
- `RBAC_Authorization_Flow.png` (uploaded) — Authenticate JWT → Identify User → Load Shelf →
  branch on role → OWNER/EDITOR/VIEWER capability set → 403 Forbidden on violation

### Planning gate — do NOT write code yet
1. Design the authorization check as a single reusable dependency/middleware
   (`require_shelf_role(shelf_id, min_role)`), not copy-pasted role checks scattered across
   endpoints — per §39's "no duplicated authorization logic."
2. Enumerate every shelf-scoped endpoint and write down, for each, which roles may call it.
3. Confirm `shelf_collaborators` (from Phase 1) is the source of truth for role lookups.

### Load-bearing rules
- OWNER can: view, add/remove books, share, change roles, remove collaborators, delete
  shelf. EDITOR can: view, add/remove books — nothing else. VIEWER can: view only. (§3)
- This must be enforced **server-side**, and the evaluator will call the API directly to
  test it — a viewer hitting the add-book endpoint via curl must fail with 403, regardless of
  what the frontend shows. (§3, and reiterated at §55 as a named hostile-review test)
- Only the owner can share, change roles, remove a collaborator, or delete the shelf — an
  editor attempting any of these gets a clear, explicit error, not a silent no-op. (PDF item 14)

### Completion criteria (from PDF items 12–16 + `AGENTS.md` §47)
- [ ] Owner can share a shelf by email, assigning editor or viewer role
- [ ] Editor can add/remove books, cannot share/change roles/remove collaborators/delete shelf
- [ ] Viewer can view only; every mutating endpoint rejects them with 403
- [ ] Direct unauthorized API calls (bypassing the UI) fail correctly — verify with curl, not
      just through the frontend
- [ ] "Shared with me" endpoint lists shelves shared with the current user plus their role
- [ ] Removing a collaborator (or deleting the shelf) leaves no orphaned share records and
      never deletes the underlying books

### Stop and ask if...
- You find role-check logic duplicated in more than one place — consolidate into the shared
  dependency before continuing; duplicated authorization logic is explicitly banned in §39.

### Deliverables
Role-based authorization dependency, shelf sharing endpoints, "Shared with me" view, tested
403 behavior for editor/viewer overreach.

</details>

---

<details>
<summary><strong>PHASE 7 — Reading progress ⛔ Blocked on Phase 3</strong></summary>

### Status
Blocked until book CRUD exists. (Independent of shelves/RBAC.)

### Mandatory reading
- §6 Reading Progress — validation rules (`current_page >= 0`, `current_page <= total_pages`,
  `total_pages` must exist and be > 0), the percentage formula, and the atomic auto-finish
  transition (`current_page == total_pages` → `status = FINISHED`, `finished_at = now()`)
- PDF "Reading progress" items 17–19
- `Reading_Progress_State_Machine.png` (uploaded) — `WantToRead --Start reading--> Reading`,
  and from `Reading`: negative page / page > total_pages / total_pages unset all → `Rejected`
  (stay in `Reading`); valid page update stays in `Reading`; `current_page == total_pages` →
  `Finished`
- §15 Transactions — the "Auto-Finish" transaction block

### Planning gate — do NOT write code yet
1. Write out every rejection case and its exact error code/message before coding the
   validator — negative page, page > total, missing/zero total_pages.
2. Confirm the auto-finish transition (page update + status change + `finished_at` set) is a
   single atomic operation, not two separate writes that could leave inconsistent state if
   one fails.

### Load-bearing rules
- Only books in `READING` status accept progress updates. (§6)
- Reject negative pages, page > total_pages, and progress updates when total_pages is unset —
  with clear messages, never a crash. (§6)
- The finish transition is atomic: page, status, and `finished_at` update together or not at
  all. (§6, §15)

### Completion criteria (from PDF items 17–19 + `AGENTS.md` §47)
- [ ] Progress updates work for books in `READING` status, with correct percentage
- [ ] Negative page rejected with a clear error
- [ ] Page > total_pages rejected with a clear error
- [ ] Progress update rejected when total_pages is unset, with a clear error
- [ ] Reaching total_pages auto-transitions to `FINISHED` and sets `finished_at`, atomically

### Stop and ask if...
- You're unsure whether progress updates should be allowed on non-`READING` books (e.g.
  should updating progress on a `WANT_TO_READ` book auto-transition it to `READING` first?)
  — the spec doesn't say; pick a documented behavior rather than leaving it ambiguous.

### Deliverables
`PATCH /books/{id}/progress` endpoint with full validation and atomic auto-finish, frontend
progress input with inline validation errors (per §25 — "Page cannot exceed total pages"
inline, never an `alert()`).

</details>

---

<details>
<summary><strong>PHASE 8 — Lending ⛔ Blocked on Phases 2, 3</strong></summary>

### Status
Blocked until auth and book CRUD exist. This is the highest-risk phase — the assignment
calls lending out as "the hard feature: cross-user state and rules."

### Mandatory reading
- §4 Lending — full rule set: owner must own book, borrower must exist, owner != borrower,
  book must not already have an active lending; borrower gets read-only access (cannot edit,
  delete, change progress, change ownership, or re-lend); owner can mark returned
- §5 Lending State Machine — `AVAILABLE → (lend) → LENT → (return) → AVAILABLE`, and the
  explicitly invalid transitions: `LENT → LENT` (double-lend attempt), `owner → owner`
  (self-lending), `non-owner → lend` (ownership violation)
- §16 Concurrency — two simultaneous lend requests for the same book must never both succeed;
  this needs the DB-level constraint from Phase 1, not just an app-level check
- §15 Transactions — the exact "Lend Book" and "Return Book" transaction blocks
- PDF "Lending" items 20–24
- `Lending_State_Machine.png` and `Lending_Data_Flow.png` (uploaded)

### Planning gate — do NOT write code yet
1. Re-confirm the partial unique index from Phase 1 (`UNIQUE(book_id) WHERE returned_at IS
   NULL`) is actually in place and enforced — this phase is where it gets exercised.
2. Write the exact ordered validation sequence for `lend_book()`: verify ownership → verify
   borrower exists → verify borrower != owner → verify no active lending → create lending →
   create activity event — all inside one transaction (§15).
3. Decide what HTTP status each rejection maps to: self-lending (400/422 per §20), book
   already lent (409 per §20), non-owner/nonexistent book (404), unauthenticated (401).

### Load-bearing rules
- The "book must not already have an active lending" rule must hold under **concurrent**
  requests — application-level checks alone are vulnerable to a race; the database must
  ultimately reject the impossible state. (§16, and named again in §50 as an interview
  defense question: "Why a unique active lending constraint?")
- A borrowed book is fully read-only to the borrower: no edit, no delete, no progress change,
  no re-lending. (§4)
- Self-lending and lending a book you don't own must be rejected cleanly, not crash. (§4, §5)

### Completion criteria (from PDF items 20–24 + `AGENTS.md` §47)
- [ ] Lending a book to a valid borrower works
- [ ] Self-lending is rejected
- [ ] Lending by a non-owner is rejected
- [ ] Lending to a nonexistent user is rejected
- [ ] Attempting to lend an already-lent book is rejected (test this concurrently, not just
      sequentially — fire two near-simultaneous requests and confirm only one succeeds)
- [ ] "Borrowed from others" view shows books currently lent to the current user, read-only
- [ ] Borrower cannot edit, delete, or update progress on a borrowed book (verify via direct
      API call, not just hidden UI)
- [ ] Owner can mark a book returned, which clears the lending and restores full ownership

### Stop and ask if...
- Your concurrency test (two near-simultaneous lend requests) doesn't reliably produce
  exactly one success — this is the single most scrutinized invariant in the whole
  assessment (see §55's hostile review list); don't move on until it's solid.

### Deliverables
`POST /books/{id}/lend`, `POST /books/{id}/return`, `GET /borrowed`, concurrency-safe lending
transaction, borrower read-only enforcement, frontend lend/return UI + borrowed view.

</details>

---

<details>
<summary><strong>PHASE 9 — Activity events ⛔ Blocked on Phases 5, 6, 7, 8</strong></summary>

### Status
Blocked until shelves, RBAC, progress, and lending all exist — this phase instruments all
of them with events.

### Mandatory reading
- §7 Activity Log — minimum required events (`BOOK_ADDED, BOOK_STATUS_CHANGED, BOOK_LENT,
  BOOK_RETURNED, SHELF_SHARED, COLLABORATOR_ROLE_CHANGED, COLLABORATOR_REMOVED`) plus
  recommended extras (`BOOK_ADDED_TO_SHELF, BOOK_REMOVED_FROM_SHELF,
  BOOK_PROGRESS_UPDATED`); every event needs who/what/which-book/which-shelf/when
- §28 Event Design — the structured event shape (`type, event_id, timestamp, actor_id,
  target_user_id, book_id, shelf_id, data`) — domain events represent facts, not arbitrary
  UI blobs
- PDF item 25 — reverse-chronological activity feed on the dashboard
- `Activity_Feed_Data_Flow.png` (uploaded) — every domain mutation (Book/Shelf/Lending/
  Collaborator) flows into a shared "Domain Event" → Activity Service → `activity_events`
  table, and separately to User WebSocket → Dashboard

### Planning gate — do NOT write code yet
1. Confirm you have a single Domain Event Dispatcher that every service (Book, Shelf,
   Lending, Progress) publishes to — not each service writing directly to
   `activity_events` independently. This is what makes Phase 11's WebSocket wiring clean.
2. Map every mutation you built in Phases 5–8 to the event type it should emit.

### Load-bearing rules
- Every domain mutation that matters emits one structured event through a shared dispatcher —
  don't duplicate activity-logging logic inside each service. (§7, §28, §39)
- Activity events must carry enough metadata (actor, book/shelf if applicable, timestamp) to
  reconstruct "who did what" without joining back through five tables. (§7)

### Completion criteria (from `AGENTS.md` §7 + §47 + PDF item 25)
- [ ] All required event types are emitted at the correct points
- [ ] Each event records actor, action, and the relevant book/shelf reference
- [ ] Dashboard activity feed reads `activity_events` in reverse-chronological order

### Stop and ask if...
- You find yourself writing activity-log inserts inline inside multiple services instead of
  through one dispatcher — refactor before continuing; Phase 11 depends on this being centralized.

### Deliverables
Domain Event Dispatcher, `activity_events` writes wired into every mutation from Phases 5–8,
`GET /activity` endpoint.

</details>

---

<details>
<summary><strong>PHASE 10 — WebSocket authentication ⛔ Blocked on Phase 2</strong></summary>

### Status
Blocked until JWT auth exists (the socket handshake needs a token to validate).

### Mandatory reading
- §9 WebSocket Security — full sequence: authenticate socket → identify user → verify shelf
  access → join room. Never trust a client-provided room ID; the server determines access.
  Rooms are conceptually `user:{user_id}` and `shelf:{shelf_id}`.
- `WebSocket_Architecture.png` (uploaded) — Socket Authentication sits between Connected
  Users and room membership; a user only gets joined to `shelf:{id}` rooms for shelves they
  actually have access to (per the Authorization panel in that diagram)
- §27 WebSocket Client (read the client-side half now even though frontend wiring is later) —
  connect → authenticate → subscribe to authorized rooms → handle events → reconnect

### Planning gate — do NOT write code yet
1. Decide how the JWT gets to the socket handshake (query param, header, or first message)
   and confirm it's validated the same way as REST auth — no parallel, weaker auth path.
2. Design the room-join logic as: authenticate → look up user → for each shelf the user owns
   or collaborates on, join `shelf:{id}` → always join `user:{id}`. This lookup must hit the
   real `shelf_collaborators`/`shelves` tables — never accept a room name the client asks for.

### Load-bearing rules
- The server decides which rooms a socket joins, based on real DB-backed authorization —
  never a client-supplied room ID. (§9)
- An unauthenticated socket must not be allowed to connect/subscribe to anything. (§9, and
  named again in §55's hostile review: "Can an unauthenticated socket connect?")

### Completion criteria (from `AGENTS.md` §9, §43, §47)
- [ ] Socket handshake requires a valid JWT; invalid/missing token is rejected
- [ ] On connect, the user is joined to their own `user:{id}` room and every `shelf:{id}`
      room they actually have access to (owner, editor, or viewer)
- [ ] A client cannot join a room it doesn't have access to by supplying a room ID directly

### Stop and ask if...
- The framework you're using makes it awkward to reject a socket connection cleanly on auth
  failure — resolve this before Phase 11 builds event routing on top of it.

### Deliverables
Authenticated WebSocket gateway, server-determined room membership, rejection of
unauthenticated/unauthorized connection attempts.

</details>

---

<details>
<summary><strong>PHASE 11 — WebSocket event routing ⛔ Blocked on Phases 9, 10</strong></summary>

### Status
Blocked until domain events (Phase 9) and authenticated rooms (Phase 10) both exist.

### Mandatory reading
- §8 Real-Time Architecture — the full conceptual flow: Command → Domain Service → DB
  Transaction → Domain Event → Event Dispatcher → {Activity Log, WebSocket Router} →
  Authorized Rooms. PostgreSQL is always the source of truth; WebSocket is delivery only.
- §10 Real-Time Event Requirements — the three concrete flows: lending (`BOOK_LENT` →
  borrower's WebSocket → "Borrowed from others" updates live; `BOOK_RETURNED` → book
  disappears live), shared shelf (`BOOK_ADDED_TO_SHELF` / `BOOK_REMOVED_FROM_SHELF` →
  `shelf:{id}` → authorized collaborators), and activity (`Domain Event` → `Activity Event`
  → `user:{id}` → dashboard feed)
- PDF items 26–30 (live update requirements + explicit "polling does not satisfy this")
- `Event-Driven_Architecture.png` and `Complete_End-to-End_Data_Flow_Diagram.png` (uploaded) —
  these show Event Router fanning a Domain Event out to `User Room` and `Shelf Room`
  simultaneously, while Activity Service independently persists to PostgreSQL

### Planning gate — do NOT write code yet
1. Confirm the Event Dispatcher from Phase 9 has two subscribers wired: Activity Service
   (already done) and a new WebSocket Router — both driven by the same domain event, so
   activity logging and live delivery never drift out of sync.
2. For each event type, write down which room(s) it routes to: `BOOK_LENT`/`BOOK_RETURNED` →
   `user:{borrower_id}`; shelf book add/remove → `shelf:{shelf_id}`; general activity →
   `user:{actor_id}` (and anyone else entitled, per event type).

### Load-bearing rules
- One domain event fans out to exactly the rooms entitled to see it — never a global
  broadcast, and never skip a room that should receive it either. (§8, §9, §10)
- WebSocket delivery failure must never corrupt or block the underlying DB transaction —
  the mutation already committed before the event fans out; the socket layer is best-effort
  delivery on top of already-durable state. (§8)

### Completion criteria (from PDF items 26–30 + `AGENTS.md` §47)
- [ ] Lending a book updates the borrower's "Borrowed from others" view live, no refresh
- [ ] Returning a book removes it from the borrower's view live
- [ ] An editor adding/removing a book on a shared shelf is seen live by other collaborators
      currently viewing that shelf
- [ ] The dashboard activity feed updates live as new events happen for that user
- [ ] A viewer with no access to a shelf receives no events for it (verify by connecting as
      an unrelated user and confirming silence)

### Stop and ask if...
- You're unsure whether an event should route to `user:{id}` or `shelf:{id}` for a given
  case — get this exactly right per §10's three flows above; misrouting here is a security
  leak, not just a UX bug (§55: "Are private events leaked?").

### Deliverables
WebSocket Router subscribed to the Domain Event Dispatcher, correct room fan-out for
lending/shelf/activity events, frontend socket client consuming and applying these events.

</details>

---

<details>
<summary><strong>PHASE 12 — Dashboard ⛔ Blocked on Phase 11</strong></summary>

### Status
Blocked until real-time activity delivery exists (dashboard activity feed is live-updating).

### Mandatory reading
- §45 Dashboard — required metrics: books by status, books finished this year, average
  rating, shelf with the most books, books currently lent out, shelves shared with the user,
  recent activity. "Dashboard data should be calculated from real database state" — no
  duplicated counters unless demonstrably needed.
- PDF item 32 — same list, framed from the assignment's perspective
- §44 Performance Checklist — "No N+1 queries in dashboard" is called out explicitly

### Planning gate — do NOT write code yet
1. Write the actual aggregate queries (counts by status, this-year finished count, average
   rating, max-books shelf, active-lent-out count, shared-shelf count) and check each one is
   a single efficient query, not N+1 loops over collections in application code.

### Load-bearing rules
- All dashboard numbers are computed live from PostgreSQL, not from a cached/duplicated
  counter that can drift from reality. (§45)
- No N+1 queries — this is a named performance check the evaluator may look at. (§44)

### Completion criteria (from `AGENTS.md` §45, §47, PDF item 32)
- [ ] Dashboard shows counts by status, books finished this year, average rating, shelf with
      most books, books currently lent out, shelves shared with the user, and recent activity
- [ ] Queries are efficient (spot-check for N+1 patterns)

### Stop and ask if...
- A dashboard metric seems ambiguous (e.g. "shelf with the most books" — ties? shelves the
  user doesn't own?) — pick a documented, defensible interpretation.

### Deliverables
`GET /dashboard` endpoint with efficient aggregate queries, frontend dashboard view.

</details>

---

<details>
<summary><strong>PHASE 13 — Frontend polish ⛔ Blocked on Phase 12</strong></summary>

### Status
Blocked until all functional views exist across Phases 3–12; this phase upgrades their
quality, it doesn't add new backend behavior.

### Mandatory reading
- §25 Frontend UX Requirements — every data-loading view needs loading/success/empty/error
  states, never a blank screen on failure; forms show inline validation, never `alert()`;
  buttons disable and show progress while a request is in flight, preventing double-submit
- §26 Optimistic UI — optional, and only where the operation is low-risk with an easy
  rollback and a real UX benefit; never let optimistic state permanently diverge from Postgres
- PDF "Frontend quality requirements (not optional)" section — same three requirements,
  stated as explicitly checked by the evaluator

### Planning gate — do NOT write code yet
1. Audit every view built in Phases 3–12 against the four-state requirement (loading/
   success/empty/error) and list which ones are missing which state.
2. Decide, deliberately, whether any mutation gets optimistic UI — and if so, justify it
   against §26's three conditions rather than doing it everywhere "because it looks advanced."

### Load-bearing rules
- Every data-loading view needs all four states; a blank screen on error is an explicit
  failure mode called out in both `AGENTS.md` and the PDF. (§25)
- Request-triggering buttons must disable/show progress to prevent double-submit — this is
  checked, not optional, per the PDF's own framing. (§25)

### Completion criteria (from `AGENTS.md` §25 + §47 + PDF frontend-quality section)
- [ ] Every data-loading view has loading, success, empty, and error states
- [ ] Forms show inline validation errors, not alerts or crashes
- [ ] All request-triggering buttons disable/show progress during the request

### Stop and ask if...
- You're adding optimistic UI to a high-risk mutation (e.g. lending) "because it's cooler" —
  reconsider per §26; lending's rollback story is not simple.

### Deliverables
Loading/empty/error states across all views, inline form validation, disabled/pending button
states everywhere a request fires.

</details>

---

<details>
<summary><strong>PHASE 14 — Critical-path tests ⛔ Blocked on Phase 13</strong></summary>

### Status
Blocked until the functional surface is complete and polished — tests target the finished
behavior, not a moving target.

### Mandatory reading
- §33 Testing Strategy — the full list of critical tests by domain (auth, books, shelves,
  RBAC, lending, progress, WebSockets) — this is your test plan, don't invent a different one
- §34 Testing Philosophy — Arrange/Act/Assert, and test names that describe business rules
  (`test_viewer_cannot_add_book_to_shared_shelf()`, not `test_service_method_17()`)
- PDF stretch goal note: "A few automated tests on critical paths (auth, lending rules,
  progress validation)" — this is explicitly optional/stretch in the PDF but `AGENTS.md`
  treats it as part of Definition of Done (§46, §47); prioritize the invariant-protecting
  tests over coverage percentage

### Planning gate — do NOT write code yet
1. From §33's list, pick the tests that protect an actual invariant from §51 (e.g. "a book
   cannot have two active lendings," "a viewer cannot mutate a shelf") — these are
   non-negotiable. Coverage of trivial CRUD paths is lower priority than these.
2. Name every test before writing it, using the business-rule-describing style from §34.

### Load-bearing rules
- Tests should communicate business rules through their names and structure — a reviewer
  should understand the domain by reading test names alone. (§34)
- Prioritize invariant-protecting tests (lending concurrency, RBAC boundaries, progress
  validation) over superficial coverage. (§33)

### Completion criteria (from `AGENTS.md` §33, §47)
- [ ] Auth: signup, duplicate email, wrong password, login, refresh, logout, expired token
- [ ] Books: CRUD, ownership, filter, search, pagination, sorting, rating validation
- [ ] Shelves: create, many-to-many, add/remove book, delete shelf, delete-book cleanup
- [ ] RBAC: owner/editor/viewer permissions, direct API rejection for overreach
- [ ] Lending: valid lending, self-lending rejection, non-owner rejection, unknown-borrower
      rejection, double-lending rejection (concurrent), return, borrower read-only
- [ ] Progress: negative page, page > total, missing total pages, percentage calc, auto-finish
- [ ] WebSockets: authentication, authorized room join, unauthorized room rejection, lending/
      return/shelf/activity event delivery, reconnect

### Stop and ask if...
- Time pressure is pushing you toward deleting or skipping a failing test to make the suite
  pass — this is explicitly forbidden in §54 ("An agent MUST NOT... delete tests to make the
  suite pass"). Fix the underlying issue or flag it, don't hide it.

### Deliverables
Test suite covering §33's critical-path list, named per §34's convention, all passing.

</details>

---

<details>
<summary><strong>PHASE 15 — Seed data ⛔ Blocked on Phase 14</strong></summary>

### Status
Blocked until the full feature set and its tests are stable — the seed script exercises real
behavior, so it should run against finished code.

### Mandatory reading
- §32 Seed Data — must create at minimum User A and User B, with multiple books, multiple
  shelves, a shared shelf (editor role, ideally also a viewer example), and at least one
  active lending — enough for the evaluator to immediately test auth, books, shelves, RBAC,
  lending, real-time, dashboard, and activity without manually constructing the scenario
- PDF "seed script" requirement under "What to submit" — same list, phrased as a submission
  requirement, not optional

### Planning gate — do NOT write code yet
1. Write out the exact seed scenario as a script outline: User A (owner), User B
   (editor/viewer/borrower), N books each, a shared shelf with B as editor, ideally a second
   shelf with B as viewer, and one active lending from A to B — matching the demo sequence in
   §49 so the seed data doubles as the demo's starting state.
2. Confirm the seed script is idempotent/re-runnable against a clean database (deterministic,
   per §32).

### Load-bearing rules
- The seed script must let the evaluator test every major flow immediately — they should not
  have to manually construct users, shelves, shares, or lendings by hand. (§32)
- Seed data should be deterministic. (§32)

### Completion criteria (from `AGENTS.md` §32, §47, PDF submission requirements)
- [ ] User A and User B created with sample books
- [ ] Multiple shelves, including one shared with B as editor (and ideally one as viewer)
- [ ] At least one active lending from A to B
- [ ] Script runs cleanly against a fresh database

### Stop and ask if...
- The seed scenario and the demo script in Phase 18/§49 have drifted apart — keep them in
  sync so the seed data is literally the demo's starting point.

### Deliverables
`seed.py` (or equivalent), producing the full evaluator-ready scenario on a clean database.

</details>

---

<details>
<summary><strong>PHASE 16 — Docker (stretch) ⛔ Blocked on Phase 15</strong></summary>

### Status
Blocked until the app is functionally stable with seed data — Docker wraps a working system,
it doesn't get built speculatively ahead of one.

### Mandatory reading
- §35 Docker — explicitly a stretch goal; if implemented, frontend + backend + postgres
  should start with one command (`docker compose up`); "do not introduce Docker complexity
  that prevents a clean local development workflow"
- PDF stretch goals list — "Dockerized with docker-compose (frontend + backend + DB, one
  command)" is one of several optional stretch items; the PDF says pick at most one or two

### Planning gate — do NOT write code yet
1. Confirm this is actually worth doing before the other stretch goals, given time
   remaining — `AGENTS.md` §35 frames it as optional, and the PDF says pick at most one or
   two stretch goals total across the whole list (Docker, tests, CSV import, email, optimistic
   UI, deploy). Tests (Phase 14) already covers one; decide if Docker is the second, or if
   deploying live (mentioned in PDF stretch goals) would demonstrate more.

### Load-bearing rules
- One command should bring up the full stack. (§35)
- Don't let Docker complexity break local dev — it should be additive, not a replacement
  workflow that's harder to iterate in. (§35)

### Completion criteria (from `AGENTS.md` §35 + PDF stretch goals)
- [ ] `docker compose up` starts frontend, backend, and Postgres together
- [ ] Local (non-Docker) dev workflow still works unaffected

### Stop and ask if...
- Time is tight — reconfirm with the person driving this project whether Docker is the best
  use of remaining stretch-goal time versus the other options in the PDF.

### Deliverables
`docker-compose.yml` (and any Dockerfiles), verified one-command startup — only if pursued.

</details>

---

<details>
<summary><strong>PHASE 17 — README + diagrams ⛔ Blocked on Phase 15</strong></summary>

### Status
Blocked until the app + seed data are stable enough to document accurately. Does not depend
on Phase 16 (Docker) — write this whether or not Docker gets built, and add a Docker section
only if it exists.

### Mandatory reading
- §48 Submission Requirements — the exact README topic list: what the app does, how to run
  it, data model (with diagram or clear text), stack + why, refresh-token flow (what's
  stored where, what happens on expiry), RBAC enforcement (including how a viewer is blocked
  on a direct API call), WebSocket setup (authentication, event scoping, disconnect/
  reconnect), what was hard, known issues, future improvements, AI usage
- PDF "README.md" section under "What to submit" — same list, verbatim source
- §37 AI Usage Policy — "where AI was used, what was learned, what was changed" — this needs
  to be honest and specific, not a boilerplate disclaimer
- All 15 uploaded diagrams — these are ready-made assets for the README's data-model and
  architecture sections; use them rather than re-describing everything in prose

### Planning gate — do NOT write the final README yet
1. Outline the README against §48's exact list, one heading per required topic — don't let
   any topic get folded into another or dropped.
2. Decide which of the 15 diagrams go where (ER/schema diagram → data model section;
   auth sequence diagram → refresh-token section; RBAC flow diagram → RBAC section;
   WebSocket architecture + gateway diagrams → real-time section).
3. Draft the "what was hard" and "AI usage" sections honestly and specifically — these are
   read closely in the follow-up interview per §0 and §37.

### Load-bearing rules
- Every topic in §48's list must be present — this is a stated, checked requirement, not a
  nice-to-have.
- The AI-usage section must be specific and honest: where AI was used, what was learned, what
  was changed — not a generic "AI was used to assist development" line. (§37)

### Completion criteria (from `AGENTS.md` §48, PDF "What to submit" §2)
- [ ] App description, run instructions (clean-clone tested), data model, stack + rationale
- [ ] Refresh-token flow documented (storage location, expiry behavior)
- [ ] RBAC enforcement documented, including the direct-API-call rejection behavior
- [ ] WebSocket authentication, event scoping, and disconnect/reconnect strategy documented
- [ ] Hardest problems, known issues, future improvements, and AI usage all documented
- [ ] Run instructions verified against an actual clean clone, not just "should work"

### Stop and ask if...
- The "known issues" section would be empty — that's a signal to re-check rather than a
  success; a project this scoped almost always has at least one honest known gap.

### Deliverables
Complete `README.md` per §48's checklist, with diagrams embedded/linked appropriately.

</details>

---

<details>
<summary><strong>PHASE 18 — Demo rehearsal ⛔ Blocked on Phase 17</strong></summary>

### Status
Blocked until the README (and therefore the settled understanding of the whole system)
exists.

### Mandatory reading
- §49 Demo Strategy — target 4–6 minutes, two browser windows, the exact 18-step sequence
  (sign up both users → A creates books/shelf → share with B as editor → show editor works +
  viewer restriction → B adds book, live-appears for A → progress → auto-finish → A lends to
  B → live-appears in B's borrowed view → return → live-disappears → dashboard → activity
  feed). Do not spend the demo explaining basic CRUD — spend it on RBAC, transactions, state
  transitions, WebSocket scoping, and event architecture.
- PDF "Demo video (4 to 6 minutes)" section — same sequence, framed as the actual deliverable
  spec

### Planning gate — do NOT record yet
1. Script the narration for each of the 18 steps in §49, explicitly calling out *why* each
   moment matters (e.g. "this add is happening as User B, an editor — watch it appear live
   in User A's window without a refresh, because the event router scoped it to the
   `shelf:{id}` room they're both in").
2. Do at least one full dry run, timed, before recording — confirm it fits 4–6 minutes.

### Load-bearing rules
- The demo must show a viewer-style restriction being enforced, not just the happy path —
  per §49 step 7. (§49)
- Time spent explaining should skew toward RBAC/transactions/state/WebSocket scoping/event
  architecture, not toward narrating obvious CRUD. (§49)

### Completion criteria (from `AGENTS.md` §49, PDF demo section)
- [ ] All 18 steps in §49's sequence are performed and shown
- [ ] A viewer-restriction moment is explicitly demonstrated, not skipped
- [ ] Live updates (shelf book add, lending, return) are visibly shown across two windows
      with no manual refresh
- [ ] Runtime is 4–6 minutes
- [ ] Narration explains the engineering, not just the UI

### Stop and ask if...
- A dry run reveals a live-update isn't actually working reliably — fix the underlying
  behavior before recording; do not stage or fake a live update.

### Deliverables
Recorded 4–6 minute demo video following §49's exact sequence.

</details>

---

<details>
<summary><strong>PHASE 19 — Security + edge-case review ⛔ Blocked on Phase 18</strong></summary>

### Status
Blocked until everything else is built and demoed — this is the final hostile pass before
submission.

### Mandatory reading
- §55 Final Quality Gate — the full hostile-review question list (verbatim, this IS your
  test script for this phase): can User A access User B's book; can a viewer mutate a shelf
  via curl; can an editor delete a shelf; can a borrower edit a borrowed book; can a book be
  lent twice concurrently; can a user lend to themselves; can an invalid page crash the API;
  can an unauthenticated socket connect; can a viewer subscribe to an unauthorized shelf;
  what happens on WebSocket disconnect; what happens when a refresh token expires; what
  happens if refresh happens twice; what happens on a retried request; what happens when a
  shelf/book is deleted; are orphaned relationships possible; are private events leaked; does
  pagination actually happen in PostgreSQL; does the dashboard query efficiently; does the
  project run from a clean clone
- §43 Security Checklist — the full 15-item checklist
- §44 Performance Checklist — the full checklist + index list
- §50 Interview Defense Principles — be ready to explain, out loud, why PostgreSQL, why
  WebSockets, why domain events, why not make WebSocket the source of truth, why RBAC is
  backend-enforced, why transactions, why a unique active-lending constraint
- §51 Engineering North Star — the invariant list; every one of these should be re-verified
  now, not assumed

### Planning gate — do NOT skip straight to "looks fine"
1. Go through §55's question list one by one, actually attempting each attack (real curl
   calls, real concurrent requests, real socket connections as an unauthorized user) — don't
   reason about it abstractly, execute it.
2. Go through §43 and §44 checklists literally, checking each box only when verified, not
   assumed.
3. For each of §50's "why" questions, write a one-paragraph answer you could say out loud —
   this is explicitly what the follow-up interview will probe (§0, §37).

### Load-bearing rules
- "If any answer is unclear: the system is not finished." (§55) — this phase doesn't end
  until every question in §55 has a verified, not assumed, answer.
- Every invariant in §51 must hold: one owner per book, viewer can't mutate, borrower can't
  mutate owner's book, no double active lending, page never exceeds total, finished book
  always has finished_at, unauthorized users never receive shelf events, Postgres is always
  authoritative.

### Completion criteria (from `AGENTS.md` §55, §43, §44 — all as literal checklists)
- [ ] Every question in §55 has been actually tested, not reasoned about
- [ ] Every item in §43 Security Checklist is verified true
- [ ] Every item in §44 Performance Checklist is verified true
- [ ] Every invariant in §51 holds under an adversarial test
- [ ] A clean clone (fresh checkout, fresh DB) runs end-to-end successfully

### Stop and ask if...
- Any hostile-review question from §55 turns up a real gap — this is expected to happen at
  least once; fix it before declaring the project done. Finding nothing on the first pass is
  itself a signal to look harder, not a green light.

### Deliverables
A verified, hostile-reviewed system; completed §43/§44/§55 checklists (keep the completed
checklists as an artifact — they're useful interview prep too, per §50).

</details>
