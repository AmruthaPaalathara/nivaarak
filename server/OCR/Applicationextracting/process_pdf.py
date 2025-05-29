#!/usr/bin/env python3
import sys, os, json, logging, re
from pathlib import Path

# Try to import fast extractor; if missing, we’ll skip
try:
    import pdfplumber
except ImportError:
    pdfplumber = None

# For image‐based OCR
from pdf2image import convert_from_path
from PIL import Image, ImageOps, ImageFilter
import pytesseract

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)

images = convert_from_path(pdf_path, dpi=300,
                           poppler_path=r"C:\Users\amrut\Downloads\Release-23.11.0-0\poppler-23.11.0\Library\bin")


# Allow tuning via ENV:
DPI       = int(os.getenv("PDF_OCR_DPI",           "300"))
THRESH    = int(os.getenv("PDF_OCR_THRESHOLD",     "128"))
MEDIAN    = int(os.getenv("PDF_OCR_MEDIAN_FILTER", "3"))
WHITELIST = os.getenv("PDF_OCR_WHITELIST",         "0123456789-/")

def clean_pdf_text(pdf_path: str) -> str:
    """Fast, direct extraction via pdfplumber."""
    if not pdfplumber:
        logging.debug("pdfplumber not installed; skipping clean pass.")
        return ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            pages = []
            for page in pdf.pages:
                text = page.extract_text() or ""
                pages.append(text)
            return "\n".join(pages).strip()
    except Exception as e:
        logging.warning(f"[clean_pdf_text] pdfplumber failed: {e}")
        return ""

def scan_pdf_text(pdf_path: str, dpi=DPI, threshold=THRESH, median=MEDIAN, whitelist=WHITELIST) -> str:
    """OCR pass with preprocessing (grayscale, threshold, median filter)."""
    try:
        pages = convert_from_path(pdf_path, dpi=dpi,  poppler_path=r"C:\Users\amrut\Downloads\Release-23.11.0-0\poppler-23.11.0\Library\bin")
    except Exception as e:
        logging.error(f"[scan_pdf_text] pdf2image conversion failed: {e}")
        return ""
    parts = []
    for page in pages:
        img = page.convert("L")
        img = ImageOps.autocontrast(img)
        # simple binary threshold
        img = img.point(lambda x: 0 if x < threshold else 255, mode="1")
        img = img.filter(ImageFilter.MedianFilter(size=median))
        cfg = "--psm 3 -l eng+hin+mar"

        try:
            parts.append(pytesseract.image_to_string(img, config=cfg))
        except Exception as ocr_err:
            logging.error(f"[scan_pdf_text] tesseract failed: {ocr_err}")
    return "\n".join(parts).strip()

def extract_dob(text: str) -> str:
    """Find first DD-MM-YYYY or DD/MM/YYYY in a block of text."""
    m = re.search(r"\b\d{2}[-/]\d{2}[-/]\d{4}\b", text)
    return m.group(0) if m else ""

def extract_aadhar(text: str) -> str:
    # Match labeled Aadhaar first
    match = re.search(r'(?:Aadhaar(?: No)?\.?\s*[:\-]?\s*)?(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})', text)
    if match:
        return match.group(1).replace(" ", "").replace("-", "")

    # Fallback: 12 digit standalone pattern
    fallback = re.search(r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b', text)
    return fallback.group(0).replace(" ", "").replace("-", "") if fallback else ""


def extract_pan(text):
    match = re.search(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', text)
    return match.group(0) if match else ""

def extract_email(text):
    match = re.search(r'\b[\w.-]+@[\w.-]+\.\w+\b', text)
    return match.group(0) if match else ""

def extract_father_name(text):
    match = re.search(r"Father(?:'s)? Name\s*[:\-]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)", text)
    return match.group(1) if match else ""


def extract_fields_from_text(text):
    fields = {}
    # Aadhaar
    aadhaar_match = re.search(r'(?:Aadhaar(?: No)?\.?\s*[:\-]?\s*)?(\d{4}\s?\d{4}\s?\d{4})', text)
    if aadhaar_match:
        fields['aadhar'] = aadhaar_match.group(1).replace(" ", "")

    # DOB
    dob_match = re.search(r'(?:DOB|Date of Birth)\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})', text, re.IGNORECASE)
    if dob_match:
        fields['dob'] = dob_match.group(1)

    # Phone
    phone_match = re.search(r'(?:Mobile|Phone|Ph)\s*[:\-]?\s*(\d{10})', text)
    if phone_match:
        fields['phone'] = phone_match.group(1)

    # Address (lines after C/O, District, etc.)
    address_lines = []
    collect = False
    for line in text.split("\n"):
        if re.search(r'(C/O|Post|PO|District|PIN|State|Address)', line, re.IGNORECASE):
            collect = True
        if collect and line.strip():
            address_lines.append(line.strip())
    if address_lines:
        fields['address'] = " ".join(address_lines)

    return fields

def main():
    if len(sys.argv) != 3:
        out = {"status": "error", "message": "Usage: process_pdf.py <pdf_path> <mode:clean|scan|auto>"}
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(1)

    pdf_path, mode = sys.argv[1], sys.argv[2].lower()
    pdf_path = Path(pdf_path)
    if not pdf_path.is_file():
        out = {"status": "error", "message": f"File not found: {pdf_path}"}
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(1)

    text = ""
    if mode == "clean":
        text = clean_pdf_text(str(pdf_path))
    elif mode == "scan":
        text = scan_pdf_text(str(pdf_path))
    else:
        # auto: try clean first, then scan if no output
        text = clean_pdf_text(str(pdf_path))
        if not text:
            logging.info("Clean pass returned empty; falling back to OCR scan.")
            text = scan_pdf_text(str(pdf_path))

    status = "success" if text else "error"
    result = {
        "status": status,
        "text": text
    }
    # optional: report any found DOB
    dob = extract_dob(text)
    if dob:
        result["found_dob"] = dob

    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if status == "success" else 2)

if __name__ == "__main__":
    main()
