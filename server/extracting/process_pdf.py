print("Script started...")
print("Importing sys...")
import sys
print("Importing json...")
import json
print("Importing pdfplumber...")
import pdfplumber
print("Importing os...")
import os
print("Importing logging...")
import logging
print("Importing pdf2image...")
from pdf2image import convert_from_path
print("Importing Tesseract OCR...")
import pytesseract
print("Importing time...")
import time
print("Importing ThreadPoolExecuter...")
from concurrent.futures import ThreadPoolExecutor, as_completed

print("All imports completed.")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("pdf_processing.log"),
        logging.StreamHandler()
    ]
)

def extract_text_with_pdfplumber(pdf_path):
    """Extract text using pdfplumber with optimized settings"""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text_parts = []
            for page in pdf.pages:
                # Use layout preservation for better text extraction
                text = page.extract_text(
                    layout=True,
                    x_density=7.25,
                    y_density=14
                )
                text_parts.append(text or "")
            return "\n".join(text_parts), len(pdf.pages)
    except Exception as e:
        logging.warning(f"pdfplumber extraction failed: {str(e)}")
        return None, 0

def ocr_page(image):
    """Process single page with optimized OCR settings"""
    try:
        return pytesseract.image_to_string(
            image,
            lang='eng',
            config='--psm 6 --oem 3 -c preserve_interword_spaces=1'
        )
    except Exception as e:
        logging.error(f"OCR failed for page: {str(e)}")
        return ""

def extract_text_with_ocr(pdf_path):
    """Parallel OCR processing with optimized settings"""
    try:
        start_time = time.time()
        logging.info(f"Starting conversion of {pdf_path} to images.")
        images = convert_from_path(pdf_path, dpi=300, thread_count=4, fmt='jpeg', grayscale=True)
        logging.info(f"PDF converted to {len(images)} images in {time.time()-start_time:.2f}s")

        text_parts = []
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(ocr_page, image) for image in images]
            for future in as_completed(futures):
                text_parts.append(future.result())

        logging.info(f"OCR processing completed in {time.time()-start_time:.2f}s")
        return "\n".join(text_parts), len(images)
    except Exception as e:
        logging.error(f"OCR processing failed: {str(e)}")
        return None, 0


def extract_text_from_pdf(pdf_path, timeout=300):
    """
    Enhanced text extraction with fallback and timeout handling
    """
    start_time = time.time()
    
    # First attempt with pdfplumber (fast for text-based PDFs)
    text, page_count = extract_text_with_pdfplumber(pdf_path)
    if text and text.strip():
        logging.info(f"Text extracted via pdfplumber in {time.time()-start_time:.2f}s")
        return {
            "status": "success",
            "text": text.strip(),
            "metadata": {
                "pages": page_count,
                "method": "pdfplumber",
                "time_taken": round(time.time()-start_time, 2)
            }
        }

    # Fallback to OCR if needed (with timeout check)
    if time.time() - start_time > timeout * 0.7:  # Leave 30% time for OCR
        return {
            "status": "error",
            "message": "Text extraction would exceed timeout"
        }

    text, page_count = extract_text_with_ocr(pdf_path)
    if text and text.strip():
        logging.info(f"Text extracted via OCR in {time.time()-start_time:.2f}s")
        return {
            "status": "success",
            "text": text.strip(),
            "metadata": {
                "pages": page_count,
                "method": "ocr",
                "time_taken": round(time.time()-start_time, 2)
            }
        }

    return {
        "status": "error",
        "message": "No text could be extracted",
        "metadata": {
            "time_taken": round(time.time()-start_time, 2)
        }
    }

def main():
    try:
        # Timeout handling at script level (5 minutes)
        start_time = time.time()
        timeout = 300

        input_data = sys.stdin.read().strip()
        if not input_data:
            raise ValueError("No input received")

        input_json = json.loads(input_data)
        pdf_path = input_json.get("pdf_path")

        if not pdf_path:
            raise ValueError("Missing PDF file path")

        if not os.path.exists(pdf_path):
            raise ValueError(f"File not found: {pdf_path}")

        result = extract_text_from_pdf(pdf_path, timeout)
        
        # Check if we're approaching timeout
        if time.time() - start_time > timeout * 0.9:
            result = {
                "status": "error",
                "message": "Processing terminated due to timeout",
                "metadata": {
                    "time_taken": round(time.time()-start_time, 2)
                }
            }

        print(json.dumps(result, ensure_ascii=False))

    except json.JSONDecodeError:
        print(json.dumps({"status": "error", "message": "Invalid JSON input"}))
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": str(e),
            "metadata": {
                "time_taken": round(time.time()-start_time, 2) if 'start_time' in locals() else 0
            }
        }))
    finally:
        sys.stdout.flush()
        sys.stderr.flush()

if __name__ == "__main__":
    main()