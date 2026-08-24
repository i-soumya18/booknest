import uuid

import pytest

from app.schemas.book import BookSortByEnum, BookStatusEnum, SortOrderEnum


def _create_user_and_login(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    access_token = signup_resp.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    return headers, signup_resp.json()["user"]["id"]


# ============================================================================
# 1. Add / Create Book (POST /api/v1/books)
# ============================================================================


@pytest.mark.parametrize("status_val", ["WANT_TO_READ", "READING", "FINISHED"])
def test_create_book_with_all_fields_and_statuses(client, status_val):
    """Verify creating a book with all supported fields across all statuses."""
    headers, _ = _create_user_and_login(
        client, f"author_{status_val.lower()}@example.com", "Author"
    )

    resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": f"Book in {status_val}",
            "author": "F. Scott Fitzgerald",
            "status": status_val,
            "total_pages": 300,
            "current_page": 300 if status_val == "FINISHED" else 50,
            "rating": 5,
            "notes": "Classic American literature",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == f"Book in {status_val}"
    assert data["author"] == "F. Scott Fitzgerald"
    assert data["status"] == status_val
    assert data["total_pages"] == 300
    assert data["rating"] == 5
    assert data["notes"] == "Classic American literature"
    assert "id" in data
    assert "owner_id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_book_minimal_defaults(client):
    """Verify creating a book with only required fields uses correct defaults."""
    headers, _ = _create_user_and_login(client, "minimal@example.com", "Minimal User")

    resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Minimalist Book",
            "author": "Minimal Author",
            "total_pages": 150,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Minimalist Book"
    assert data["status"] == "WANT_TO_READ"  # Default
    assert data["current_page"] == 0  # Default
    assert data["rating"] is None  # Optional
    assert data["notes"] is None  # Optional


def test_create_book_strips_whitespace(client):
    """Verify title, author, and notes are cleanly stripped of excess whitespace."""
    headers, _ = _create_user_and_login(client, "strip@example.com", "Strip User")

    resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "   The Great Gatsby   ",
            "author": "   F. Scott Fitzgerald   ",
            "status": "READING",
            "total_pages": 200,
            "notes": "   An interesting note.   ",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "The Great Gatsby"
    assert data["author"] == "F. Scott Fitzgerald"
    assert data["notes"] == "An interesting note."


@pytest.mark.parametrize(
    "invalid_payload,reason",
    [
        ({"author": "Author", "total_pages": 100}, "Missing title"),
        ({"title": "", "author": "Author", "total_pages": 100}, "Empty title"),
        ({"title": "   ", "author": "Author", "total_pages": 100}, "Whitespace title"),
        (
            {"title": "T" * 256, "author": "Author", "total_pages": 100},
            "Title exceeds 255 chars",
        ),
        ({"title": "Title", "total_pages": 100}, "Missing author"),
        ({"title": "Title", "author": "", "total_pages": 100}, "Empty author"),
        ({"title": "Title", "author": "   ", "total_pages": 100}, "Whitespace author"),
        (
            {"title": "Title", "author": "A" * 256, "total_pages": 100},
            "Author exceeds 255 chars",
        ),
        ({"title": "Title", "author": "Author"}, "Missing total_pages"),
        ({"title": "Title", "author": "Author", "total_pages": 0}, "total_pages is zero"),
        ({"title": "Title", "author": "Author", "total_pages": -10}, "total_pages is negative"),
        (
            {"title": "Title", "author": "Author", "total_pages": 100, "current_page": -1},
            "current_page is negative",
        ),
        (
            {"title": "Title", "author": "Author", "total_pages": 100, "current_page": 105},
            "current_page exceeds total_pages",
        ),
        (
            {"title": "Title", "author": "Author", "total_pages": 100, "status": "INVALID_STATUS"},
            "Invalid status enum",
        ),
        (
            {"title": "Title", "author": "Author", "total_pages": 100, "rating": 0},
            "Rating below 1",
        ),
        (
            {"title": "Title", "author": "Author", "total_pages": 100, "rating": 6},
            "Rating above 5",
        ),
    ],
)
def test_create_book_validation_failures(client, invalid_payload, reason):
    """Verify validation errors when attempting to create a book with invalid inputs."""
    headers, _ = _create_user_and_login(
        client, f"invalid_{uuid.uuid4().hex[:6]}@example.com", "Validator"
    )

    resp = client.post("/api/v1/books", headers=headers, json=invalid_payload)
    assert resp.status_code == 422, f"Failed on {reason}"


def test_create_book_unauthenticated_rejected(client):
    """Verify unauthenticated book creation returns 401."""
    resp = client.post(
        "/api/v1/books",
        json={"title": "Unauthorized Book", "author": "Ghost", "total_pages": 100},
    )
    assert resp.status_code == 401


# ============================================================================
# 2. Retrieve Book (GET /api/v1/books/{id})
# ============================================================================


def test_get_book_success_and_errors(client):
    """Verify retrieving a book by ID, handling non-existent and invalid IDs."""
    headers, _ = _create_user_and_login(client, "getter@example.com", "Getter User")

    create_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Moby Dick",
            "author": "Herman Melville",
            "status": "READING",
            "total_pages": 635,
            "rating": 4,
            "notes": "Call me Ishmael",
        },
    )
    book_id = create_resp.json()["id"]

    # 1. Success
    get_resp = client.get(f"/api/v1/books/{book_id}", headers=headers)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["title"] == "Moby Dick"
    assert data["author"] == "Herman Melville"
    assert data["status"] == "READING"
    assert data["total_pages"] == 635
    assert data["rating"] == 4
    assert data["notes"] == "Call me Ishmael"

    # 2. Non-existent UUID
    non_existent = str(uuid.uuid4())
    not_found_resp = client.get(f"/api/v1/books/{non_existent}", headers=headers)
    assert not_found_resp.status_code == 404
    assert not_found_resp.json()["detail"]["error"]["code"] == "BOOK_NOT_FOUND"

    # 3. Invalid UUID format
    invalid_uuid_resp = client.get("/api/v1/books/not-a-valid-uuid", headers=headers)
    assert invalid_uuid_resp.status_code == 422

    # 4. Unauthenticated
    unauth_resp = client.get(f"/api/v1/books/{book_id}")
    assert unauth_resp.status_code == 401


# ============================================================================
# 3. Update Book (PUT /api/v1/books/{id})
# ============================================================================


def test_update_book_full_and_partial(client):
    """Verify full and partial updates to book metadata."""
    headers, _ = _create_user_and_login(client, "updater@example.com", "Updater User")

    create_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Original Title",
            "author": "Original Author",
            "status": "WANT_TO_READ",
            "total_pages": 300,
            "rating": 3,
            "notes": "First thoughts",
        },
    )
    book_id = create_resp.json()["id"]

    # Partial update: title and rating only
    up1 = client.put(
        f"/api/v1/books/{book_id}",
        headers=headers,
        json={"title": "Updated Title", "rating": 5},
    )
    assert up1.status_code == 200
    data1 = up1.json()
    assert data1["title"] == "Updated Title"
    assert data1["author"] == "Original Author"  # Preserved
    assert data1["rating"] == 5

    # Update status to FINISHED and clear rating
    up2 = client.put(
        f"/api/v1/books/{book_id}",
        headers=headers,
        json={"status": "FINISHED", "rating": None, "notes": "Completed!"},
    )
    assert up2.status_code == 200
    data2 = up2.json()
    assert data2["status"] == "FINISHED"
    assert data2["notes"] == "Completed!"


def test_update_book_page_count_validation(client):
    """Verify invalid page count updates are rejected."""
    headers, _ = _create_user_and_login(client, "pagevalid@example.com", "Page Validator")

    create_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={
            "title": "Page Book",
            "author": "Author",
            "status": "READING",
            "total_pages": 200,
            "current_page": 100,
        },
    )
    book_id = create_resp.json()["id"]

    # 1. Update current_page to exceed existing total_pages (200)
    resp1 = client.put(
        f"/api/v1/books/{book_id}",
        headers=headers,
        json={"current_page": 250},
    )
    assert resp1.status_code == 422
    assert resp1.json()["detail"]["error"]["code"] == "INVALID_PAGE_COUNT"

    # 2. Update total_pages below existing current_page (100)
    resp2 = client.put(
        f"/api/v1/books/{book_id}",
        headers=headers,
        json={"total_pages": 50},
    )
    assert resp2.status_code == 422
    assert resp2.json()["detail"]["error"]["code"] == "INVALID_PAGE_COUNT"


# ============================================================================
# 4. Delete Book (DELETE /api/v1/books/{id})
# ============================================================================


def test_delete_book_success_and_cascade(client):
    """Verify deleting a book removes it and subsequent gets return 404."""
    headers, _ = _create_user_and_login(client, "deleter@example.com", "Deleter User")

    create_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "To Be Deleted", "author": "Doomed Author", "total_pages": 100},
    )
    book_id = create_resp.json()["id"]

    # Delete
    del_resp = client.delete(f"/api/v1/books/{book_id}", headers=headers)
    assert del_resp.status_code == 204

    # Subsequent GET returns 404
    get_resp = client.get(f"/api/v1/books/{book_id}", headers=headers)
    assert get_resp.status_code == 404

    # Non-existent delete returns 404
    del_again = client.delete(f"/api/v1/books/{book_id}", headers=headers)
    assert del_again.status_code == 404


# ============================================================================
# 5. List, Filter, Search, Sort & Pagination (GET /api/v1/books)
# ============================================================================


def test_list_books_empty_for_new_user(client):
    """Verify a newly registered user gets an empty paginated list."""
    headers, _ = _create_user_and_login(client, "empty@example.com", "Empty User")

    resp = client.get("/api/v1/books", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["total_pages"] == 0
    assert data["page"] == 1
    assert data["page_size"] == 20


def test_combined_filter_and_search_active_together(client):
    """Verify combined filtering (by status) AND search (title/author) active together."""
    headers, _ = _create_user_and_login(client, "filtersearch@example.com", "Search Pro")

    # Seed 6 distinct books
    books = [
        {
            "title": "Harry Potter and the Sorcerer's Stone",
            "author": "J.K. Rowling",
            "status": "FINISHED",
            "rating": 5,
            "total_pages": 309,
        },
        {
            "title": "Harry Potter and the Chamber of Secrets",
            "author": "J.K. Rowling",
            "status": "READING",
            "rating": 4,
            "total_pages": 341,
        },
        {
            "title": "Harry Potter and the Prisoner of Azkaban",
            "author": "J.K. Rowling",
            "status": "WANT_TO_READ",
            "rating": None,
            "total_pages": 435,
        },
        {
            "title": "The Lord of the Rings: The Fellowship of the Ring",
            "author": "J.R.R. Tolkien",
            "status": "FINISHED",
            "rating": 5,
            "total_pages": 423,
        },
        {
            "title": "The Lord of the Rings: The Two Towers",
            "author": "J.R.R. Tolkien",
            "status": "READING",
            "rating": 4,
            "total_pages": 352,
        },
        {
            "title": "A Game of Thrones",
            "author": "George R.R. Martin",
            "status": "WANT_TO_READ",
            "rating": None,
            "total_pages": 694,
        },
    ]

    for b in books:
        r = client.post("/api/v1/books", headers=headers, json=b)
        assert r.status_code == 201

    # Case 1: Status=READING alone -> 2 books (Chamber of Secrets, Two Towers)
    r1 = client.get("/api/v1/books?status=READING", headers=headers).json()
    assert r1["total"] == 2
    assert {b["title"] for b in r1["items"]} == {
        "Harry Potter and the Chamber of Secrets",
        "The Lord of the Rings: The Two Towers",
    }

    # Case 2: Search "Rowling" (author) alone -> 3 books
    r2 = client.get("/api/v1/books?search=Rowling", headers=headers).json()
    assert r2["total"] == 3

    # Case 3: Search "Potter" (title) alone -> 3 books
    r3 = client.get("/api/v1/books?search=Potter", headers=headers).json()
    assert r3["total"] == 3

    # Case 4: COMBINED status=READING AND search=Rowling -> Exactly 1 book
    r4 = client.get("/api/v1/books?status=READING&search=Rowling", headers=headers).json()
    assert r4["total"] == 1
    assert r4["items"][0]["title"] == "Harry Potter and the Chamber of Secrets"
    assert r4["items"][0]["status"] == "READING"
    assert r4["items"][0]["author"] == "J.K. Rowling"

    # Case 5: COMBINED status=FINISHED AND search=Tolkien -> Exactly 1 book (Fellowship)
    r5 = client.get("/api/v1/books?status=FINISHED&search=Tolkien", headers=headers).json()
    assert r5["total"] == 1
    assert (
        r5["items"][0]["title"] == "The Lord of the Rings: The Fellowship of the Ring"
    )

    # Case 6: COMBINED status=FINISHED AND search=Martin -> 0 books (Martin's book is WANT_TO_READ)
    r6 = client.get("/api/v1/books?status=FINISHED&search=Martin", headers=headers).json()
    assert r6["total"] == 0
    assert r6["items"] == []

    # Case 7: Case-insensitive search ("tolkien", "TOLKIEN", "tOlKiEn")
    r7 = client.get("/api/v1/books?search=tOlKiEn", headers=headers).json()
    assert r7["total"] == 2


def test_pagination_and_sorting_exhaustive(client):
    """Verify pagination limits, out-of-bounds pages, and multi-field sorting."""
    headers, _ = _create_user_and_login(client, "sortpage@example.com", "Sort Page User")

    # Create 5 books with distinct titles and ratings
    books_data = [
        {"title": "Alpha Book", "author": "Author A", "total_pages": 100, "rating": 2},
        {"title": "Bravo Book", "author": "Author B", "total_pages": 200, "rating": 5},
        {"title": "Charlie Book", "author": "Author C", "total_pages": 300, "rating": 1},
        {"title": "Delta Book", "author": "Author D", "total_pages": 400, "rating": 4},
        {"title": "Echo Book", "author": "Author E", "total_pages": 500, "rating": 3},
    ]
    for b in books_data:
        client.post("/api/v1/books", headers=headers, json=b)

    # 1. Pagination navigation (page_size=2)
    p1 = client.get("/api/v1/books?page=1&page_size=2", headers=headers).json()
    assert p1["page"] == 1
    assert p1["page_size"] == 2
    assert p1["total"] == 5
    assert p1["total_pages"] == 3
    assert len(p1["items"]) == 2

    p2 = client.get("/api/v1/books?page=2&page_size=2", headers=headers).json()
    assert p2["page"] == 2
    assert len(p2["items"]) == 2

    p3 = client.get("/api/v1/books?page=3&page_size=2", headers=headers).json()
    assert p3["page"] == 3
    assert len(p3["items"]) == 1

    # Out of bounds page
    p4 = client.get("/api/v1/books?page=10&page_size=2", headers=headers).json()
    assert p4["items"] == []
    assert p4["total"] == 5

    # 2. Sort by title ASC
    sort_title_asc = client.get(
        "/api/v1/books?sort_by=title&sort_order=asc", headers=headers
    ).json()
    titles_asc = [b["title"] for b in sort_title_asc["items"]]
    assert titles_asc == [
        "Alpha Book",
        "Bravo Book",
        "Charlie Book",
        "Delta Book",
        "Echo Book",
    ]

    # 3. Sort by title DESC
    sort_title_desc = client.get(
        "/api/v1/books?sort_by=title&sort_order=desc", headers=headers
    ).json()
    titles_desc = [b["title"] for b in sort_title_desc["items"]]
    assert titles_desc == [
        "Echo Book",
        "Delta Book",
        "Charlie Book",
        "Bravo Book",
        "Alpha Book",
    ]

    # 4. Sort by rating DESC (nulls last)
    sort_rating_desc = client.get(
        "/api/v1/books?sort_by=rating&sort_order=desc", headers=headers
    ).json()
    ratings_desc = [b["rating"] for b in sort_rating_desc["items"]]
    assert ratings_desc == [5, 4, 3, 2, 1]

    # 5. Sort by rating ASC (nulls last)
    sort_rating_asc = client.get(
        "/api/v1/books?sort_by=rating&sort_order=asc", headers=headers
    ).json()
    ratings_asc = [b["rating"] for b in sort_rating_asc["items"]]
    assert ratings_asc == [1, 2, 3, 4, 5]

    # 6. Invalid pagination query parameters
    assert (
        client.get("/api/v1/books?page=0", headers=headers).status_code == 422
    )  # ge=1
    assert (
        client.get("/api/v1/books?page_size=0", headers=headers).status_code == 422
    )  # ge=1
    assert (
        client.get("/api/v1/books?page_size=101", headers=headers).status_code == 422
    )  # le=100


def test_server_side_sorting_rating_with_unrated_books(client):
    """Verify that sorting by rating handles unrated (NULL rating) books correctly with nulls last."""
    headers, _ = _create_user_and_login(client, "nullrating@example.com", "Null Rating User")

    # Create mix of rated and unrated books
    client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Five Star Book", "author": "Author A", "total_pages": 100, "rating": 5},
    )
    client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Unrated Book 1", "author": "Author B", "total_pages": 200, "rating": None},
    )
    client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Three Star Book", "author": "Author C", "total_pages": 300, "rating": 3},
    )
    client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Unrated Book 2", "author": "Author D", "total_pages": 400, "rating": None},
    )
    client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "One Star Book", "author": "Author E", "total_pages": 500, "rating": 1},
    )

    # Sort DESC: 5, 3, 1, None, None
    r_desc = client.get("/api/v1/books?sort_by=rating&sort_order=desc", headers=headers).json()
    ratings_desc = [b["rating"] for b in r_desc["items"]]
    assert ratings_desc[:3] == [5, 3, 1]
    assert ratings_desc[3:] == [None, None]

    # Sort ASC: 1, 3, 5, None, None
    r_asc = client.get("/api/v1/books?sort_by=rating&sort_order=asc", headers=headers).json()
    ratings_asc = [b["rating"] for b in r_asc["items"]]
    assert ratings_asc[:3] == [1, 3, 5]
    assert ratings_asc[3:] == [None, None]


def test_server_side_sorting_by_date_added(client):
    """Verify sorting by date added (created_at) ascending and descending."""
    headers, _ = _create_user_and_login(client, "dateuser@example.com", "Date User")

    client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "First Added", "author": "Author 1", "total_pages": 100},
    )
    client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Second Added", "author": "Author 2", "total_pages": 100},
    )
    client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Third Added", "author": "Author 3", "total_pages": 100},
    )

    # Date DESC (newest first)
    desc_resp = client.get(
        "/api/v1/books?sort_by=created_at&sort_order=desc", headers=headers
    ).json()
    titles_desc = [b["title"] for b in desc_resp["items"]]
    assert titles_desc == ["Third Added", "Second Added", "First Added"]

    # Date ASC (oldest first)
    asc_resp = client.get(
        "/api/v1/books?sort_by=created_at&sort_order=asc", headers=headers
    ).json()
    titles_asc = [b["title"] for b in asc_resp["items"]]
    assert titles_asc == ["First Added", "Second Added", "Third Added"]


def test_server_side_combined_all_parameters(client):
    """Verify backend executes combined page, page_size, search, filter, sort_by, and sort_order in SQL."""
    headers, _ = _create_user_and_login(client, "combouser@example.com", "Combo User")

    # Seed books
    books = [
        {
            "title": "Algorithms 101",
            "author": "Robert Sedgewick",
            "status": "READING",
            "rating": 5,
            "total_pages": 400,
        },
        {
            "title": "Algorithms in C",
            "author": "Robert Sedgewick",
            "status": "READING",
            "rating": 4,
            "total_pages": 500,
        },
        {
            "title": "Algorithms in Java",
            "author": "Robert Sedgewick",
            "status": "READING",
            "rating": 3,
            "total_pages": 600,
        },
        {
            "title": "Algorithms in Python",
            "author": "Robert Sedgewick",
            "status": "WANT_TO_READ",
            "rating": 5,
            "total_pages": 450,
        },
        {
            "title": "Data Structures",
            "author": "Mark Weiss",
            "status": "READING",
            "rating": 5,
            "total_pages": 350,
        },
    ]
    for b in books:
        client.post("/api/v1/books", headers=headers, json=b)

    # Query: status=READING, search=Algorithms, sort_by=rating, sort_order=desc, page=1, page_size=2
    # Matching set: Algorithms 101 (5), Algorithms in C (4), Algorithms in Java (3) -> Total 3
    # Page 1: Algorithms 101 (5), Algorithms in C (4)
    q1 = client.get(
        "/api/v1/books?status=READING&search=Algorithms&sort_by=rating&sort_order=desc&page=1&page_size=2",
        headers=headers,
    ).json()
    assert q1["total"] == 3
    assert q1["total_pages"] == 2
    assert q1["page"] == 1
    assert q1["page_size"] == 2
    assert len(q1["items"]) == 2
    assert q1["items"][0]["title"] == "Algorithms 101"
    assert q1["items"][1]["title"] == "Algorithms in C"

    # Page 2: Algorithms in Java (3)
    q2 = client.get(
        "/api/v1/books?status=READING&search=Algorithms&sort_by=rating&sort_order=desc&page=2&page_size=2",
        headers=headers,
    ).json()
    assert q2["total"] == 3
    assert q2["page"] == 2
    assert len(q2["items"]) == 1
    assert q2["items"][0]["title"] == "Algorithms in Java"


# ============================================================================
# 6. Reading Progress Lifecycle (PATCH /api/v1/books/{id}/progress)
# ============================================================================


def test_reading_progress_lifecycle_and_auto_transitions(client):
    """Verify reading progress updates trigger atomic state transitions."""
    headers, _ = _create_user_and_login(client, "progressuser@example.com", "Progress User")

    create_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Progress Lifecycle Book", "author": "Author", "total_pages": 100},
    )
    book_id = create_resp.json()["id"]

    # Initial state: WANT_TO_READ, page 0
    assert create_resp.json()["status"] == "WANT_TO_READ"
    assert create_resp.json()["current_page"] == 0

    # 1. Read first page -> automatically transitions to READING
    prog1 = client.patch(
        f"/api/v1/books/{book_id}/progress",
        headers=headers,
        json={"current_page": 25},
    )
    assert prog1.status_code == 200
    d1 = prog1.json()
    assert d1["current_page"] == 25
    assert d1["progress_percentage"] == 25
    assert d1["status"] == "READING"
    assert d1["finished_at"] is None

    # 2. Read to 100% -> automatically transitions to FINISHED and sets finished_at
    prog2 = client.patch(
        f"/api/v1/books/{book_id}/progress",
        headers=headers,
        json={"current_page": 100},
    )
    assert prog2.status_code == 200
    d2 = prog2.json()
    assert d2["current_page"] == 100
    assert d2["progress_percentage"] == 100
    assert d2["status"] == "FINISHED"
    assert d2["finished_at"] is not None

    # 3. Unfinish (reduce page) -> transitions back to READING and clears finished_at
    prog3 = client.patch(
        f"/api/v1/books/{book_id}/progress",
        headers=headers,
        json={"current_page": 80},
    )
    assert prog3.status_code == 200
    d3 = prog3.json()
    assert d3["current_page"] == 80
    assert d3["status"] == "READING"
    assert d3["finished_at"] is None

    # 4. Invalid progress: negative page
    neg_resp = client.patch(
        f"/api/v1/books/{book_id}/progress",
        headers=headers,
        json={"current_page": -5},
    )
    assert neg_resp.status_code == 422

    # 5. Invalid progress: exceeds total pages
    over_resp = client.patch(
        f"/api/v1/books/{book_id}/progress",
        headers=headers,
        json={"current_page": 105},
    )
    assert over_resp.status_code == 422
    assert over_resp.json()["detail"]["error"]["code"] == "INVALID_PROGRESS"

