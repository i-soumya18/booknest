import io
import xml.etree.ElementTree as ET
import zipfile
from typing import Any

from pypdf import PdfReader


def detect_mime_type_from_bytes(file_bytes: bytes) -> str | None:
    """Validate file magic bytes to determine if the content is truly PDF or EPUB."""
    if len(file_bytes) < 8:
        return None

    # Check for PDF magic bytes: %PDF-
    if file_bytes.startswith(b"%PDF-"):
        return "application/pdf"

    # Check for EPUB (ZIP archive starting with PK\x03\x04 and containing epub indicators)
    if file_bytes.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
                namelist = zf.namelist()
                if "mimetype" in namelist:
                    mimetype_content = zf.read("mimetype").decode("utf-8", errors="ignore").strip()
                    if "epub" in mimetype_content.lower():
                        return "application/epub+zip"
                if "META-INF/container.xml" in namelist:
                    return "application/epub+zip"
        except (zipfile.BadZipFile, Exception):
            pass

    return None


def extract_pdf_metadata(file_bytes: bytes) -> dict[str, Any]:
    """Extract title, author, and page count from PDF bytes using pypdf."""
    metadata: dict[str, Any] = {
        "title": None,
        "author": None,
        "page_count": None,
    }
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        metadata["page_count"] = len(reader.pages)

        info = reader.metadata
        if info:
            if info.title and info.title.strip():
                metadata["title"] = info.title.strip()
            if info.author and info.author.strip():
                metadata["author"] = info.author.strip()
    except Exception:
        # Graceful fallback on malformed or encrypted metadata
        pass

    return metadata


def extract_epub_metadata(file_bytes: bytes) -> dict[str, Any]:
    """Extract title, author, and estimated page/chapter count from EPUB bytes."""
    metadata: dict[str, Any] = {
        "title": None,
        "author": None,
        "page_count": None,
    }
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
            # 1. Parse META-INF/container.xml to find the root OPF file
            rootfile_path = "OEBPS/content.opf"
            if "META-INF/container.xml" in zf.namelist():
                container_data = zf.read("META-INF/container.xml")
                root_tree = ET.fromstring(container_data)
                # Search for rootfile with namespace-agnostic search
                for elem in root_tree.iter():
                    if elem.tag.endswith("rootfile") and "full-path" in elem.attrib:
                        rootfile_path = elem.attrib["full-path"]
                        break

            if rootfile_path in zf.namelist():
                opf_data = zf.read(rootfile_path)
                opf_tree = ET.fromstring(opf_data)

                # Find title, creator (author) in Dublin Core tags
                for elem in opf_tree.iter():
                    tag = elem.tag.lower()
                    if tag.endswith("title") and elem.text and not metadata["title"]:
                        metadata["title"] = elem.text.strip()
                    elif tag.endswith("creator") and elem.text and not metadata["author"]:
                        metadata["author"] = elem.text.strip()

                # Count spine itemrefs as an approximation for chapters/pages if not given
                spine_items = [
                    elem for elem in opf_tree.iter() if elem.tag.lower().endswith("itemref")
                ]
                if spine_items:
                    metadata["page_count"] = len(spine_items)
    except Exception:
        pass

    return metadata


def extract_metadata(file_bytes: bytes, mime_type: str) -> dict[str, Any]:
    """Extract metadata based on MIME type."""
    if mime_type == "application/pdf":
        return extract_pdf_metadata(file_bytes)
    elif mime_type == "application/epub+zip":
        return extract_epub_metadata(file_bytes)
    return {"title": None, "author": None, "page_count": None}
