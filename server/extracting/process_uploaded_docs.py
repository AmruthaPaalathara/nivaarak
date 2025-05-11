import sys
import json
import os
import logging
import pytesseract
from pdf2image import convert_from_path

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def ocr_image(image, lang="eng+hin+mar"):
    return pytesseract.image_to_string(image, lang=lang, config='--psm 6')

def extract_text_from_pdf(pdf_path, lang="eng+hin+mar"):
    try:
        images = convert_from_path(pdf_path, dpi=300, fmt='jpeg', grayscale=True)
        text = "\n".join(ocr_image(img, lang) for img in images)
        return {
            "status": "success",
            "text": text.strip(),
            "pageCount": len(images)
        }
    except Exception as e:
        logging.error(f"OCR extraction failed: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

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
