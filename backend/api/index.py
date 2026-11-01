"""
Vercel serverless entrypoint for the DepositGuard API.

Vercel looks for an ASGI callable named `app` in this module. The real
application lives in app/main.py; this file only puts the backend package on
the import path and re-exports it.

Deployment constraints this runs under:
  * the bundle directory is read-only, so SQLite and uploads go to /tmp
    (see database.py and routes/documents.py)
  * image OCR is unavailable, because RapidOCR pulls in onnxruntime + opencv
    which exceed the serverless size limit. PDFs with a text layer are still
    read exactly, via PyMuPDF.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402

__all__ = ["app"]
