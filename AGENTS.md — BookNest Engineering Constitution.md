# AGENTS.md

# BookNest Engineering Constitution

> **Build the system before building the screens.**
>
> BookNest is a production-minded reading tracker designed to demonstrate strong backend engineering, relational data modeling, authorization, transactional state management, and authenticated real-time communication.
>
> The goal is not to maximize features.
>
> The goal is to maximize **engineering signal per line of code**.

---

## 0. Mission

Build BookNest as a clean, production-minded full-stack application that demonstrates:

- strong relational data modeling
- backend-enforced authorization
- secure authentication
- transactional business rules
- cross-user state management
- real-time WebSocket communication
- event-driven activity tracking
- reliable validation
- maintainable frontend architecture
- testable business logic
- excellent documentation
- deliberate engineering decisions

The project is being built for a technical hiring assessment for an **AI Solutions Engineer I** role.

The evaluator may:

1. inspect the source code
2. call APIs directly
3. inspect database behavior
4. test authorization boundaries
5. test refresh-token behavior
6. test cross-user lending
7. test WebSocket behavior
8. ask why architectural decisions were made
9. ask for a live code change
10. ask us to debug an implementation

Therefore:

> **Every important implementation decision must be understandable and defensible by the developer.**

Do not generate code that cannot be explained.

---

# 1. Assessment Contract

The following capabilities are mandatory.

## Authentication

- Sign up
- Name
- Email
- Password
- Email validation
- Defined password policy
- Login
- Logout
- Short-lived JWT access token
- Long-lived refresh token
- Secure password hashing using Argon2
- Backend authorization
- Protected endpoints return `401`
- Expired access token returns `401`
- Frontend transparently refreshes and retries

## Books

Each book supports:

- title
- author
- status
  - `WANT_TO_READ`
  - `READING`
  - `FINISHED`
- total pages
- current page
- optional rating `1..5`
- optional notes
- creation date
- update date
- finished date

Required operations:

- create
- list
- retrieve
- update
- delete
- filter by status
- search by title/author
- combined filter + search
- server-side pagination
- server-side sorting
- sort by rating
- sort by title
- sort by date added

Never implement server-side pagination by loading the complete dataset into memory and slicing it.

---

# 2. Shelves

Shelves are many-to-many with books.

A shelf:

- belongs to one owner
- contains many books
- can be shared
- supports collaborator roles

A book:

- belongs to one owner
- may belong to many shelves

Deleting a shelf:

- deletes the shelf
- does NOT delete books

Deleting a book:

- deletes the book
- cleans all shelf relationships
- leaves no orphaned junction records

Use a proper junction table.

Do NOT store shelf IDs as an array inside `books`.

Do NOT store book IDs as an array inside `shelves`.

---

# 3. Shelf RBAC

Roles:

```text
OWNER
EDITOR
VIEWER
```

## OWNER

Can:

- view shelf
- add books
- remove books
- share shelf
- change collaborator role
- remove collaborator
- delete shelf

## EDITOR

Can:

- view shelf
- add books
- remove books

Cannot:

- share shelf
- change roles
- remove collaborators
- delete shelf

## VIEWER

Can:

- view shelf
- view books

Cannot:

- add books
- remove books
- share shelf
- change roles
- remove collaborators
- delete shelf

### Critical rule

Authorization MUST be enforced by the backend.

Never rely on:

```text
hidden button
disabled button
frontend route protection
```

as security.

A viewer calling:

```http
POST /shelves/{shelf_id}/books
```

directly must receive a clear authorization error.

Expected behavior:

```text
Authentication failure → 401
Authentication success + insufficient permission → 403
```

---

# 4. Lending

Lending is a cross-user domain.

A user may lend one of their books to another registered user.

Rules:

```text
owner must own book

borrower must exist

owner != borrower

book must not already have an active lending
```

The borrower gets:

```text
Borrowed from others
```

The borrowed book is read-only for the borrower.

The borrower MUST NOT be able to:

- edit the book
- delete the book
- change reading progress
- change ownership
- lend the book again

The owner may mark the book returned.

Returning:

```text
active lending → closed lending
```

and the book becomes fully available to its owner again.

---

# 5. Lending State Machine

Use this conceptual model:

```text
AVAILABLE
    |
    | lend
    v
  LENT
    |
    | return
    v
AVAILABLE
```

Invalid transitions:

```text
LENT → LENT
```

when another user attempts to borrow the same book.

```text
owner → owner
```

for self-lending.

```text
non-owner → lend
```

for ownership violations.

These must be rejected cleanly.

Prefer database-level integrity where practical in addition to application validation.

---

# 6. Reading Progress

Only books in:

```text
READING
```

should accept reading-progress updates.

Validation:

```text
current_page >= 0

current_page <= total_pages

total_pages must exist

total_pages > 0
```

Reject:

```text
negative page
page > total pages
progress without total pages
```

Never crash the application.

Return clear validation errors.

Progress percentage:

```text
progress_percentage =
    current_page / total_pages * 100
```

When:

```text
current_page == total_pages
```

automatically:

```text
status = FINISHED
finished_at = current timestamp
```

This transition must be atomic.

---

# 7. Activity Log

Record at minimum:

```text
BOOK_ADDED
BOOK_STATUS_CHANGED
BOOK_LENT
BOOK_RETURNED
SHELF_SHARED
COLLABORATOR_ROLE_CHANGED
COLLABORATOR_REMOVED
```

Recommended additional events:

```text
BOOK_ADDED_TO_SHELF
BOOK_REMOVED_FROM_SHELF
BOOK_PROGRESS_UPDATED
```

Activity events must contain enough metadata to understand:

- who performed the action
- what happened
- which book was involved, when applicable
- which shelf was involved, when applicable
- when it happened

Dashboard activity is:

```text
reverse chronological
newest first
```

---

# 8. Real-Time Architecture

WebSockets are mandatory.

Polling does NOT satisfy the requirement.

Use authenticated WebSockets.

The conceptual flow is:

```text
Command
    ↓
Domain Service
    ↓
Database Transaction
    ↓
Domain Event
    ↓
Event Dispatcher
    ├── Activity Log
    └── WebSocket Router
              ↓
       Authorized Rooms
```

## Source of truth

PostgreSQL is the source of truth.

WebSockets are a delivery mechanism.

Never make the WebSocket state authoritative.

If WebSocket connectivity fails:

```text
application continues working
```

The client can recover state through REST.

On reconnect:

```text
reconnect
    ↓
re-authenticate
    ↓
fetch current state
    ↓
synchronize UI
```

---

# 9. WebSocket Security

Never implement:

```text
event → broadcast to everyone
```

Use scoped rooms.

Conceptually:

```text
user:{user_id}

shelf:{shelf_id}
```

A connected user may receive:

```text
their own user-scoped events

events for shelves they own

events for shelves they have access to
```

A viewer must NOT receive events from unrelated shelves.

Before joining a shelf room:

```text
authenticate socket
    ↓
identify user
    ↓
verify shelf access
    ↓
join room
```

Never trust a client-provided room ID.

The server must determine access.

---

# 10. Real-Time Event Requirements

## Lending

Owner lends:

```text
Owner
  ↓
BOOK_LENT
  ↓
Borrower WebSocket
  ↓
Borrowed from others updates
```

Owner returns:

```text
BOOK_RETURNED
  ↓
Borrower WebSocket
  ↓
Book disappears from borrowed view
```

## Shared Shelf

Editor adds book:

```text
BOOK_ADDED_TO_SHELF
  ↓
shelf:{id}
  ↓
authorized collaborators
```

Editor removes book:

```text
BOOK_REMOVED_FROM_SHELF
  ↓
shelf:{id}
  ↓
authorized collaborators
```

## Activity

```text
Domain Event
    ↓
Activity Event
    ↓
user:{id}
    ↓
Dashboard feed
```

---

# 11. Architecture

Use this logical architecture:

```text
                    CLIENT
                       |
              +--------+--------+
              |                 |
           REST API         WebSocket
              |                 |
              +--------+--------+
                       |
                APPLICATION
                       |
       +---------------+---------------+
       |               |               |
    Auth/RBAC       Domain         Event System
       |               |               |
       |       +-------+-------+       |
       |       |       |       |       |
       |     Books   Shelves Lending   |
       |       |       |       |       |
       |       +-------+-------+       |
       |               |               |
       +---------------+---------------+
                       |
                 PostgreSQL
```

Keep business logic out of route/controller functions.

Controllers should:

1. validate request
2. authenticate user
3. invoke service
4. serialize response

Domain services should contain business rules.

Repositories/data-access code should handle persistence.

---

# 12. Layer Responsibilities

## API / Controller Layer

Responsible for:

- HTTP/WebSocket transport
- request parsing
- response serialization
- authentication dependency injection
- calling services

Controllers should remain thin.

Do NOT put complex business logic into routes.

---

## Service Layer

Responsible for:

- business rules
- state transitions
- authorization decisions
- transactions
- event creation

Examples:

```text
BookService
ShelfService
LendingService
ProgressService
ActivityService
AuthService
```

---

## Repository Layer

Responsible for:

- database queries
- persistence
- filtering
- pagination
- sorting
- relationship loading

Do not put business decisions into repositories.

---

# 13. Database

Use:

```text
PostgreSQL
```

Core entities:

```text
users
books
shelves
shelf_books
shelf_collaborators
lendings
activity_events
refresh_tokens
```

Expected relationships:

```text
User 1:N Book

User 1:N Shelf

Shelf M:N Book

User M:N Shelf through shelf_collaborators

Book 1:N Lending

User 1:N Lending as owner

User 1:N Lending as borrower

User 1:N ActivityEvent

User 1:N RefreshToken
```

---

# 14. Database Integrity

Prefer database constraints for invariants whenever practical.

Examples:

```text
users.email UNIQUE

books.rating CHECK 1..5

books.current_page >= 0

shelf_books PRIMARY KEY (shelf_id, book_id)

shelf_collaborators PRIMARY KEY (shelf_id, user_id)
```

Active lending should be unique per book.

Conceptually:

```sql
UNIQUE(book_id)
WHERE returned_at IS NULL
```

Do not rely exclusively on application-level checks for concurrency-sensitive rules.

---

# 15. Transactions

Business operations that modify multiple records must use transactions.

Examples:

## Delete Book

```text
BEGIN
    delete shelf relationships
    delete/close relevant references
    delete book
COMMIT
```

## Delete Shelf

```text
BEGIN
    delete shelf collaborator records
    delete shelf-book records
    delete shelf
COMMIT
```

## Lend Book

```text
BEGIN
    verify ownership
    verify borrower
    verify no active lending
    create lending
    create activity event
COMMIT
```

## Return Book

```text
BEGIN
    verify owner
    close active lending
    create activity event
COMMIT
```

## Auto-Finish

```text
BEGIN
    update current page
    update status
    set finished_at
    create activity event if applicable
COMMIT
```

---

# 16. Concurrency

The lending operation is concurrency-sensitive.

Two requests may arrive simultaneously:

```text
User A → lend Book X → User B

User A → lend Book X → User C
```

The system must never produce:

```text
Book X
 ├── active lending → B
 └── active lending → C
```

Use:

- database transaction
- appropriate locking/isolation where necessary
- unique active-lending constraint

The database must ultimately reject impossible state.

---

# 17. Authentication

Password hashing:

```text
Argon2
```

Never:

```text
plaintext password
MD5
SHA1
SHA256(password)
```

Access token:

```text
short-lived JWT
```

Refresh token:

```text
long-lived
stored securely
revocable
rotatable
```

Prefer storing a hash of the refresh token server-side rather than the raw token.

JWT should contain only necessary claims.

Never place:

```text
password
refresh token
sensitive private data
```

inside JWT claims.

---

# 18. Refresh Token Rotation

Preferred flow:

```text
Client
  |
  | refresh token
  v
POST /auth/refresh
  |
  v
Validate token
  |
  v
Check expiry/revocation
  |
  v
Revoke/rotate old token
  |
  v
Issue new access token
  |
  v
Issue new refresh token
```

If refresh token is invalid:

```text
401
```

Frontend should:

```text
receive 401
    ↓
attempt refresh once
    ↓
retry original request
```

Avoid infinite retry loops.

If refresh fails:

```text
clear authentication state
redirect to login
```

---

# 19. API Conventions

Use predictable REST endpoints.

Suggested structure:

```text
POST   /auth/signup
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /books
POST   /books
GET    /books/{book_id}
PATCH  /books/{book_id}
DELETE /books/{book_id}

PATCH  /books/{book_id}/progress

GET    /shelves
POST   /shelves
GET    /shelves/{shelf_id}
DELETE /shelves/{shelf_id}

POST   /shelves/{shelf_id}/books/{book_id}
DELETE /shelves/{shelf_id}/books/{book_id}

GET    /shelves/shared-with-me

POST   /shelves/{shelf_id}/collaborators
PATCH  /shelves/{shelf_id}/collaborators/{user_id}
DELETE /shelves/{shelf_id}/collaborators/{user_id}

POST   /books/{book_id}/lend
POST   /books/{book_id}/return

GET    /borrowed

GET    /activity
GET    /dashboard

WS     /ws
```

Exact naming may evolve, but remain consistent.

---

# 20. API Response Principles

Use meaningful HTTP status codes.

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
```

Examples:

```text
Unauthenticated → 401

Authenticated but unauthorized → 403

Book doesn't exist → 404

Book already lent → 409

Self lending → 400 or 422

Invalid page → 422
```

Do not return `200` for failed mutations.

---

# 21. Error Contract

Errors must be predictable.

Example:

```json
{
  "error": {
    "code": "PAGE_EXCEEDS_TOTAL",
    "message": "Current page cannot exceed total pages"
  }
}
```

Use machine-readable error codes.

Frontend should map known validation errors to inline UI.

Never rely on raw exception strings.

Never expose stack traces to clients.

---

# 22. Pagination

All large collection endpoints must support server-side pagination.

Preferred contract:

```text
?page=1
&page_size=20
&search=clean
&status=READING
&sort_by=rating
&sort_order=desc
```

Backend performs:

```text
filter
    ↓
search
    ↓
sort
    ↓
offset/limit
```

NOT:

```text
database → fetch everything → Python slice
```

Return metadata:

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 100,
  "total_pages": 5
}
```

---

# 23. Search

Book search must support:

```text
title
author
```

Status filtering and search must work together.

Example:

```text
status=READING
search=martin
```

means:

```text
status == READING
AND
(title OR author contains "martin")
```

Not:

```text
status OR search
```

---

# 24. Frontend Architecture

Use:

```text
Next.js / React
```

Organize by domain rather than creating one giant components directory.

Suggested:

```text
src/
├── app/
├── components/
├── features/
│   ├── auth/
│   ├── books/
│   ├── shelves/
│   ├── lending/
│   ├── dashboard/
│   └── activity/
├── lib/
│   ├── api/
│   ├── auth/
│   ├── websocket/
│   └── validation/
├── hooks/
├── types/
└── utils/
```

Avoid unnecessary global state.

Use local state where possible.

Use a server-state/data-fetching solution only where it provides clear value.

---

# 25. Frontend UX Requirements

Every data-loading view must have:

```text
loading state
success state
empty state
error state
```

Never:

```text
blank screen
```

when an API request fails.

Forms must show inline validation.

Example:

```text
Current page
[ 150 ]

Page cannot exceed total pages
```

not:

```text
alert("error")
```

Buttons that trigger requests must:

```text
disable while request is pending
show progress/loading state
prevent double submission
```

---

# 26. Optimistic UI

Optimistic updates are optional.

Do not use optimistic UI for every mutation just because it looks advanced.

Use it only where:

```text
operation is low-risk
rollback is straightforward
UX benefit is meaningful
```

If used:

```text
UI update
    ↓
API request
    ↓
success → keep state
failure → rollback
```

Never allow optimistic state to permanently diverge from PostgreSQL.

---

# 27. WebSocket Client

Client responsibilities:

```text
connect
authenticate
subscribe/join authorized rooms
handle events
update UI
reconnect
resynchronize state
disconnect cleanly
```

Reconnect strategy should use bounded exponential backoff.

Avoid infinite rapid reconnect loops.

Example conceptual sequence:

```text
1s
2s
4s
8s
16s
30s max
```

After reconnect:

```text
REST fetch current state
```

because the client may have missed events while disconnected.

---

# 28. Event Design

Events should be structured.

Example:

```json
{
  "type": "BOOK_LENT",
  "event_id": "uuid",
  "timestamp": "ISO-8601",
  "actor_id": "uuid",
  "target_user_id": "uuid",
  "book_id": "uuid",
  "shelf_id": null,
  "data": {}
}
```

Do not send arbitrary UI-specific blobs from domain services.

Events represent meaningful domain facts.

---

# 29. Idempotency

Where practical, mutations should behave safely under retries.

Especially:

```text
return book
refresh token
WebSocket reconnect
```

Avoid duplicate activity events when a mutation is retried after an ambiguous network failure.

If strict idempotency is introduced, document the strategy.

Do not build a complex distributed idempotency system unless necessary.

---

# 30. Logging

Use structured logs.

Log:

```text
request_id
user_id
operation
resource_id
status
duration
error_code
```

Never log:

```text
password
JWT
refresh token
raw authorization header
```

Development logs may be verbose.

Production-oriented logs must avoid secrets.

---

# 31. Configuration

Use environment variables.

Required configuration should be represented in:

```text
.env.example
```

Never commit:

```text
.env
real credentials
API keys
database passwords
JWT secrets
```

Fail fast when required configuration is missing.

---

# 32. Seed Data

The repository must include a deterministic seed script.

At minimum create:

```text
User A
User B
```

Sample:

```text
multiple books
multiple shelves
shared shelf
editor role
viewer role
active lending
```

The seed environment should allow the evaluator to immediately test:

```text
authentication
books
shelves
RBAC
lending
real-time updates
dashboard
activity
```

Do not make the evaluator manually construct the entire scenario.

---

# 33. Testing Strategy

Prioritize business invariants over superficial coverage.

Critical tests:

## Auth

```text
signup
duplicate email
wrong password
login
refresh
logout
expired access token
```

## Books

```text
CRUD
ownership
filter
search
pagination
sorting
rating validation
```

## Shelves

```text
create
many-to-many
add book
remove book
delete shelf
delete book cleanup
```

## RBAC

```text
owner permissions
editor permissions
viewer permissions
direct API rejection
```

## Lending

```text
valid lending
self lending rejection
non-owner rejection
unknown borrower rejection
double lending rejection
return
borrower read-only
```

## Progress

```text
negative page
page > total
missing total pages
percentage
auto finish
finished date
```

## WebSockets

```text
authentication
authorized room
unauthorized room
lending event
return event
shelf event
activity event
reconnect
```

---

# 34. Testing Philosophy

Prefer:

```text
Arrange
Act
Assert
```

Tests should communicate business rules.

Bad:

```text
test_service_method_17()
```

Good:

```text
test_viewer_cannot_add_book_to_shared_shelf()
```

Good tests should make the domain understandable.

---

# 35. Docker

Docker is a stretch goal.

If implemented:

```text
frontend
backend
postgres
```

should start with one command.

Potential:

```bash
docker compose up
```

Do not introduce Docker complexity that prevents a clean local development workflow.

---

# 36. Dependency Discipline

Before adding a dependency ask:

1. Does the standard library already solve this?
2. Does an existing dependency already solve this?
3. Does this materially simplify the architecture?
4. Can the team explain the dependency?

Avoid dependency bloat.

Every major dependency must have a reason.

---

# 37. AI Usage Policy

AI tools are allowed.

Use AI to:

- explore implementation options
- generate boilerplate
- debug
- explain unfamiliar concepts
- write tests
- improve documentation
- identify edge cases

Do NOT:

- blindly paste generated code
- introduce architecture you cannot explain
- use libraries without understanding them
- let AI decide business invariants without review
- claim authorship of code you cannot defend

Before submission:

```text
Read everything.
Understand everything.
Test everything.
```

The assessment explicitly says the follow-up interview may involve selecting code, asking for explanations, making live changes, and debugging.

README must include:

```text
where AI was used
what was learned
what was changed
```

---

# 38. Git Strategy

Commit frequently.

Do NOT produce:

```text
initial commit
final commit
```

Preferred progression:

```text
chore: initialize repository

docs: add system architecture

feat: add database models

feat: add authentication

feat: add refresh token rotation

feat: add book CRUD

feat: add server-side book filtering

feat: add shelves

feat: add shelf book relationships

feat: add shelf RBAC

feat: add reading progress

feat: add lending workflow

feat: add activity events

feat: add websocket authentication

feat: add realtime lending updates

feat: add realtime shelf updates

feat: add dashboard

test: add lending invariants

test: add shelf authorization tests

chore: add seed data

docs: add setup instructions

docs: document websocket architecture
```

Commits should represent coherent engineering changes.

---

# 39. Code Style

Prefer:

```text
small functions
explicit names
typed interfaces
clear dependencies
single responsibility
```

Avoid:

```text
god classes
god controllers
1000-line services
deeply nested conditionals
magic strings
duplicated authorization logic
duplicated validation
```

Use domain-specific names.

Prefer:

```python
lend_book()
return_book()
add_book_to_shelf()
change_collaborator_role()
```

over:

```python
update_record()
process_data()
handle_request()
```

---

# 40. Architecture Decision Rule

When two implementations are both valid:

Prefer the one that is:

1. simpler
2. easier to test
3. easier to explain
4. safer under concurrency
5. easier to extend
6. consistent with the existing architecture

Do NOT choose technology because:

```text
"it sounds impressive"
```

---

# 41. Do Not Overengineer

Do NOT build:

```text
microservices
Kubernetes
Kafka
event sourcing
CQRS everywhere
GraphQL
AI recommendation engine
vector database
full-text search cluster
distributed locks
complex notification infrastructure
```

unless a real requirement appears.

BookNest is intentionally small.

The architectural challenge is in:

```text
relationships
authorization
state
transactions
real-time communication
```

not infrastructure theater.

---

# 42. Optional Redis

Redis may be introduced for:

```text
WebSocket event fan-out
multi-instance coordination
```

Do not make Redis a mandatory dependency unless the deployment architecture requires it.

For a single backend instance:

```text
in-process event dispatcher
```

may be sufficient.

For multiple instances:

```text
Backend A ──┐
            ├── Redis Pub/Sub
Backend B ──┘
```

This distinction must be documented.

---

# 43. Security Checklist

Before submission verify:

```text
[ ] Passwords are Argon2 hashed
[ ] No plaintext passwords
[ ] JWT secrets come from environment
[ ] Refresh tokens are protected
[ ] Refresh tokens can be revoked
[ ] Protected routes require authentication
[ ] Ownership is checked server-side
[ ] RBAC is checked server-side
[ ] Borrowers cannot mutate owner's books
[ ] WebSockets require authentication
[ ] WebSocket room access is authorized
[ ] No global event broadcasting
[ ] Secrets are not logged
[ ] SQL injection is prevented through ORM/parameterization
[ ] Validation occurs at API boundaries
[ ] Database constraints protect critical invariants
```

---

# 44. Performance Checklist

Do not optimize prematurely.

But avoid obvious problems:

```text
[ ] Server-side pagination
[ ] Database-level filtering
[ ] Database-level sorting
[ ] Appropriate indexes
[ ] No N+1 queries in dashboard
[ ] Efficient shelf/book joins
[ ] Efficient activity queries
[ ] WebSocket events are scoped
```

Potential indexes:

```text
users(email)

books(owner_id)
books(status)
books(created_at)
books(rating)

shelves(owner_id)

shelf_books(shelf_id)
shelf_books(book_id)

shelf_collaborators(user_id)
shelf_collaborators(shelf_id)

lendings(book_id)
lendings(borrower_id)
lendings(owner_id)

activity_events(actor_id)
activity_events(target_user_id)
activity_events(created_at)
```

---

# 45. Dashboard

Dashboard must show:

```text
books by status

books finished this year

average rating

shelf with most books

books currently lent out

shelves shared with user

recent activity
```

Dashboard data should be calculated from real database state.

Do not maintain unnecessary duplicated counters unless there is a demonstrated need.

---

# 46. Definition of Done

A feature is NOT done merely because its endpoint works.

A feature is done when:

```text
API implemented
database behavior correct
authorization correct
validation correct
errors handled
frontend integrated
loading state exists
error state exists
tests exist where critical
activity event exists where applicable
WebSocket event exists where applicable
documentation updated
```

---

# 47. Definition of Done — Core Assessment

Before submission:

```text
[ ] Signup works
[ ] Login works
[ ] Logout works
[ ] Refresh works
[ ] Passwords are hashed
[ ] Book CRUD works
[ ] Search works
[ ] Status filter works
[ ] Search + filter work together
[ ] Pagination is server-side
[ ] Sorting is server-side
[ ] Shelves work
[ ] Many-to-many relationship works
[ ] Shelf deletion preserves books
[ ] Book deletion cleans relationships
[ ] Owner permissions work
[ ] Editor permissions work
[ ] Viewer permissions work
[ ] Direct unauthorized API calls fail
[ ] Shared-with-me works
[ ] Progress validation works
[ ] Auto-finish works
[ ] Lending works
[ ] Self-lending fails
[ ] Non-owner lending fails
[ ] Double lending fails
[ ] Borrowed view works
[ ] Borrower cannot edit owner's book
[ ] Return works
[ ] Activity log works
[ ] Lending updates live
[ ] Return updates live
[ ] Shelf updates live
[ ] Activity updates live
[ ] WebSocket authentication works
[ ] WebSocket event scoping works
[ ] Reconnect works
[ ] Dashboard works
[ ] Loading states exist
[ ] Error states exist
[ ] Inline validation exists
[ ] Buttons prevent double-submit
```

---

# 48. Submission Requirements

Repository must contain:

```text
README.md
.env.example
seed script
source code
tests
database migrations
```

README must document:

```text
what the app does

how to run it

data model

stack and why

refresh-token flow

RBAC enforcement

WebSocket authentication

WebSocket event scoping

disconnect/reconnect strategy

hardest engineering problems

known issues

future improvements

AI usage
```

The assignment explicitly requires these README topics.

---

# 49. Demo Strategy

Target:

```text
4–6 minutes
```

Use:

```text
two browser windows
```

Demo sequence:

```text
1. Sign up User A
2. Sign up User B

3. User A creates books

4. User A creates shelf

5. Share shelf with User B as editor

6. Show User B as editor

7. Attempt viewer-style restriction where applicable

8. User B adds book

9. Show book appearing live for User A

10. Update reading progress

11. Reach total pages

12. Show automatic Finished state

13. User A lends book to User B

14. Show book appearing live in User B's borrowed view

15. Return book

16. Show it disappearing live

17. Show dashboard

18. Show activity feed
```

Do not spend the demo explaining basic CRUD.

Spend time explaining:

```text
RBAC
transactions
state transitions
WebSocket scoping
event architecture
```

---

# 50. Interview Defense Principles

Be prepared to answer:

### Why PostgreSQL?

Because BookNest has:

```text
users
books
shelves
many-to-many relationships
collaborators
lending
activity
```

and requires strong relational integrity.

### Why WebSockets?

Because the assignment explicitly requires live updates and polling is not accepted.

### Why domain events?

Because a single mutation can affect:

```text
database
activity feed
multiple connected users
```

and event-based separation keeps those concerns decoupled.

### Why not make WebSocket the source of truth?

Because network delivery is unreliable.

Database state must remain authoritative.

### Why enforce RBAC in backend?

Because frontend controls are not security boundaries.

### Why transactions?

Because lending and shelf operations can modify multiple related records atomically.

### Why a unique active lending constraint?

Because application-level checks alone are vulnerable to concurrent requests.

---

# 51. Engineering North Star

Whenever implementation becomes ambiguous, ask:

> **What invariant must always remain true?**

Examples:

```text
A book has exactly one owner.

A viewer cannot mutate a shelf.

A borrower cannot mutate the owner's book.

A book cannot have two active lendings.

A page cannot exceed total pages.

A finished book has a finished date.

An unauthorized user cannot receive shelf events.

PostgreSQL remains the source of truth.
```

Then design the code around protecting that invariant.

---

# 52. Implementation Order

Build in this order:

```text
PHASE 0
Repository + architecture + tooling

PHASE 1
Database schema + migrations

PHASE 2
Authentication + JWT + refresh rotation

PHASE 3
Book domain

PHASE 4
Server-side filtering/search/pagination/sorting

PHASE 5
Shelves + many-to-many

PHASE 6
RBAC

PHASE 7
Reading progress

PHASE 8
Lending

PHASE 9
Activity events

PHASE 10
WebSocket authentication

PHASE 11
WebSocket event routing

PHASE 12
Dashboard

PHASE 13
Frontend polish

PHASE 14
Critical-path tests

PHASE 15
Seed data

PHASE 16
Docker if stable

PHASE 17
README + diagrams

PHASE 18
Demo rehearsal

PHASE 19
Security + edge-case review
```

Do not jump directly into UI polish.

---

# 53. Agent Workflow

Every coding agent MUST follow this workflow:

```text
UNDERSTAND
    ↓
INSPECT EXISTING CODE
    ↓
IDENTIFY DOMAIN INVARIANTS
    ↓
PLAN MINIMAL CHANGE
    ↓
IMPLEMENT
    ↓
RUN TESTS
    ↓
REVIEW DIFF
    ↓
CHECK SECURITY
    ↓
UPDATE DOCUMENTATION
```

Never modify unrelated code.

Before changing architecture:

```text
explain why
identify affected modules
identify migration impact
identify test impact
```

---

# 54. Agent Rules

An agent MUST NOT:

- rewrite working code unnecessarily
- introduce dependencies without justification
- bypass tests
- disable validation
- weaken authorization
- expose secrets
- duplicate business logic
- silently change database semantics
- silently change API contracts
- delete tests to make the suite pass
- suppress errors instead of fixing them
- use frontend-only authorization
- broadcast private WebSocket events globally

An agent SHOULD:

- prefer minimal diffs
- preserve existing abstractions
- add tests for important behavior
- explain tradeoffs
- update docs after architectural changes
- keep commits focused
- use explicit names
- preserve backward compatibility where practical

---

# 55. Final Quality Gate

Before declaring BookNest complete, perform a hostile review.

Pretend you are the evaluator.

Try:

```text
Can User A access User B's book?

Can Viewer mutate a shelf through curl?

Can Editor delete a shelf?

Can Borrower edit a borrowed book?

Can a book be lent twice concurrently?

Can a user lend a book to themselves?

Can an invalid page crash the API?

Can an unauthenticated socket connect?

Can a viewer subscribe to an unauthorized shelf?

What happens if WebSocket disconnects?

What happens if refresh token expires?

What happens if refresh happens twice?

What happens if the same request is retried?

What happens if a shelf is deleted?

What happens if a book is deleted?

Are orphaned relationships possible?

Are private events leaked?

Does pagination actually happen in PostgreSQL?

Does dashboard query efficiently?

Can the project run from a clean clone?
```

If any answer is unclear:

> **The system is not finished.**

---

# 56. Final Principle

BookNest should look simple from the outside.

Underneath, it should demonstrate:

```text
                    BOOKNEST
                       |
        +--------------+--------------+
        |              |              |
      STATE         SECURITY       REAL-TIME
        |              |              |
   Transactions      RBAC          WebSockets
        |              |              |
        +--------------+--------------+
                       |
                 DOMAIN EVENTS
                       |
              +--------+--------+
              |                 |
          Activity          Live UI
```

The objective is not to build the largest BookNest.

The objective is to build the **smallest system that demonstrates mature engineering judgment**.

When choosing between:

```text
more features
```

and:

```text
better invariants
```

choose better invariants.

When choosing between:

```text
more abstraction
```

and:

```text
simpler architecture
```

choose simpler architecture.

When choosing between:

```text
AI-generated code
```

and:

```text
code you completely understand
```

choose code you completely understand.

When choosing between:

```text
demo magic
```

and:

```text
real system behavior
```

choose real system behavior.

---

# BOOKNEST NORTH STAR

```text
                    ┌─────────────────────┐
                    │       BOOKNEST      │
                    └──────────┬──────────┘
                               │
                  ┌────────────┴────────────┐
                  │                         │
             SOURCE OF TRUTH          USER EXPERIENCE
                  │                         │
              PostgreSQL              Next.js
                  │                         │
             Transactions             REST + WSS
                  │                         │
             Domain Events             Live State
                  │                         │
          ┌───────┴────────┐        ┌──────┴──────┐
          │                │        │             │
       Activity          RBAC    Loading       Errors
          │                │        │             │
          └────────┬───────┘        └──────┬──────┘
                   │                       │
                   └───────────┬───────────┘
                               │
                    PRODUCTION-MINDED
                         BOOKNEST
```

**Build deliberately.  
Keep the core small.  
Protect the invariants.  
Make every decision explainable.**