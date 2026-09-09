import io
import zipfile

from app.config import get_settings


def make_minimal_pdf() -> bytes:
    return b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 44 >> stream
BT /F1 24 Tf 100 700 Td (Hello BookNest) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
299
%%EOF
"""


def make_minimal_epub(title="EPUB Title", author="EPUB Author") -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("mimetype", "application/epub+zip")
        zf.writestr(
            "META-INF/container.xml",
            """<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>""",
        )
        zf.writestr(
            "OEBPS/content.opf",
            f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>{title}</dc:title>
    <dc:creator>{author}</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>""",
        )
        zf.writestr("OEBPS/ch1.xhtml", "<html><body>Chapter 1</body></html>")
    return buffer.getvalue()


def _create_user(client, email: str, name: str) -> tuple[dict[str, str], str]:
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "StrongPassword123!", "name": name},
    )
    assert signup_resp.status_code == 201
    token = signup_resp.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}, signup_resp.json()["user"]["id"]


def test_upload_pdf_to_existing_book(client):
    headers, _ = _create_user(client, "owner_pdf@example.com", "PDF Owner")

    # Create book
    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "PDF Book", "author": "Author A", "total_pages": 10},
    )
    assert b_resp.status_code == 201
    book_id = b_resp.json()["id"]

    # Upload PDF
    pdf_bytes = make_minimal_pdf()
    files = {"file": ("test.pdf", pdf_bytes, "application/pdf")}
    up_resp = client.post(f"/api/v1/books/{book_id}/upload", headers=headers, files=files)
    assert up_resp.status_code == 201
    data = up_resp.json()
    assert data["book_id"] == book_id
    assert data["original_name"] == "test.pdf"
    assert data["mime_type"] == "application/pdf"
    assert data["file_size_bytes"] == len(pdf_bytes)
    assert data["page_count"] == 1


def test_upload_epub_to_existing_book(client):
    headers, _ = _create_user(client, "owner_epub@example.com", "EPUB Owner")

    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "EPUB Book", "author": "Author B", "total_pages": 1},
    )
    assert b_resp.status_code == 201
    book_id = b_resp.json()["id"]

    epub_bytes = make_minimal_epub(title="My Great Book", author="Famous Writer")
    files = {"file": ("great_book.epub", epub_bytes, "application/epub+zip")}
    up_resp = client.post(f"/api/v1/books/{book_id}/upload", headers=headers, files=files)
    assert up_resp.status_code == 201
    data = up_resp.json()
    assert data["original_name"] == "great_book.epub"
    assert data["mime_type"] == "application/epub+zip"
    assert data["page_count"] == 1


def test_upload_file_magic_bytes_validation_rejection(client):
    headers, _ = _create_user(client, "magic_test@example.com", "Magic Tester")

    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Fake PDF Book", "author": "Author C", "total_pages": 5},
    )
    book_id = b_resp.json()["id"]

    # Pretend to be a PDF, but content is just plain text
    fake_pdf = b"This is just plain text masquerading as a PDF."
    files = {"file": ("malicious.pdf", fake_pdf, "application/pdf")}
    up_resp = client.post(f"/api/v1/books/{book_id}/upload", headers=headers, files=files)
    assert up_resp.status_code == 422
    assert up_resp.json()["detail"]["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_upload_file_exceeds_max_size_rejection(client, monkeypatch):
    headers, _ = _create_user(client, "size_test@example.com", "Size Tester")

    b_resp = client.post(
        "/api/v1/books",
        headers=headers,
        json={"title": "Size Book", "author": "Author D", "total_pages": 5},
    )
    book_id = b_resp.json()["id"]

    # Temporarily set max_upload_size_mb to 0 MB (exceeds immediately)
    settings = get_settings()
    monkeypatch.setattr(settings, "max_upload_size_mb", 0)

    pdf_bytes = make_minimal_pdf()
    files = {"file": ("test.pdf", pdf_bytes, "application/pdf")}
    up_resp = client.post(f"/api/v1/books/{book_id}/upload", headers=headers, files=files)
    assert up_resp.status_code == 413
    assert up_resp.json()["detail"]["error"]["code"] == "FILE_TOO_LARGE"


def test_upload_first_book_creates_book_and_file(client):
    headers, _ = _create_user(client, "upload_first@example.com", "Upload First User")

    epub_bytes = make_minimal_epub(title="Auto Title", author="Auto Author")
    files = {"file": ("auto_book.epub", epub_bytes, "application/epub+zip")}

    resp = client.post(
        "/api/v1/books/upload",
        headers=headers,
        files=files,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Auto Title"
    assert data["author"] == "Auto Author"
    assert data["file"] is not None
    assert data["file"]["original_name"] == "auto_book.epub"
    assert data["file"]["mime_type"] == "application/epub+zip"


def test_get_book_file_by_owner_and_unauthorized_user(client):
    owner_headers, _ = _create_user(client, "f_owner@example.com", "Owner")
    other_headers, _ = _create_user(client, "f_other@example.com", "Other")

    # Create & upload
    pdf_bytes = make_minimal_pdf()
    files = {"file": ("my_doc.pdf", pdf_bytes, "application/pdf")}
    create_resp = client.post("/api/v1/books/upload", headers=owner_headers, files=files)
    assert create_resp.status_code == 201
    book_id = create_resp.json()["id"]

    # Owner downloads
    get_resp = client.get(f"/api/v1/books/{book_id}/file", headers=owner_headers)
    assert get_resp.status_code == 200
    assert get_resp.headers["content-type"] == "application/pdf"
    assert get_resp.content == pdf_bytes

    # Other user attempts to download -> 403
    other_resp = client.get(f"/api/v1/books/{book_id}/file", headers=other_headers)
    assert other_resp.status_code == 403


def test_get_book_file_by_borrower_allowed(client):
    owner_headers, owner_id = _create_user(client, "lender@example.com", "Lender")
    borrower_headers, borrower_id = _create_user(client, "borrower@example.com", "Borrower")

    pdf_bytes = make_minimal_pdf()
    files = {"file": ("lent_doc.pdf", pdf_bytes, "application/pdf")}
    create_resp = client.post("/api/v1/books/upload", headers=owner_headers, files=files)
    book_id = create_resp.json()["id"]

    # Lend book to borrower
    lend_resp = client.post(
        f"/api/v1/books/{book_id}/lend",
        headers=owner_headers,
        json={"borrower_id": borrower_id},
    )
    assert lend_resp.status_code == 201

    # Borrower can download/read the file
    b_get_resp = client.get(f"/api/v1/books/{book_id}/file", headers=borrower_headers)
    assert b_get_resp.status_code == 200
    assert b_get_resp.content == pdf_bytes

    # But borrower cannot delete the file -> 403
    b_del_resp = client.delete(f"/api/v1/books/{book_id}/file", headers=borrower_headers)
    assert b_del_resp.status_code == 403


def test_delete_book_file_by_owner_and_admin(client):
    admin_email = get_settings().admin_email
    admin_headers, _ = _create_user(client, admin_email, "Super Admin")
    owner_headers, _ = _create_user(client, "del_owner@example.com", "Del Owner")

    # Upload file
    pdf_bytes = make_minimal_pdf()
    files = {"file": ("to_delete.pdf", pdf_bytes, "application/pdf")}
    b_resp = client.post("/api/v1/books/upload", headers=owner_headers, files=files)
    book_id = b_resp.json()["id"]

    # Admin deletes file
    del_resp = client.delete(f"/api/v1/books/{book_id}/file", headers=admin_headers)
    assert del_resp.status_code == 204

    # File now gone
    get_resp = client.get(f"/api/v1/books/{book_id}/file", headers=owner_headers)
    assert get_resp.status_code == 404
