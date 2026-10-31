"""
Real document ingestion for DepositGuard.

Two stages, both genuinely computed from the uploaded bytes (nothing is
hard-coded or faked):

  1. extract_document_text()  - pulls text out of the uploaded file.
       * PDF with a real text layer  -> read it directly (fast, exact).
       * Scanned PDF / image         -> rasterise and run RapidOCR (ONNX).
  2. parse_fdr_fields()       - parses that text into FDR fields
       (amount, dates, FDR number, IFSC, tenure, rate, lien, joint holder).

OCR output is noisy: the engine frequently drops or inserts spaces inside
words ("Inte rest", "AlC TE", "BANKOFINDIA"). Every label lookup below is
therefore run against a whitespace-stripped, upper-cased copy of the text,
which makes matching immune to that particular class of error.

Any field that cannot be found is returned as None - the caller shows it as
"not detected" rather than inventing a value.
"""

import io
import os
import re
import datetime
from typing import Optional, Tuple, List, Dict, Any

# RapidOCR is heavy to construct (~4s), so build it once, lazily, on first use.
_OCR_ENGINE = None
_OCR_LOAD_ERROR: Optional[str] = None

MAX_OCR_PAGES = 5


def _get_engine():
    """Lazily construct the RapidOCR engine; cache the failure if unavailable."""
    global _OCR_ENGINE, _OCR_LOAD_ERROR
    if _OCR_ENGINE is not None:
        return _OCR_ENGINE
    if _OCR_LOAD_ERROR is not None:
        return None
    try:
        from rapidocr_onnxruntime import RapidOCR
        _OCR_ENGINE = RapidOCR()
        return _OCR_ENGINE
    except Exception as exc:  # pragma: no cover - environment dependent
        _OCR_LOAD_ERROR = f"OCR engine unavailable: {exc}"
        return None


def _ocr_image_bytes(data: bytes) -> Tuple[str, List[float]]:
    """Run OCR over raw image bytes. Returns (text, per-line confidences)."""
    engine = _get_engine()
    if engine is None:
        return "", []
    result, _ = engine(data)
    if not result:
        return "", []
    lines, confs = [], []
    for item in result:
        # RapidOCR rows are [box, text, confidence]
        try:
            text, conf = item[1], float(item[2])
        except (IndexError, TypeError, ValueError):
            continue
        if text and text.strip():
            lines.append(text.strip())
            confs.append(conf)
    return "\n".join(lines), confs


def extract_document_text(data: bytes, filename: str) -> Dict[str, Any]:
    """
    Extract text from an uploaded FDR document.

    Returns a dict with: text, method, confidence, pages, engine, warning.
    """
    ext = os.path.splitext(filename or "")[1].lower()
    result: Dict[str, Any] = {
        "text": "",
        "method": None,
        "confidence": None,
        "pages": 0,
        "engine": None,
        "warning": None,
    }

    if ext == ".pdf":
        try:
            import pymupdf
        except ImportError:  # pragma: no cover
            result["warning"] = "PDF support unavailable (pymupdf not installed)."
            return result

        try:
            doc = pymupdf.open(stream=data, filetype="pdf")
        except Exception as exc:
            result["warning"] = f"Could not read PDF: {exc}"
            return result

        result["pages"] = doc.page_count

        # 1) Prefer a genuine text layer - exact, and far faster than OCR.
        embedded = "\n".join(page.get_text() for page in doc).strip()
        if len(embedded) >= 40:
            result.update(
                text=embedded,
                method="PDF_TEXT_LAYER",
                confidence=1.0,
                engine="PyMuPDF text layer",
            )
            doc.close()
            return result

        # 2) Scanned PDF - rasterise each page and OCR it.
        all_text, all_conf = [], []
        for page in list(doc)[:MAX_OCR_PAGES]:
            try:
                pix = page.get_pixmap(dpi=200)
                text, confs = _ocr_image_bytes(pix.tobytes("png"))
            except Exception:
                continue
            if text:
                all_text.append(text)
                all_conf.extend(confs)
        doc.close()

        if not all_text and _OCR_LOAD_ERROR:
            result["warning"] = _OCR_LOAD_ERROR
            return result

        result.update(
            text="\n".join(all_text),
            method="OCR_SCANNED_PDF",
            confidence=round(sum(all_conf) / len(all_conf), 4) if all_conf else None,
            engine="RapidOCR (ONNXRuntime)",
        )
        return result

    # Image upload - OCR directly.
    text, confs = _ocr_image_bytes(data)
    if not text and _OCR_LOAD_ERROR:
        result["warning"] = _OCR_LOAD_ERROR
        return result

    result.update(
        text=text,
        method="OCR_IMAGE",
        confidence=round(sum(confs) / len(confs), 4) if confs else None,
        pages=1,
        engine="RapidOCR (ONNXRuntime)",
    )
    return result


# ---------------------------------------------------------------------------
# Field parsing
# ---------------------------------------------------------------------------

_MONTHS = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}


def _compact(text: str) -> str:
    """Whitespace-free upper-case copy - immune to OCR space noise."""
    return re.sub(r"\s+", "", text or "").upper()


def _looks_like_aicte(text: str) -> bool:
    """Detect 'AICTE' tolerating the usual OCR confusions (I/l/1, O/0)."""
    probe = _compact(text).replace("1", "I").replace("L", "I").replace("0", "O")
    return "AICTE" in probe


def _to_iso(day: int, month: int, year: int) -> Optional[str]:
    try:
        return datetime.date(year, month, day).isoformat()
    except ValueError:
        return None


def _parse_date_token(token: str) -> Optional[str]:
    """Parse one date string in any of the common Indian formats -> ISO."""
    token = token.strip()

    m = re.fullmatch(r"(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})", token)
    if m:  # yyyy-mm-dd
        return _to_iso(int(m.group(3)), int(m.group(2)), int(m.group(1)))

    m = re.fullmatch(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})", token)
    if m:  # dd/mm/yyyy (Indian convention)
        return _to_iso(int(m.group(1)), int(m.group(2)), int(m.group(3)))

    m = re.fullmatch(r"(\d{1,2})([A-Z]{3,9})(\d{4})", token.upper())
    if m:  # 10APRIL2024 (compacted)
        month = _MONTHS.get(m.group(2)[:3])
        if month:
            return _to_iso(int(m.group(1)), month, int(m.group(3)))
    return None


_DATE_RE = r"(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4}|\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}|\d{1,2}[A-Z]{3,9}\d{4})"


def _find_after_label(compact: str, labels: List[str], pattern: str, window: int = 40) -> Optional[str]:
    """Find `pattern` within `window` chars after any of `labels`."""
    for label in labels:
        for match in re.finditer(re.escape(label), compact):
            segment = compact[match.end(): match.end() + window]
            found = re.search(pattern, segment)
            if found:
                return found.group(1)
    return None


# Because whitespace is stripped before matching, a captured value runs straight
# into whatever label follows it ("SBI-DEL-2024-778231" + "IFSC"). Truncate at
# the first field label that appears inside a captured value.
_NEXT_LABELS = [
    "IFSC", "BRANCH", "AMOUNT", "RUPEES", "MATURITY", "ISSUE", "TENURE",
    "INTEREST", "RATE", "JOINTLY", "LIEN", "DATE", "DEPOSIT", "ACCOUNT", "VALUE",
]


def _cut_at_label(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    cut = len(value)
    for label in _NEXT_LABELS:
        idx = value.find(label, 1)
        if idx > 0:
            cut = min(cut, idx)
    trimmed = value[:cut].strip(" ,:-/")
    return trimmed or None


def _clean_amount(raw: str) -> Optional[float]:
    cleaned = re.sub(r"[^\d.]", "", raw or "")
    if not cleaned:
        return None
    # Guard against OCR gluing multiple decimal points together.
    if cleaned.count(".") > 1:
        head, _, tail = cleaned.rpartition(".")
        cleaned = head.replace(".", "") + "." + tail
    try:
        value = float(cleaned)
    except ValueError:
        return None
    return value if value > 0 else None


def parse_fdr_fields(raw_text: str) -> Dict[str, Any]:
    """
    Parse FDR fields out of extracted text.

    Every value is derived from the document; unknown fields come back as None
    so the UI can mark them "not detected" instead of guessing.
    """
    text = raw_text or ""
    compact = _compact(text)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    fields: Dict[str, Any] = {
        "fdr_number": None,
        "issuing_bank": None,
        "branch_name": None,
        "ifsc_code": None,
        "amount": None,
        "amount_in_words": None,
        "issue_date": None,
        "maturity_date": None,
        "tenure_months": None,
        "interest_rate": None,
        "joint_holder": None,
        "lien_marked": None,
    }

    # --- IFSC: rigid, unambiguous format (4 letters + 0 + 6 alphanumerics) ---
    # Label-anchored first; fall back to the bare pattern. No \b here because
    # whitespace stripping glues the code to the surrounding labels.
    m = re.search(r"IFSC[:\-]?([A-Z]{4}0[A-Z0-9]{6})", compact)
    if not m:
        m = re.search(r"(?<![A-Z0-9])([A-Z]{4}0[A-Z0-9]{6})", compact)
    if m:
        fields["ifsc_code"] = m.group(1)

    # --- FDR / receipt number ---
    fdr_no = _find_after_label(
        compact,
        ["FDRNO", "FDRNUMBER", "FDNO", "RECEIPTNO", "DEPOSITNO", "FDRRECEIPTNO", "ACCOUNTNO"],
        r"[:\-]?([A-Z0-9][A-Z0-9\-/]{4,30})",
        window=42,
    )
    fields["fdr_number"] = _cut_at_label(fdr_no)

    # --- Amount: prefer a currency-marked figure, else the largest grouped number ---
    money = re.findall(r"(?:₹|RS\.?|INR)([0-9][0-9,]{2,20}(?:\.[0-9]{1,2})?)", compact)
    if not money:
        money = re.findall(r"\b([0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})?)\b", compact)
    amounts = [a for a in (_clean_amount(x) for x in money) if a]
    if amounts:
        fields["amount"] = max(amounts)

    m = re.search(r"RUPEES(.{3,80}?)ONLY", compact)
    if m:
        fields["amount_in_words"] = f"Rupees {m.group(1).title()} Only"

    # --- Dates: label-anchored first, positional fallback second ---
    issue_tok = _find_after_label(
        compact, ["ISSUEDATE", "DATEOFISSUE", "DEPOSITDATE", "VALUEDATE", "DATEOFDEPOSIT"],
        r"[:\-]?" + _DATE_RE,
    )
    mat_tok = _find_after_label(
        compact, ["MATURITYDATE", "DATEOFMATURITY", "MATURESON", "DUEDATE", "MATURITY"],
        r"[:\-]?" + _DATE_RE,
    )
    all_dates = [d for d in (_parse_date_token(t) for t in re.findall(_DATE_RE, compact)) if d]

    fields["issue_date"] = _parse_date_token(issue_tok) if issue_tok else None
    fields["maturity_date"] = _parse_date_token(mat_tok) if mat_tok else None

    # Fallback: with exactly two dates present, earliest = issue, latest = maturity.
    if not fields["issue_date"] or not fields["maturity_date"]:
        unique = sorted(set(all_dates))
        if len(unique) >= 2:
            fields["issue_date"] = fields["issue_date"] or unique[0]
            fields["maturity_date"] = fields["maturity_date"] or unique[-1]
        elif len(unique) == 1 and not fields["issue_date"]:
            fields["issue_date"] = unique[0]

    # --- Tenure (months, or years converted) ---
    m = re.search(r"(\d{1,3})MONTH", compact)
    if m:
        fields["tenure_months"] = int(m.group(1))
    else:
        m = re.search(r"(\d{1,2})YEAR", compact)
        if m:
            fields["tenure_months"] = int(m.group(1)) * 12
    # Derive from the dates when the document does not state it.
    if not fields["tenure_months"] and fields["issue_date"] and fields["maturity_date"]:
        try:
            d1 = datetime.date.fromisoformat(fields["issue_date"])
            d2 = datetime.date.fromisoformat(fields["maturity_date"])
            months = (d2.year - d1.year) * 12 + (d2.month - d1.month)
            if months > 0:
                fields["tenure_months"] = months
        except ValueError:
            pass

    # --- Interest rate ---
    m = re.search(r"(\d{1,2}(?:\.\d{1,2})?)%", compact)
    if m:
        rate = float(m.group(1))
        if 0 < rate <= 20:  # sanity bound for a deposit rate
            fields["interest_rate"] = rate

    # --- Lien / AICTE joint holding ---
    fields["lien_marked"] = ("LIEN" in compact) and _looks_like_aicte(text)
    for line in lines:
        if _looks_like_aicte(line) and len(line) > 12:
            fields["joint_holder"] = re.sub(r"\s+", " ", line).strip()
            break

    # --- Bank + branch: report the matching source line, do not guess a name ---
    for line in lines:
        if "BANK" in line.upper() and not fields["issuing_bank"]:
            if 3 < len(line) < 70:
                fields["issuing_bank"] = re.sub(r"\s+", " ", line).strip()
    m = re.search(r"BRANCH[:\-]?([A-Z0-9,&()/ ]{3,40})", compact)
    if m:
        branch = _cut_at_label(m.group(1).strip(" ,-"))
        fields["branch_name"] = branch.title() if branch else None

    detected = sum(1 for v in fields.values() if v not in (None, ""))
    return {
        "fields": fields,
        "detected_count": detected,
        "total_fields": len(fields),
    }


# Words shared by most institution names - too generic to prove a match on.
_GENERIC_NAME_WORDS = {
    "OF", "AND", "THE", "FOR", "INSTITUTE", "INSTITUTES", "INSTITUTION",
    "COLLEGE", "UNIVERSITY", "SCHOOL", "ACADEMY", "CENTRE", "CENTER",
    "TECHNOLOGY", "TECHNOLOGICAL", "TECHNICAL", "ENGINEERING", "MANAGEMENT",
    "STUDIES", "SCIENCE", "SCIENCES", "EDUCATION", "POLYTECHNIC", "RESEARCH",
    "NATIONAL", "INDIAN", "INDIA", "TRUST", "SOCIETY",
}


def match_institution(raw_text: str, institution_name: str, aicte_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Check whether an uploaded instrument actually belongs to the institution it
    is being filed against.

    Strongest signal is the AICTE permanent ID, then a bracketed acronym
    (e.g. "(VJTI)"), then overlap of the distinctive words in the name.
    Returns the evidence it used so an officer can judge the call themselves.
    """
    if not raw_text or not raw_text.strip():
        return {
            "verdict": "UNKNOWN",
            "score": 0.0,
            "reason": "No readable text was extracted from the document.",
            "matched_tokens": [],
            "missing_tokens": [],
            "signals": [],
            "expected_institution": institution_name,
            "expected_aicte_id": aicte_id,
        }

    compact = _compact(raw_text)
    signals: List[Dict[str, str]] = []

    if aicte_id and _compact(aicte_id) in compact:
        signals.append({"type": "AICTE_ID", "value": aicte_id})

    for acronym in re.findall(r"\(([A-Za-z]{2,10})\)", institution_name or ""):
        if acronym.upper() in compact:
            signals.append({"type": "ACRONYM", "value": acronym.upper()})

    words = re.findall(r"[A-Za-z]{3,}", (institution_name or "").upper())
    distinctive = [w for w in words if w not in _GENERIC_NAME_WORDS]
    pool = distinctive or words
    matched = [w for w in pool if w in compact]
    missing = [w for w in pool if w not in compact]
    score = round(len(matched) / len(pool), 3) if pool else 0.0

    if any(s["type"] == "AICTE_ID" for s in signals):
        verdict, reason = "MATCH", "AICTE permanent ID found in the document."
    elif any(s["type"] == "ACRONYM" for s in signals):
        verdict, reason = "MATCH", "Institution acronym found in the document."
    elif score >= 0.6:
        verdict, reason = "MATCH", f"{len(matched)} of {len(pool)} distinctive name words found."
    elif score >= 0.3:
        verdict, reason = "PARTIAL", f"Only {len(matched)} of {len(pool)} name words found - verify manually."
    else:
        verdict, reason = "NO_MATCH", "The institution name on the document does not match the selected institution."

    if matched:
        signals.append({"type": "NAME_WORDS", "value": ", ".join(matched[:6])})

    return {
        "verdict": verdict,
        "score": score,
        "reason": reason,
        "matched_tokens": matched,
        "missing_tokens": missing,
        "signals": signals,
        "expected_institution": institution_name,
        "expected_aicte_id": aicte_id,
    }


def analyse_document(
    data: bytes,
    filename: str,
    institution_name: Optional[str] = None,
    aicte_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Full pipeline: bytes -> text -> parsed FDR fields (+ institution check)."""
    extraction = extract_document_text(data, filename)
    parsed = parse_fdr_fields(extraction["text"])
    snippet = (extraction["text"] or "")[:4000]
    result = {
        "status": "SUCCESS" if extraction["text"] else "NO_TEXT_FOUND",
        "filename": filename,
        "method": extraction["method"],
        "engine": extraction["engine"],
        "pages": extraction["pages"],
        "ocr_confidence": extraction["confidence"],
        "warning": extraction["warning"],
        "extracted_fields": parsed["fields"],
        "detected_count": parsed["detected_count"],
        "total_fields": parsed["total_fields"],
        "raw_text": snippet,
        "institution_match": None,
    }
    if institution_name:
        result["institution_match"] = match_institution(extraction["text"], institution_name, aicte_id)
    return result
