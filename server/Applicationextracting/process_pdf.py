
import sys, os, json, logging, re
from pdf2image import convert_from_path
from PIL import Image, ImageOps, ImageFilter
import pytesseract

# Optional: tell Windows where tesseract.exe lives
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

def clean_pdf_text(pdf_path):
    """Try fast, direct extraction via pdfplumber."""
    if not pdfplumber:
        return ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages).strip()
    except Exception as e:
        logging.warning(f"[clean_pdf_text] pdfplumber failed: {e}")
        return ""

def scan_pdf_text(pdf_path, dpi=300, threshold=128, median=3, whitelist="0123456789-/"):
    """OCR pass with preprocessing (grayscale, threshold, median filter)."""
    pages = convert_from_path(pdf_path, dpi=dpi)
    parts = []
    for page in pages:
        img = page.convert("L")
        img = ImageOps.autocontrast(img)
        img = img.point(lambda x: 0 if x < threshold else 255, "1")
        img = img.filter(ImageFilter.MedianFilter(size=median))
        cfg = f"--psm 6 -c tessedit_char_whitelist={whitelist}"
        parts.append(pytesseract.image_to_string(img, config=cfg))
    return "\n".join(parts).strip()

def extract_dob(text):
    """Find first DD-MM-YYYY or DD/MM/YYYY in a block of text."""
    m = re.search(r"\b\d{2}[-/]\d{2}[-/]\d{4}\b", text)
    return m.group(0) if m else None

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"status":"error","message":"Usage: <pdf_path> <mode:clean|scan>"}))
        sys.exit(1)

    pdf_path, mode = sys.argv[1], sys.argv[2]
    if not os.path.isfile(pdf_path):
        print(json.dumps({"status":"error","message":"File not found"}))
        sys.exit(1)

    if mode == "clean":
        text = clean_pdf_text(pdf_path)
    else:
        text = scan_pdf_text(pdf_path)

    status = "success" if text else "error"
    print(json.dumps({"status": status, "text": text}, ensure_ascii=False))
    sys.exit(0 if text else 2)

if __name__ == "__main__":
    main()
