import uuid

import pytest


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
# 1. Create Shelf & Validation (POST /api/v1/shelves)
# ============================================================================


def test_create_and_get_shelf_lifecycle(client):
    """Verify creating a shelf with name and description, listing shelves, and retrieving details."""
    headers, _ = _create_user_and_login(client, "shelfuser@example.com", "Shelf User")

    # Create shelf
    create_resp = client.post(
        "/api/v1/shelves",
        headers=headers,
        json={"name": "Sci-Fi Classics", "description": "My favorite sci-fi books"},
    )
    assert create_resp.status_code == 201
    shelf_data = create_resp.json()
    assert shelf_data["name"] == "Sci-Fi Classics"
    assert shelf_data["description"] == "My favorite sci-fi books"
    assert shelf_data["user_role"] == "OWNER"
    shelf_id = shelf_data["id"]

    # List shelves
    list_resp = client.get("/api/v1/shelves", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
    assert list_resp.json()[0]["name"] == "Sci-Fi Classics"

    # Get shelf detail
    detail_resp = client.get(f"/api/v1/shelves/{shelf_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["name"] == "Sci-Fi Classics"
    assert detail_data["books"] == []


@pytest.mark.parametrize(
    "invalid_payload,reason",
    [
        ({}, "Missing name"),
        ({"name": ""}, "Empty name"),
        ({"name": "   "}, "Whitespace name"),
        ({"name": "S" * 256}, "Name exceeds 255 chars"),
    ],
)
def test_create_shelf_validation_failures(client, invalid_payload, reason):
    """Verify validation errors when attempting to create a shelf with invalid inputs."""
    headers, _ = _create_user_and_login(
        client, f"invalid_shelf_{uuid.uuid4().hex[:6]}@example.com", "Shelf Validator"
    )

    resp = client.post("/api/v1/shelves", headers=headers, json=invalid_payload)
    assert resp.status_code == 422, f"Failed on {reason}"


def test_create_shelf_unauthenticated(client):
    """Verify unauthenticated shelf creation returns 401."""
    resp = client.post("/api/v1/shelves", json={"name": "Unauthorized Shelf"})
    assert resp.status_code == 401


# ============================================================================
# 2. Update Shelf (PUT /api/v1/shelves/{id})
# ============================================================================


def test_update_shelf_success_and_validation(client):
    """Verify updating shelf name and description."""
    headers, _ = _create_user_and_login(client, "shelfupdate@example.com", "Update User")

    create_resp = client.post(
        "/api/v1/shelves",
        headers=headers,
        json={"name": "Old Shelf Name", "description": "Old Description"},
    )
    shelf_id = create_resp.json()["id"]

    # Update
    up_resp = client.put(
        f"/api/v1/shelves/{shelf_id}",
        headers=headers,
        json={"name": "New Shelf Name", "description": "New Description"},
    )
    assert up_resp.status_code == 200
    assert up_resp.json()["name"] == "New Shelf Name"
    assert up_resp.json()["description"] == "New Description"

    # Validation: empty name update rejected
    invalid_up = client.put(
        f"/api/v1/shelves/{shelf_id}",
        headers=headers,
        json={"name": "   "},
    )
    assert invalid_up.status_code == 422


# ============================================================================
# 3. Many-to-Many Relationship Modeling (Book belongs to Many Shelves, Shelf holds Many Books)
# ============================================================================


def test_many_to_many_book_on_multiple_shelves_and_shelf_with_multiple_books(client):
    """Verify true Many-to-Many modeling:
    - One book can belong to multiple shelves simultaneously.
    - One shelf can hold multiple books simultaneously.
    """
    headers, _ = _create_user_and_login(client, "m2muser@example.com", "M2M User")

    # 1. Create 3 books
    b1_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Dune", "author": "Frank Herbert", "total_pages": 412},
    )
    b2_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Foundation", "author": "Isaac Asimov", "total_pages": 255},
    )
    b3_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Neuromancer", "author": "William Gibson", "total_pages": 271},
    )
    b1_id = b1_resp.json()["id"]
    b2_id = b2_resp.json()["id"]
    b3_id = b3_resp.json()["id"]

    # 2. Create 3 shelves
    s1_resp = client.post("/api/v1/shelves", headers=headers, json={"name": "Sci-Fi All Time"})
    s2_resp = client.post("/api/v1/shelves", headers=headers, json={"name": "Award Winners"})
    s3_resp = client.post("/api/v1/shelves", headers=headers, json={"name": "Summer Reading"})
    s1_id = s1_resp.json()["id"]
    s2_id = s2_resp.json()["id"]
    s3_id = s3_resp.json()["id"]

    # 3. Associate Book 1 (Dune) with ALL 3 shelves (Book in many shelves)
    client.post(f"/api/v1/shelves/{s1_id}/books/{b1_id}", headers=headers)
    client.post(f"/api/v1/shelves/{s2_id}/books/{b1_id}", headers=headers)
    client.post(f"/api/v1/shelves/{s3_id}/books/{b1_id}", headers=headers)

    # 4. Associate Book 2 (Foundation) and Book 3 (Neuromancer) with Shelf 1 (Shelf with many books)
    client.post(f"/api/v1/shelves/{s1_id}/books/{b2_id}", headers=headers)
    client.post(f"/api/v1/shelves/{s1_id}/books/{b3_id}", headers=headers)

    # 5. Verify Shelf 1 holds all 3 books
    s1_detail = client.get(f"/api/v1/shelves/{s1_id}", headers=headers).json()
    assert len(s1_detail["books"]) == 3
    assert {b["id"] for b in s1_detail["books"]} == {b1_id, b2_id, b3_id}

    # 6. Verify Shelf 2 holds Book 1
    s2_detail = client.get(f"/api/v1/shelves/{s2_id}", headers=headers).json()
    assert len(s2_detail["books"]) == 1
    assert s2_detail["books"][0]["id"] == b1_id

    # 7. Verify Shelf 3 holds Book 1
    s3_detail = client.get(f"/api/v1/shelves/{s3_id}", headers=headers).json()
    assert len(s3_detail["books"]) == 1
    assert s3_detail["books"][0]["id"] == b1_id


def test_remove_book_from_single_shelf_leaves_other_shelves_intact(client):
    """Verify removing a book from one shelf does NOT remove it from other shelves."""
    headers, _ = _create_user_and_login(client, "remuser@example.com", "Remove User")

    # Create book
    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Hyperion", "author": "Dan Simmons", "total_pages": 482},
    )
    b_id = b_resp.json()["id"]

    # Create 2 shelves
    s1_id = client.post("/api/v1/shelves", headers=headers, json={"name": "Shelf 1"}).json()["id"]
    s2_id = client.post("/api/v1/shelves", headers=headers, json={"name": "Shelf 2"}).json()["id"]

    # Add book to both shelves
    client.post(f"/api/v1/shelves/{s1_id}/books/{b_id}", headers=headers)
    client.post(f"/api/v1/shelves/{s2_id}/books/{b_id}", headers=headers)

    # Remove book from Shelf 1
    rem_resp = client.delete(f"/api/v1/shelves/{s1_id}/books/{b_id}", headers=headers)
    assert rem_resp.status_code == 204

    # Shelf 1 now has 0 books
    s1_detail = client.get(f"/api/v1/shelves/{s1_id}", headers=headers).json()
    assert len(s1_detail["books"]) == 0

    # Shelf 2 STILL has the book
    s2_detail = client.get(f"/api/v1/shelves/{s2_id}", headers=headers).json()
    assert len(s2_detail["books"]) == 1
    assert s2_detail["books"][0]["id"] == b_id

    # The book itself is STILL in user's library
    book_resp = client.get(f"/api/v1/books/{b_id}", headers=headers)
    assert book_resp.status_code == 200


# ============================================================================
# 4. Deleting a Shelf Must Not Delete Its Books
# ============================================================================


def test_shelf_deletion_leaves_all_books_untouched(client):
    """Verify that deleting a shelf deletes only the shelf and junction rows, NEVER the books."""
    headers, _ = _create_user_and_login(client, "del_shelf_user@example.com", "Del Shelf User")

    # Create 2 books
    b1_id = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "1984", "author": "George Orwell", "total_pages": 328},
    ).json()["id"]

    b2_id = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Brave New World", "author": "Aldous Huxley", "total_pages": 288},
    ).json()["id"]

    # Create shelf & add both books
    s_id = client.post(
        "/api/v1/shelves", headers=headers, json={"name": "Dystopian Classics"}
    ).json()["id"]

    client.post(f"/api/v1/shelves/{s_id}/books/{b1_id}", headers=headers)
    client.post(f"/api/v1/shelves/{s_id}/books/{b2_id}", headers=headers)

    # Delete the shelf
    del_shelf = client.delete(f"/api/v1/shelves/{s_id}", headers=headers)
    assert del_shelf.status_code == 204

    # Shelf is gone
    assert client.get(f"/api/v1/shelves/{s_id}", headers=headers).status_code == 404

    # BOTH books MUST STILL exist in user's books collection!
    get_b1 = client.get(f"/api/v1/books/{b1_id}", headers=headers)
    assert get_b1.status_code == 200
    assert get_b1.json()["title"] == "1984"

    get_b2 = client.get(f"/api/v1/books/{b2_id}", headers=headers)
    assert get_b2.status_code == 200
    assert get_b2.json()["title"] == "Brave New World"


# ============================================================================
# 5. Deleting a Book Must Clean It Out of All Shelves with No Orphaned References
# ============================================================================


def test_book_deletion_cleans_out_all_shelf_associations_seamlessly(client):
    """Verify that deleting a book removes all its junction table references across all shelves,
    with zero orphaned rows and zero errors when viewing any of those shelves.
    """
    headers, _ = _create_user_and_login(client, "del_book_user@example.com", "Del Book User")

    # Create Book to be deleted
    b_del_id = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Fahrenheit 451", "author": "Ray Bradbury", "total_pages": 249},
    ).json()["id"]

    # Create Book to keep
    b_keep_id = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "The Martian Chronicles", "author": "Ray Bradbury", "total_pages": 222},
    ).json()["id"]

    # Create 3 distinct shelves
    s1_id = client.post("/api/v1/shelves", headers=headers, json={"name": "Shelf Alpha"}).json()[
        "id"
    ]
    s2_id = client.post("/api/v1/shelves", headers=headers, json={"name": "Shelf Beta"}).json()[
        "id"
    ]
    s3_id = client.post("/api/v1/shelves", headers=headers, json={"name": "Shelf Gamma"}).json()[
        "id"
    ]

    # Add b_del to all 3 shelves
    client.post(f"/api/v1/shelves/{s1_id}/books/{b_del_id}", headers=headers)
    client.post(f"/api/v1/shelves/{s2_id}/books/{b_del_id}", headers=headers)
    client.post(f"/api/v1/shelves/{s3_id}/books/{b_del_id}", headers=headers)

    # Add b_keep to Shelf 1 and Shelf 2
    client.post(f"/api/v1/shelves/{s1_id}/books/{b_keep_id}", headers=headers)
    client.post(f"/api/v1/shelves/{s2_id}/books/{b_keep_id}", headers=headers)

    # Verify initial state
    assert len(client.get(f"/api/v1/shelves/{s1_id}", headers=headers).json()["books"]) == 2
    assert len(client.get(f"/api/v1/shelves/{s2_id}", headers=headers).json()["books"]) == 2
    assert len(client.get(f"/api/v1/shelves/{s3_id}", headers=headers).json()["books"]) == 1

    # DELETE the book
    del_book_resp = client.delete(f"/api/v1/books/{b_del_id}", headers=headers)
    assert del_book_resp.status_code == 204

    # Verify all 3 shelves are cleanly updated without orphan crashes:
    # Shelf 1: should now contain only b_keep
    s1_after = client.get(f"/api/v1/shelves/{s1_id}", headers=headers).json()
    assert len(s1_after["books"]) == 1
    assert s1_after["books"][0]["id"] == b_keep_id

    # Shelf 2: should now contain only b_keep
    s2_after = client.get(f"/api/v1/shelves/{s2_id}", headers=headers).json()
    assert len(s2_after["books"]) == 1
    assert s2_after["books"][0]["id"] == b_keep_id

    # Shelf 3: should now contain 0 books
    s3_after = client.get(f"/api/v1/shelves/{s3_id}", headers=headers).json()
    assert len(s3_after["books"]) == 0


# ============================================================================
# 6. Security & Cross-User Shelf Boundaries
# ============================================================================


def test_cross_user_shelf_isolation(client):
    """Verify that User A cannot see, update, delete, or add books to User B's shelf."""
    headers_a, _ = _create_user_and_login(client, "shelfa@example.com", "User A")
    headers_b, _ = _create_user_and_login(client, "shelfb@example.com", "User B")

    # User A creates a shelf and a book
    s_resp = client.post(
        "/api/v1/shelves",
        headers=headers_a,
        json={"name": "User A Private Shelf"},
    )
    s_id = s_resp.json()["id"]

    b_a_id = client.post(
        "/api/v1/books",
        headers=headers_a,
        json={"title": "User A Book", "author": "Author", "total_pages": 100},
    ).json()["id"]

    # User B creates a book
    b_b_id = client.post(
        "/api/v1/books",
        headers=headers_b,
        json={"title": "User B Book", "author": "Author", "total_pages": 100},
    ).json()["id"]

    # 1. User B cannot view User A's shelf -> 404
    assert client.get(f"/api/v1/shelves/{s_id}", headers=headers_b).status_code == 404

    # 2. User B cannot update User A's shelf -> 404
    assert (
        client.put(
            f"/api/v1/shelves/{s_id}", headers=headers_b, json={"name": "Hacked"}
        ).status_code
        == 404
    )

    # 3. User B cannot delete User A's shelf -> 404
    assert client.delete(f"/api/v1/shelves/{s_id}", headers=headers_b).status_code == 404

    # 4. User B cannot add their book to User A's shelf -> 404
    assert (
        client.post(f"/api/v1/shelves/{s_id}/books/{b_b_id}", headers=headers_b).status_code == 404
    )

    # 5. User A cannot add User B's book to User A's shelf -> 404
    assert (
        client.post(f"/api/v1/shelves/{s_id}/books/{b_b_id}", headers=headers_a).status_code == 404
    )

