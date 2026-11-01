import os
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Institution
from ..security import require_auth
from ..ocr_engine import analyse_document

router = APIRouter(prefix="/api/documents", tags=["Document Upload & OCR"])

# Serverless hosts expose only /tmp as writable, so allow an override.
_DEFAULT_UPLOADS = "/tmp/depositguard-uploads" if os.getenv("VERCEL") else os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"
)
UPLOAD_DIR = os.getenv("DEPOSITGUARD_UPLOAD_DIR", _DEFAULT_UPLOADS)
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp"}

# Stored names are always "<uuid-hex>__<sanitised-original>"; anything else is rejected.
_STORED_NAME_RE = re.compile(r"^[0-9a-f]{32}__[A-Za-z0-9._-]{1,120}$")


def _sanitise(filename: str) -> str:
    """Strip any directory component and reduce to a safe basename."""
    base = os.path.basename(filename or "document")
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    return base[-120:] or "document"


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    run_ocr: bool = Form(True),
    institution_id: Optional[str] = Form(None),
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """
    Store an uploaded FDR instrument and (optionally) run real text extraction
    over it. PDFs with a text layer are read directly; scans and images go
    through the RapidOCR engine. Extracted values come from the file itself.

    When `institution_id` is supplied the extracted text is additionally checked
    against that institution's name and AICTE ID, so an instrument filed under
    the wrong college is flagged at upload time.
    """
    original = _sanitise(file.filename or "document")
    ext = os.path.splitext(original)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext or 'unknown'}'. Allowed: PDF, PNG, JPG, WEBP, TIFF, BMP.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File is {len(data) / 1048576:.1f} MB; the limit is {MAX_UPLOAD_BYTES // 1048576} MB.",
        )

    stored_name = f"{uuid.uuid4().hex}__{original}"
    with open(os.path.join(UPLOAD_DIR, stored_name), "wb") as fh:
        fh.write(data)

    payload = {
        "status": "SUCCESS",
        "document_filename": original,
        "document_path": stored_name,
        "download_url": f"/api/documents/{stored_name}",
        "size_bytes": len(data),
        "content_type": file.content_type,
        "uploaded_by": current_user.full_name,
        "ocr": None,
    }

    if run_ocr:
        inst = None
        if institution_id:
            inst = db.query(Institution).filter(Institution.id == institution_id).first()
        try:
            payload["ocr"] = analyse_document(
                data,
                original,
                institution_name=inst.name if inst else None,
                aicte_id=inst.aicte_id if inst else None,
            )
        except Exception as exc:  # extraction must never lose the upload
            payload["ocr"] = {
                "status": "ERROR",
                "warning": f"Text extraction failed: {exc}",
                "extracted_fields": {},
                "detected_count": 0,
                "institution_match": None,
            }

    return payload


@router.get("/{stored_name}")
def download_document(stored_name: str):
    """Serve a previously uploaded instrument for inline viewing or download."""
    if not _STORED_NAME_RE.match(stored_name):
        raise HTTPException(status_code=400, detail="Invalid document reference.")

    path = os.path.join(UPLOAD_DIR, stored_name)
    # Defence in depth: the resolved path must stay inside the upload directory.
    if not os.path.abspath(path).startswith(os.path.abspath(UPLOAD_DIR) + os.sep):
        raise HTTPException(status_code=400, detail="Invalid document reference.")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Document not found.")

    original = stored_name.split("__", 1)[1]
    return FileResponse(path, filename=original)
