import sys
import json
import os
import time
import logging
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse

# Logging config
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)

def extract_text_with_pdfplumber(pdf_path):
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text_parts = []
            for page in pdf.pages:
                text = page.extract_text(layout=True)
                text_parts.append(text or "")
            return "\n".join(text_parts), len(pdf.pages)
    except Exception as e:
        logging.warning(f"pdfplumber extraction failed: {str(e)}")
        return None, 0

def ocr_page(image, lang):
    try:
        return pytesseract.image_to_string(
            image,
            lang=lang,
            config='--psm 6 --oem 3 -c preserve_interword_spaces=1'
        )
    except Exception as e:
        logging.error(f"OCR failed: {str(e)}")
        return ""

def extract_text_with_ocr(pdf_path, lang):
    try:
        images = convert_from_path(pdf_path, dpi=300, fmt='jpeg', grayscale=True)
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(ocr_page, img, lang) for img in images]
            text_parts = [f.result() for f in as_completed(futures)]
        return "\n".join(text_parts), len(images)
    except Exception as e:
        logging.error(f"OCR failed: {str(e)}")
        return None, 0

def extract_text_from_pdf(pdf_path, lang="eng+hin+mar", timeout=300):
    start_time = time.time()

    text, pages = extract_text_with_pdfplumber(pdf_path)
    if text and text.strip():
        return {
            "status": "success",
            "documentId": os.path.basename(pdf_path),
            "text": text.strip(),
            "metadata": {
                "pages": pages,
                "method": "pdfplumber",
                "time_taken": round(time.time() - start_time, 2)
            }
        }

    text, pages = extract_text_with_ocr(pdf_path, lang=lang)
    if text and text.strip():
        return {
            "status": "success",
            "documentId": os.path.basename(pdf_path),
            "text": text.strip(),
            "metadata": {
                "pages": pages,
                "method": "ocr",
                "lang": lang,
                "time_taken": round(time.time() - start_time, 2)
            }
        }

    return {
        "status": "error",
        "documentId": os.path.basename(pdf_path),
        "message": "No text could be extracted",
        "metadata": {
            "time_taken": round(time.time() - start_time, 2)
        }
    }

def run_script(pdf_path, lang="eng+hin+mar"):
    if not os.path.exists(pdf_path):
        return {
            "status": "error",
            "message": f"File not found: {pdf_path}"
        }
    return extract_text_from_pdf(pdf_path, lang=lang)

if __name__ == "__main__":
    try:
        if len(sys.argv) >= 2:
            # Use command‐line arg first
            parser = argparse.ArgumentParser()
            parser.add_argument("pdf_path", help="Path to the PDF file")
            parser.add_argument("--lang",   default="eng+hin+mar",
                                help="OCR language (default: eng+hin+mar)")
            args    = parser.parse_args()
            pdf_path = args.pdf_path
            lang     = args.lang

        elif not sys.stdin.isatty():
            # Fallback to JSON piped via stdin
            input_data = sys.stdin.read().strip()
            input_json = json.loads(input_data)
            pdf_path   = input_json.get("pdf_path")
            lang       = input_json.get("lang", "eng+hin+mar")
            if not pdf_path:
                raise ValueError("Missing 'pdf_path' in input JSON")

        else:
            # Neither arg nor JSON → usage error
            print(json.dumps({
                "status":    "error",
                "message":   "Usage: python process_pdf.py <path> [--lang LANG] "
                             "or echo '{\"pdf_path\":\"…\"}' | python process_pdf.py"
            }))
            sys.exit(1)

    except Exception as e:
        result = {
            "status": "error",
            "message": str(e)
        }

    print(json.dumps(result, ensure_ascii=False))
    sys.stdout.flush()
