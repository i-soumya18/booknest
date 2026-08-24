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
# 1. Share Shelf (POST /api/v1/shelves/{id}/collaborators)
# ============================================================================


def test_owner_can_share_shelf_with_editor_and_viewer(client):
    """Verify shelf owner can invite collaborators by email with EDITOR or VIEWER role."""
    headers_owner, _ = _create_user_and_login(client, "owner_share@example.com", "Owner")
    headers_editor, editor_id = _create_user_and_login(client, "editor_share@example.com", "Editor")
    headers_viewer, viewer_id = _create_user_and_login(client, "viewer_share@example.com", "Viewer")

    # Create shelf
    shelf_id = client.post(
        "/api/v1/shelves", headers=headers_owner, json={"name": "Collaborative Library"}
    ).json()["id"]

    # 1. Share with Editor
    ed_resp = client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "editor_share@example.com", "role": "EDITOR"},
    )
    assert ed_resp.status_code == 201
    assert ed_resp.json()["role"] == "EDITOR"
    assert ed_resp.json()["email"] == "editor_share@example.com"
    assert ed_resp.json()["user_id"] == editor_id

    # 2. Share with Viewer
    vw_resp = client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "viewer_share@example.com", "role": "VIEWER"},
    )
    assert vw_resp.status_code == 201
    assert vw_resp.json()["role"] == "VIEWER"
    assert vw_resp.json()["user_id"] == viewer_id

    # 3. List collaborators
    collabs = client.get(f"/api/v1/shelves/{shelf_id}/collaborators", headers=headers_owner).json()
    assert len(collabs) == 2
    roles = {c["email"]: c["role"] for c in collabs}
    assert roles["editor_share@example.com"] == "EDITOR"
    assert roles["viewer_share@example.com"] == "VIEWER"


def test_share_shelf_validation_and_error_cases(client):
    """Verify error conditions when attempting to share a shelf."""
    headers_owner, _ = _create_user_and_login(client, "owner_err@example.com", "Owner")

    shelf_id = client.post(
        "/api/v1/shelves", headers=headers_owner, json={"name": "Test Errors Shelf"}
    ).json()["id"]

    # 1. Share with non-existent user email -> 404
    resp1 = client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "ghost_user@example.com", "role": "VIEWER"},
    )
    assert resp1.status_code == 404
    assert resp1.json()["detail"]["error"]["code"] == "USER_NOT_FOUND"

    # 2. Share with self (owner) -> 400
    resp2 = client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "owner_err@example.com", "role": "EDITOR"},
    )
    assert resp2.status_code == 400
    assert resp2.json()["detail"]["error"]["code"] == "INVALID_COLLABORATOR"

    # 3. Cannot grant OWNER role via share -> 400
    _create_user_and_login(client, "target_err@example.com", "Target")
    resp3 = client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "target_err@example.com", "role": "OWNER"},
    )
    assert resp3.status_code == 400
    assert resp3.json()["detail"]["error"]["code"] == "INVALID_ROLE"


# ============================================================================
# 2. Backend-Enforced Role Restrictions (Viewer vs Editor vs Owner)
# ============================================================================


def test_viewer_role_strict_read_only_enforcement(client):
    """Verify that a VIEWER is strictly read-only and cannot mutate books, shelves, or collaborators."""
    headers_owner, _ = _create_user_and_login(client, "v_owner@example.com", "Owner")
    headers_viewer, _ = _create_user_and_login(client, "v_viewer@example.com", "Viewer")
    headers_other, _ = _create_user_and_login(client, "v_other@example.com", "Other")

    shelf_id = client.post(
        "/api/v1/shelves", headers=headers_owner, json={"name": "Protected Shelf"}
    ).json()["id"]

    book_id = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={"title": "Protected Book", "author": "Author", "total_pages": 150},
    ).json()["id"]

    # Share with viewer
    client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "v_viewer@example.com", "role": "VIEWER"},
    )

    # 1. Viewer CAN see shelf and details
    detail = client.get(f"/api/v1/shelves/{shelf_id}", headers=headers_viewer)
    assert detail.status_code == 200
    assert detail.json()["user_role"] == "VIEWER"

    # 2. Viewer CAN list collaborators
    collabs = client.get(f"/api/v1/shelves/{shelf_id}/collaborators", headers=headers_viewer)
    assert collabs.status_code == 200

    # 3. Viewer CANNOT add books -> 403
    add_b = client.post(f"/api/v1/shelves/{shelf_id}/books/{book_id}", headers=headers_viewer)
    assert add_b.status_code == 403
    assert add_b.json()["detail"]["error"]["code"] == "FORBIDDEN"

    # 4. Viewer CANNOT remove books -> 403
    rem_b = client.delete(f"/api/v1/shelves/{shelf_id}/books/{book_id}", headers=headers_viewer)
    assert rem_b.status_code == 403

    # 5. Viewer CANNOT update shelf metadata -> 403
    up_s = client.put(f"/api/v1/shelves/{shelf_id}", headers=headers_viewer, json={"name": "Hacked"})
    assert up_s.status_code == 403

    # 6. Viewer CANNOT delete shelf -> 403
    del_s = client.delete(f"/api/v1/shelves/{shelf_id}", headers=headers_viewer)
    assert del_s.status_code == 403

    # 7. Viewer CANNOT share shelf / add collaborators -> 403
    add_c = client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_viewer,
        json={"email": "v_other@example.com", "role": "VIEWER"},
    )
    assert add_c.status_code == 403


def test_editor_role_capabilities_and_boundaries(client):
    """Verify that an EDITOR can add and remove books, but cannot rename/delete shelf or manage collaborators."""
    headers_owner, _ = _create_user_and_login(client, "ed_owner@example.com", "Owner")
    headers_editor, _ = _create_user_and_login(client, "ed_editor@example.com", "Editor")
    headers_stranger, stranger_id = _create_user_and_login(
        client, "ed_stranger@example.com", "Stranger"
    )

    shelf_id = client.post(
        "/api/v1/shelves", headers=headers_owner, json={"name": "Editor Test Shelf"}
    ).json()["id"]

    book_id = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={"title": "Editor Book", "author": "Author", "total_pages": 150},
    ).json()["id"]

    # Share with Editor
    client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "ed_editor@example.com", "role": "EDITOR"},
    )

    # 1. Editor CAN add books
    add_res = client.post(f"/api/v1/shelves/{shelf_id}/books/{book_id}", headers=headers_editor)
    assert add_res.status_code == 201

    # Verify book is on shelf
    detail = client.get(f"/api/v1/shelves/{shelf_id}", headers=headers_editor).json()
    assert len(detail["books"]) == 1
    assert detail["books"][0]["id"] == book_id

    # 2. Editor CAN remove books
    rem_res = client.delete(f"/api/v1/shelves/{shelf_id}/books/{book_id}", headers=headers_editor)
    assert rem_res.status_code == 204

    # 3. Editor CANNOT rename shelf -> 403
    assert (
        client.put(
            f"/api/v1/shelves/{shelf_id}", headers=headers_editor, json={"name": "New Name"}
        ).status_code
        == 403
    )

    # 4. Editor CANNOT delete shelf -> 403
    assert client.delete(f"/api/v1/shelves/{shelf_id}", headers=headers_editor).status_code == 403

    # 5. Editor CANNOT add collaborators -> 403
    assert (
        client.post(
            f"/api/v1/shelves/{shelf_id}/collaborators",
            headers=headers_editor,
            json={"email": "ed_stranger@example.com", "role": "VIEWER"},
        ).status_code
        == 403
    )

    # 6. Editor CANNOT update collaborator role -> 403
    assert (
        client.put(
            f"/api/v1/shelves/{shelf_id}/collaborators/{stranger_id}",
            headers=headers_editor,
            json={"role": "VIEWER"},
        ).status_code
        == 403
    )

    # 7. Editor CANNOT remove other collaborators -> 403
    assert (
        client.delete(
            f"/api/v1/shelves/{shelf_id}/collaborators/{stranger_id}",
            headers=headers_editor,
        ).status_code
        == 403
    )


# ============================================================================
# 3. "Shared with Me" View (GET /api/v1/shelves/shared-with-me)
# ============================================================================


def test_shared_with_me_endpoint(client):
    """Verify that GET /api/v1/shelves/shared-with-me returns only shared shelves with exact role."""
    headers_user1, _ = _create_user_and_login(client, "swm_user1@example.com", "User 1")
    headers_user2, _ = _create_user_and_login(client, "swm_user2@example.com", "User 2")
    headers_recipient, _ = _create_user_and_login(client, "swm_recipient@example.com", "Recipient")

    # Recipient creates their own shelf (must NOT appear in "Shared with me")
    client.post("/api/v1/shelves", headers=headers_recipient, json={"name": "Recipient Own Shelf"})

    # User 1 shares Shelf A with Recipient as EDITOR
    s1_id = client.post(
        "/api/v1/shelves", headers=headers_user1, json={"name": "User 1 Shelf A"}
    ).json()["id"]
    client.post(
        f"/api/v1/shelves/{s1_id}/collaborators",
        headers=headers_user1,
        json={"email": "swm_recipient@example.com", "role": "EDITOR"},
    )

    # User 2 shares Shelf B with Recipient as VIEWER
    s2_id = client.post(
        "/api/v1/shelves", headers=headers_user2, json={"name": "User 2 Shelf B"}
    ).json()["id"]
    client.post(
        f"/api/v1/shelves/{s2_id}/collaborators",
        headers=headers_user2,
        json={"email": "swm_recipient@example.com", "role": "VIEWER"},
    )

    # Query "Shared with me"
    resp = client.get("/api/v1/shelves/shared-with-me", headers=headers_recipient)
    assert resp.status_code == 200
    shared_shelves = resp.json()
    assert len(shared_shelves) == 2

    roles = {s["name"]: s["user_role"] for s in shared_shelves}
    assert roles["User 1 Shelf A"] == "EDITOR"
    assert roles["User 2 Shelf B"] == "VIEWER"


# ============================================================================
# 4. Collaborator Role Updates & Removal Cleanups (No Orphaned Records)
# ============================================================================


def test_update_collaborator_role_lifecycle(client):
    """Verify owner updating a collaborator's role dynamically alters their access rights."""
    headers_owner, _ = _create_user_and_login(client, "dyn_owner@example.com", "Owner")
    headers_collab, collab_id = _create_user_and_login(client, "dyn_collab@example.com", "Collab")

    shelf_id = client.post(
        "/api/v1/shelves", headers=headers_owner, json={"name": "Dynamic RBAC Shelf"}
    ).json()["id"]
    book_id = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={"title": "Dyn Book", "author": "Author", "total_pages": 100},
    ).json()["id"]

    # 1. Start as EDITOR
    client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "dyn_collab@example.com", "role": "EDITOR"},
    )
    # Collab can add book
    assert (
        client.post(f"/api/v1/shelves/{shelf_id}/books/{book_id}", headers=headers_collab).status_code
        == 201
    )

    # 2. Demote to VIEWER
    up_resp = client.put(
        f"/api/v1/shelves/{shelf_id}/collaborators/{collab_id}",
        headers=headers_owner,
        json={"role": "VIEWER"},
    )
    assert up_resp.status_code == 200
    assert up_resp.json()["role"] == "VIEWER"

    # Collab can no longer add/remove books -> 403
    assert (
        client.delete(f"/api/v1/shelves/{shelf_id}/books/{book_id}", headers=headers_collab).status_code
        == 403
    )

    # 3. Promote back to EDITOR
    client.put(
        f"/api/v1/shelves/{shelf_id}/collaborators/{collab_id}",
        headers=headers_owner,
        json={"role": "EDITOR"},
    )
    # Collab can remove book again -> 204
    assert (
        client.delete(f"/api/v1/shelves/{shelf_id}/books/{book_id}", headers=headers_collab).status_code
        == 204
    )


def test_remove_collaborator_cleans_up_and_preserves_books(client):
    """Verify removing a collaborator cleans up share records, revokes access, and preserves books."""
    headers_owner, _ = _create_user_and_login(client, "clean_owner@example.com", "Owner")
    headers_collab, collab_id = _create_user_and_login(client, "clean_collab@example.com", "Collab")

    shelf_id = client.post(
        "/api/v1/shelves", headers=headers_owner, json={"name": "Cleanup Shelf"}
    ).json()["id"]
    book_id = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={"title": "Preserved Book", "author": "Author", "total_pages": 120},
    ).json()["id"]

    # Share and add book
    client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "clean_collab@example.com", "role": "EDITOR"},
    )
    client.post(f"/api/v1/shelves/{shelf_id}/books/{book_id}", headers=headers_owner)

    # Remove collaborator
    del_c = client.delete(
        f"/api/v1/shelves/{shelf_id}/collaborators/{collab_id}", headers=headers_owner
    )
    assert del_c.status_code == 204

    # 1. Collab can no longer access shelf -> 404
    assert client.get(f"/api/v1/shelves/{shelf_id}", headers=headers_collab).status_code == 404

    # 2. Shelf vanishes from Collab's "Shared with me" list
    shared = client.get("/api/v1/shelves/shared-with-me", headers=headers_collab).json()
    assert len(shared) == 0

    # 3. Collaborators list for owner is empty
    collabs = client.get(f"/api/v1/shelves/{shelf_id}/collaborators", headers=headers_owner).json()
    assert len(collabs) == 0

    # 4. Book is STILL on the shelf for the owner
    detail = client.get(f"/api/v1/shelves/{shelf_id}", headers=headers_owner).json()
    assert len(detail["books"]) == 1
    assert detail["books"][0]["id"] == book_id

    # 5. Book is STILL in the library
    assert client.get(f"/api/v1/books/{book_id}", headers=headers_owner).status_code == 200


def test_collaborator_can_leave_shelf(client):
    """Verify that a collaborator can remove themselves from a shared shelf."""
    headers_owner, _ = _create_user_and_login(client, "leave_owner@example.com", "Owner")
    headers_collab, collab_id = _create_user_and_login(client, "leave_collab@example.com", "Collab")

    shelf_id = client.post(
        "/api/v1/shelves", headers=headers_owner, json={"name": "Leave Shelf"}
    ).json()["id"]

    client.post(
        f"/api/v1/shelves/{shelf_id}/collaborators",
        headers=headers_owner,
        json={"email": "leave_collab@example.com", "role": "VIEWER"},
    )

    # Collaborator removes themselves
    leave_resp = client.delete(
        f"/api/v1/shelves/{shelf_id}/collaborators/{collab_id}", headers=headers_collab
    )
    assert leave_resp.status_code == 204

    # Verify no longer on shared-with-me
    assert (
        len(client.get("/api/v1/shelves/shared-with-me", headers=headers_collab).json()) == 0
    )

