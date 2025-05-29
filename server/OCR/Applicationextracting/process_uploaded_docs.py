#!/usr/bin/env python3
import sys, os, json, logging, re
from pdf2image import convert_from_path
from PIL import Image, ImageOps, ImageFilter
import pytesseract
import traceback

# Optional Windows path – adjust if needed:
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import cv2, numpy as np
except ImportError:
    cv2 = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def deskew(img):
    """Rotate image so text lines are horizontal."""
    if cv2 is None:
        return img
    gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    angle = cv2.minAreaRect(np.column_stack(np.where(bw > 0)))[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    h, w = gray.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    warped = cv2.warpAffine(
        np.array(img),
        M,
        (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE
    )
    return Image.fromarray(warped)


def ocr_clean(pdf_path):
    """
    Try a fast, direct extraction via pdfplumber;
    if that yields no text, fallback to simple OCR.
    """
    if pdfplumber:
        try:
            with pdfplumber.open(pdf_path) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages).strip()
                if text:
                    return text, "pdfplumber"
        except Exception as e:
            logging.warning(f"[ocr_clean] pdfplumber failed: {e}")

    # fallback to simple OCR at low DPI
    images = convert_from_path(pdf_path, dpi=200,  poppler_path=r"C:\Users\amrut\Downloads\Release-23.11.0-0\poppler-23.11.0\Library\bin")
      parts = []
        for img in images:
            img = img.convert("L")
            img = ImageOps.autocontrast(img)
            img = img.filter(ImageFilter.SHARPEN)
            text = pytesseract.image_to_string(img, lang="eng+hin+mar", config="--psm 3")
            parts.append(text)

        return "\n".join(parts).strip(), "tesseract-simple"

def ocr_scan(pdf_path):
    """
    Aggressive OCR pass: grayscale, thresholding, deskew, median filter, sharpen.
    """
    images = convert_from_path(pdf_path, dpi=300,  poppler_path=r"C:\Users\amrut\Downloads\Release-23.11.0-0\poppler-23.11.0\Library\bin")
    parts = []
    for img in images:
        img = img.convert("L")
        img = ImageOps.autocontrast(img)
        img = img.point(lambda x: 0 if x < 128 else 255, "1")
        img = deskew(img)
        img = img.filter(ImageFilter.MedianFilter(3))
        img = img.filter(ImageFilter.SHARPEN)  # optional sharpening

        cfg = "--psm 3 -l eng+hin+mar"

        parts.append(pytesseract.image_to_string(img, config=cfg))
    return "\n".join(parts).strip(), "tesseract-scan"

def extract_fields_from_text(text):
    fields = {}

    # Aadhaar: 12 digits, possibly with spaces
    aadhaar_match = re.search(r'(?:Aadhaar(?: No)?\.?\s*[:\-]?\s*)?(\d{4}\s?\d{4}\s?\d{4})', text)
    if aadhaar_match:
        fields['aadhar'] = aadhaar_match.group(1).replace(" ", "")

    # DOB: match dd/mm/yyyy or dd-mm-yyyy
    dob_match = re.search(r'(?:DOB|Date of Birth)\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})', text, re.IGNORECASE)
    if dob_match:
        fields['dob'] = dob_match.group(1)

    # Phone: match 10-digit mobile number
    phone_match = re.search(r'(?:Mobile|Phone|Ph)\s*[:\-]?\s*(\d{10})', text)
    if phone_match:
        fields['phone'] = phone_match.group(1)

    # Address: very basic multi-line heuristic
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
    if len(sys.argv) < 3:
        print(json.dumps({
            "status": "error",
            "message": "Usage: process_uploaded_docs.py <pdf_path> <mode:clean|scan|auto>"
        }))
        sys.exit(1)

    pdf_path, mode = sys.argv[1], sys.argv[2].lower()
    if not os.path.isfile(pdf_path):
        print(json.dumps({"status": "error", "message": "File not found"}))
        sys.exit(1)

    if mode == "clean":
        text, method = ocr_clean(pdf_path)
    elif mode == "scan":
        text, method = ocr_scan(pdf_path)
    else:
        # auto: try clean first, then scan if clean yields no text
        text, method = ocr_clean(pdf_path)
        if not text:
            logging.info("ocr_clean returned empty, falling back to ocr_scan")
            text, method = ocr_scan(pdf_path)

    status = "success" if text else "error"
    extracted_details = extract_fields_from_text(text) if text else {}

    print(json.dumps({
        "status": status,
        "method": method,
        "text": text,
        "extractedDetails": extracted_details
    }, ensure_ascii=False))



if __name__ == "__main__":
    try:
        main()
    except Exception:
        # print full traceback to stderr
        traceback.print_exc(file=sys.stderr)
        # exit with non-zero so Node still sees code=1
        sys.exit(1)
