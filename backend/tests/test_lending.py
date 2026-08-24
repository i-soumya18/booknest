import asyncio
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


def _create_user_and_login(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    access_token = signup_resp.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    return headers, signup_resp.json()["user"]["id"]


def test_lend_book_success(client):
    headers_owner, owner_id = _create_user_and_login(client, "owner1@example.com", "Owner One")
    headers_borrower, borrower_id = _create_user_and_login(
        client, "borrower1@example.com", "Borrower One"
    )

    book_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Lending Book 1",
            "author": "Author 1",
            "status": "READING",
            "total_pages": 300,
        },
    )
    assert book_resp.status_code == 201
    book_id = book_resp.json()["id"]

    lend_resp = client.post(
        f"/api/v1/books/{book_id}/lend",
        headers=headers_owner,
        json={"borrower_id": borrower_id},
    )
    assert lend_resp.status_code == 201
    lend_data = lend_resp.json()
    assert lend_data["book_id"] == book_id
    assert lend_data["owner_id"] == owner_id
    assert lend_data["borrower_id"] == borrower_id
    assert lend_data["returned_at"] is None


def test_lend_book_by_email(client):
    headers_owner, _ = _create_user_and_login(client, "owner2@example.com", "Owner Two")
    _, borrower_id = _create_user_and_login(client, "borrower2@example.com", "Borrower Two")

    book_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Lending Book 2",
            "author": "Author 2",
            "status": "WANT_TO_READ",
            "total_pages": 200,
        },
    )
    assert book_resp.status_code == 201
    book_id = book_resp.json()["id"]

    lend_resp = client.post(
        f"/api/v1/books/{book_id}/lend",
        headers=headers_owner,
        json={"borrower_email": "borrower2@example.com"},
    )
    assert lend_resp.status_code == 201
    assert lend_resp.json()["borrower_id"] == borrower_id


def test_self_lending_rejected(client):
    headers_owner, owner_id = _create_user_and_login(client, "selflend@example.com", "Self Lender")

    book_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Self Lend Book",
            "author": "Author S",
            "status": "READING",
            "total_pages": 150,
        },
    )
    assert book_resp.status_code == 201
    book_id = book_resp.json()["id"]

    lend_resp = client.post(
        f"/api/v1/books/{book_id}/lend",
        headers=headers_owner,
        json={"borrower_id": owner_id},
    )
    assert lend_resp.status_code == 400
    assert lend_resp.json()["detail"]["error"]["code"] == "SELF_LENDING_NOT_ALLOWED"


def test_lend_by_non_owner_rejected(client):
    headers_owner, _ = _create_user_and_login(client, "owner3@example.com", "Owner Three")
    headers_borrower, borrower_id = _create_user_and_login(
        client, "borrower3@example.com", "Borrower Three"
    )

    book_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Owner 3 Book",
            "author": "Author 3",
            "status": "READING",
            "total_pages": 250,
        },
    )
    book_id = book_resp.json()["id"]

    # Borrower tries to lend owner's book to themselves
    lend_resp = client.post(
        f"/api/v1/books/{book_id}/lend",
        headers=headers_borrower,
        json={"borrower_id": borrower_id},
    )
    assert lend_resp.status_code == 404
    assert lend_resp.json()["detail"]["error"]["code"] == "BOOK_NOT_FOUND"


def test_lend_to_nonexistent_borrower_rejected(client):
    headers_owner, _ = _create_user_and_login(client, "owner4@example.com", "Owner Four")

    book_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Owner 4 Book",
            "author": "Author 4",
            "status": "READING",
            "total_pages": 100,
        },
    )
    book_id = book_resp.json()["id"]

    fake_id = str(uuid.uuid4())
    lend_resp = client.post(
        f"/api/v1/books/{book_id}/lend",
        headers=headers_owner,
        json={"borrower_id": fake_id},
    )
    assert lend_resp.status_code == 404
    assert lend_resp.json()["detail"]["error"]["code"] == "BORROWER_NOT_FOUND"


def test_double_lend_sequential_rejected(client):
    headers_owner, _ = _create_user_and_login(client, "owner5@example.com", "Owner Five")
    _, borrower1_id = _create_user_and_login(client, "b1@example.com", "B1")
    _, borrower2_id = _create_user_and_login(client, "b2@example.com", "B2")

    book_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Double Lend Book",
            "author": "Author 5",
            "status": "READING",
            "total_pages": 400,
        },
    )
    book_id = book_resp.json()["id"]

    # First lend succeeds
    lend1 = client.post(
        f"/api/v1/books/{book_id}/lend", headers=headers_owner, json={"borrower_id": borrower1_id}
    )
    assert lend1.status_code == 201

    # Second lend attempts to lend already lent book
    lend2 = client.post(
        f"/api/v1/books/{book_id}/lend", headers=headers_owner, json={"borrower_id": borrower2_id}
    )
    assert lend2.status_code == 409
    assert lend2.json()["detail"]["error"]["code"] == "BOOK_ALREADY_LENT"


@pytest.mark.asyncio
async def test_concurrent_lend_requests():
    """Fires two near-simultaneous lend requests for the same book
    and asserts exactly one succeeds (201) and one is rejected (409).
    """

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        # Signup owner
        s_owner = await ac.post(
            "/api/v1/auth/signup",
            json={
                "email": "conc_owner@example.com",
                "password": "StrongPassword123!",
                "name": "Conc Owner",
            },
        )
        token_owner = s_owner.json()["tokens"]["access_token"]
        headers_owner = {"Authorization": f"Bearer {token_owner}"}

        # Signup borrower A
        s_b1 = await ac.post(
            "/api/v1/auth/signup",
            json={
                "email": "conc_b1@example.com",
                "password": "StrongPassword123!",
                "name": "Conc B1",
            },
        )
        b1_id = s_b1.json()["user"]["id"]

        # Signup borrower B
        s_b2 = await ac.post(
            "/api/v1/auth/signup",
            json={
                "email": "conc_b2@example.com",
                "password": "StrongPassword123!",
                "name": "Conc B2",
            },
        )
        b2_id = s_b2.json()["user"]["id"]

        # Create book
        book_resp = await ac.post(
            "/api/v1/books",
            headers=headers_owner,
            json={
                "title": "Concurrent Book",
                "author": "Conc Author",
                "status": "READING",
                "total_pages": 350,
            },
        )
        book_id = book_resp.json()["id"]

        # Fire concurrent lend requests
        req1 = ac.post(
            f"/api/v1/books/{book_id}/lend", headers=headers_owner, json={"borrower_id": b1_id}
        )
        req2 = ac.post(
            f"/api/v1/books/{book_id}/lend", headers=headers_owner, json={"borrower_id": b2_id}
        )

        resps = await asyncio.gather(req1, req2)
        status_codes = [r.status_code for r in resps]

        assert 201 in status_codes, f"Expected one request to return 201, got {status_codes}"
        assert 409 in status_codes, f"Expected one request to return 409, got {status_codes}"


def test_borrowed_from_others_view(client):
    headers_owner, _ = _create_user_and_login(client, "owner6@example.com", "Owner Six")
    headers_borrower, borrower_id = _create_user_and_login(
        client, "borrower6@example.com", "Borrower Six"
    )

    book_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Borrowed View Book",
            "author": "Author 6",
            "status": "READING",
            "total_pages": 500,
        },
    )
    book_id = book_resp.json()["id"]

    client.post(
        f"/api/v1/books/{book_id}/lend", headers=headers_owner, json={"borrower_id": borrower_id}
    )

    # Borrower checks /borrowed
    borrowed_resp = client.get("/api/v1/borrowed", headers=headers_borrower)
    assert borrowed_resp.status_code == 200
    b_data = borrowed_resp.json()
    assert b_data["total"] == 1
    item = b_data["items"][0]
    assert item["book"]["id"] == book_id
    assert item["owner_name"] == "Owner Six"
    assert item["owner_email"] == "owner6@example.com"

    # Owner checks /borrowed (should be 0 because owner is not borrower)
    owner_borrowed = client.get("/api/v1/borrowed", headers=headers_owner)
    assert owner_borrowed.status_code == 200
    assert owner_borrowed.json()["total"] == 0


def test_borrower_read_only_enforcement(client):
    headers_owner, _ = _create_user_and_login(client, "owner7@example.com", "Owner Seven")
    headers_borrower, borrower_id = _create_user_and_login(
        client, "borrower7@example.com", "Borrower Seven"
    )

    book_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Read Only Book",
            "author": "Author 7",
            "status": "READING",
            "total_pages": 400,
            "current_page": 50,
        },
    )
    book_id = book_resp.json()["id"]

    client.post(
        f"/api/v1/books/{book_id}/lend", headers=headers_owner, json={"borrower_id": borrower_id}
    )

    # Borrower tries to update book details
    edit_resp = client.put(
        f"/api/v1/books/{book_id}", headers=headers_borrower, json={"title": "Hacked Title"}
    )
    assert edit_resp.status_code == 403
    assert edit_resp.json()["detail"]["error"]["code"] == "BORROWED_BOOK_READ_ONLY"

    # Borrower tries to update reading progress
    prog_resp = client.patch(
        f"/api/v1/books/{book_id}/progress", headers=headers_borrower, json={"current_page": 100}
    )
    assert prog_resp.status_code == 403
    assert prog_resp.json()["detail"]["error"]["code"] == "BORROWED_BOOK_READ_ONLY"

    # Borrower tries to delete book
    del_resp = client.delete(f"/api/v1/books/{book_id}", headers=headers_borrower)
    assert del_resp.status_code == 403
    assert del_resp.json()["detail"]["error"]["code"] == "BORROWED_BOOK_READ_ONLY"


def test_return_book_restores_ownership(client):
    headers_owner, _ = _create_user_and_login(client, "owner8@example.com", "Owner Eight")
    headers_borrower, borrower_id = _create_user_and_login(
        client, "borrower8@example.com", "Borrower Eight"
    )

    book_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={
            "title": "Return Book",
            "author": "Author 8",
            "status": "READING",
            "total_pages": 200,
            "current_page": 20,
        },
    )
    book_id = book_resp.json()["id"]

    # Lend book
    client.post(
        f"/api/v1/books/{book_id}/lend", headers=headers_owner, json={"borrower_id": borrower_id}
    )

    # Return book
    ret_resp = client.post(f"/api/v1/books/{book_id}/return", headers=headers_owner)
    assert ret_resp.status_code == 200
    assert ret_resp.json()["returned_at"] is not None

    # Borrower no longer has book in /borrowed
    b_resp = client.get("/api/v1/borrowed", headers=headers_borrower)
    assert b_resp.status_code == 200
    assert b_resp.json()["total"] == 0

    # Owner can update reading progress again
    prog_resp = client.patch(
        f"/api/v1/books/{book_id}/progress", headers=headers_owner, json={"current_page": 50}
    )
    assert prog_resp.status_code == 200
    assert prog_resp.json()["current_page"] == 50


def test_return_book_errors(client):
    """Verify error conditions when attempting to return a book."""
    headers_owner, _ = _create_user_and_login(client, "ret_err_owner@example.com", "Ret Owner")
    headers_other, _ = _create_user_and_login(client, "ret_err_other@example.com", "Ret Other")

    book_resp = client.post(
        "/api/v1/books",
        headers=headers_owner,
        json={"title": "Not Lent Book", "author": "Author", "total_pages": 100},
    )
    book_id = book_resp.json()["id"]

    # 1. Attempting to return a book that is not lent out -> 404
    r1 = client.post(f"/api/v1/books/{book_id}/return", headers=headers_owner)
    assert r1.status_code == 404
    assert r1.json()["detail"]["error"]["code"] == "NO_ACTIVE_LENDING"

    # 2. Non-owner attempting to return the book -> 404
    r2 = client.post(f"/api/v1/books/{book_id}/return", headers=headers_other)
    assert r2.status_code == 404
    assert r2.json()["detail"]["error"]["code"] == "BOOK_NOT_FOUND"

    # 3. Non-existent book ID -> 404
    fake_id = str(uuid.uuid4())
    r3 = client.post(f"/api/v1/books/{fake_id}/return", headers=headers_owner)
    assert r3.status_code == 404
    assert r3.json()["detail"]["error"]["code"] == "BOOK_NOT_FOUND"
