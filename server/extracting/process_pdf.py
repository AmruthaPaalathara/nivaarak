
import sys
import json
import os
import time
import logging
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from concurrent.futures import ThreadPoolExecutor, as_completed

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

def ocr_page(image):
    try:
        return pytesseract.image_to_string(
            image,
            lang='eng',
            config='--psm 6 --oem 3 -c preserve_interword_spaces=1'
        )
    except Exception as e:
        logging.error(f"OCR failed: {str(e)}")
        return ""

def extract_text_with_ocr(pdf_path):
    try:
        images = convert_from_path(pdf_path, dpi=300, fmt='jpeg', grayscale=True)
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(ocr_page, img) for img in images]
            text_parts = [f.result() for f in as_completed(futures)]
        return "\n".join(text_parts), len(images)
    except Exception as e:
        logging.error(f"OCR failed: {str(e)}")
        return None, 0

def extract_text_from_pdf(pdf_path, timeout=300):
    start_time = time.time()

    # Try with pdfplumber
    text, pages = extract_text_with_pdfplumber(pdf_path)
    if text and text.strip():
        return {
            "status": "success",
            "text": text.strip(),
            "metadata": {
                "pages": pages,
                "method": "pdfplumber",
                "time_taken": round(time.time() - start_time, 2)
            }
        }

    # Fallback to OCR
    text, pages = extract_text_with_ocr(pdf_path)
    if text and text.strip():
        return {
            "status": "success",
            "text": text.strip(),
            "metadata": {
                "pages": pages,
                "method": "ocr",
                "time_taken": round(time.time() - start_time, 2)
            }
        }

    return {
        "status": "error",
        "message": "No text could be extracted",
        "metadata": {
            "time_taken": round(time.time() - start_time, 2)
        }
    }

def run_script(pdf_path):
    if not os.path.exists(pdf_path):
        return {
            "status": "error",
            "message": f"File not found: {pdf_path}"
        }
    return extract_text_from_pdf(pdf_path)

if __name__ == "__main__":
    try:
        # Priority 1: stdin JSON for Express.js usage
        if not sys.stdin.isatty():
            input_data = sys.stdin.read().strip()
            input_json = json.loads(input_data)
            pdf_path = input_json.get("pdf_path")
            if not pdf_path:
                raise ValueError("Missing 'pdf_path' in input JSON")
            result = run_script(pdf_path)
        # Priority 2: command-line argument
        elif len(sys.argv) == 2:
            pdf_path = sys.argv[1]
            result = run_script(pdf_path)
        else:
            result = {
                "status": "error",
                "message": "Usage: echo {\"pdf_path\": \"path\"} | python process_pdf.py OR python process_pdf.py <path>"
            }

    except Exception as e:
        result = {
            "status": "error",
            "message": str(e)
        }

    print(json.dumps(result, ensure_ascii=False))
    sys.stdout.flush()
