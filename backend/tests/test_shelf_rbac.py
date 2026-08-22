def _create_user_and_login(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    access_token = signup_resp.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    return headers, signup_resp.json()["user"]["id"]


def test_shelf_rbac_owner_editor_viewer(client):
    headers_owner, _ = _create_user_and_login(client, "owner@example.com", "Owner User")
    headers_editor, editor_id = _create_user_and_login(client, "editor@example.com", "Editor User")
    headers_viewer, viewer_id = _create_user_and_login(client, "viewer@example.com", "Viewer User")
    headers_other, _ = _create_user_and_login(client, "stranger@example.com", "Stranger User")

    # 1. Owner creates shelf
    s_resp = client.post(
        "/api/v1/shelves",
        headers=headers_owner,
        json={"name": "Team Tech Books", "description": "Shared tech shelf"},
    )
    assert s_resp.status_code == 201
    s_id = s_resp.json()["id"]

    # Owner creates a book
    b_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={"title": "Refactoring 2nd Ed", "author": "Martin Fowler", "total_pages": 448},
    )
    b_id = b_resp.json()["id"]

    # 2. Owner shares shelf with Editor and Viewer
    add_ed = client.post(
        f"/api/v1/shelves/{s_id}/collaborators",
        headers=headers_owner,
        json={"email": "editor@example.com", "role": "EDITOR"},
    )
    assert add_ed.status_code == 201
    assert add_ed.json()["role"] == "EDITOR"

    add_vw = client.post(
        f"/api/v1/shelves/{s_id}/collaborators",
        headers=headers_owner,
        json={"email": "viewer@example.com", "role": "VIEWER"},
    )
    assert add_vw.status_code == 201
    assert add_vw.json()["role"] == "VIEWER"

    # 3. Test "Shared with me" endpoint for Editor and Viewer
    ed_shared = client.get("/api/v1/shelves/shared-with-me", headers=headers_editor)
    assert ed_shared.status_code == 200
    assert len(ed_shared.json()) == 1
    assert ed_shared.json()[0]["user_role"] == "EDITOR"

    vw_shared = client.get("/api/v1/shelves/shared-with-me", headers=headers_viewer)
    assert vw_shared.status_code == 200
    assert len(vw_shared.json()) == 1
    assert vw_shared.json()[0]["user_role"] == "VIEWER"

    # 4. Test Viewer role capabilities & restrictions
    # Viewer can GET shelf
    vw_get = client.get(f"/api/v1/shelves/{s_id}", headers=headers_viewer)
    assert vw_get.status_code == 200
    assert vw_get.json()["user_role"] == "VIEWER"

    # Viewer CANNOT add book -> 403 Forbidden
    vw_add = client.post(f"/api/v1/shelves/{s_id}/books/{b_id}", headers=headers_viewer)
    assert vw_add.status_code == 403

    # Viewer CANNOT update shelf -> 403 Forbidden
    vw_put = client.put(f"/api/v1/shelves/{s_id}", headers=headers_viewer, json={"name": "Hacked"})
    assert vw_put.status_code == 403

    # Viewer CANNOT delete shelf -> 403 Forbidden
    vw_del = client.delete(f"/api/v1/shelves/{s_id}", headers=headers_viewer)
    assert vw_del.status_code == 403

    # 5. Test Editor role capabilities & restrictions
    # Editor can GET shelf
    ed_get = client.get(f"/api/v1/shelves/{s_id}", headers=headers_editor)
    assert ed_get.status_code == 200

    # Editor CAN add book to shelf
    ed_add = client.post(f"/api/v1/shelves/{s_id}/books/{b_id}", headers=headers_editor)
    assert ed_add.status_code == 201

    # Editor CAN remove book from shelf
    ed_rem = client.delete(f"/api/v1/shelves/{s_id}/books/{b_id}", headers=headers_editor)
    assert ed_rem.status_code == 204

    # Editor CANNOT update shelf details -> 403 Forbidden
    ed_put = client.put(
        f"/api/v1/shelves/{s_id}", headers=headers_editor, json={"name": "Editor Title"}
    )
    assert ed_put.status_code == 403

    # Editor CANNOT share shelf / add collaborator -> 403 Forbidden
    ed_share = client.post(
        f"/api/v1/shelves/{s_id}/collaborators",
        headers=headers_editor,
        json={"email": "stranger@example.com", "role": "VIEWER"},
    )
    assert ed_share.status_code == 403

    # Editor CANNOT delete shelf -> 403 Forbidden
    ed_del = client.delete(f"/api/v1/shelves/{s_id}", headers=headers_editor)
    assert ed_del.status_code == 403

    # 6. Test Non-Member access -> 404 Not Found (no enumeration)
    assert client.get(f"/api/v1/shelves/{s_id}", headers=headers_other).status_code == 404
    assert (
        client.put(f"/api/v1/shelves/{s_id}", headers=headers_other, json={"name": "X"}).status_code
        == 404
    )
    assert client.delete(f"/api/v1/shelves/{s_id}", headers=headers_other).status_code == 404

    # 7. Owner updates collaborator role (Editor -> Viewer)
    up_role = client.put(
        f"/api/v1/shelves/{s_id}/collaborators/{editor_id}",
        headers=headers_owner,
        json={"role": "VIEWER"},
    )
    assert up_role.status_code == 200
    assert up_role.json()["role"] == "VIEWER"

    # Downgraded Editor now gets 403 on add book!
    assert (
        client.post(f"/api/v1/shelves/{s_id}/books/{b_id}", headers=headers_editor).status_code
        == 403
    )

    # 8. Owner removes collaborator
    rem_vw = client.delete(
        f"/api/v1/shelves/{s_id}/collaborators/{viewer_id}", headers=headers_owner
    )
    assert rem_vw.status_code == 204

    # Removed Viewer now gets 404
    assert client.get(f"/api/v1/shelves/{s_id}", headers=headers_viewer).status_code == 404
