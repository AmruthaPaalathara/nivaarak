import fitz  # PyMuPDF for text extraction
import pytesseract
from PIL import Image
import io
import sys
import json

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file. If text is missing, use OCR."""
    doc = fitz.open(pdf_path)
    text = ""

    for page_num in range(len(doc)):
        page = doc[page_num]
        extracted_text = page.get_text("text")

        if extracted_text.strip():
            text += extracted_text + "\n"
        else:
            # Convert PDF page to an image
            pix = page.get_pixmap()
            img = Image.open(io.BytesIO(pix.tobytes("png")))

            # Use OCR on image
            ocr_text = pytesseract.image_to_string(img)
            text += ocr_text + "\n"

    return text.strip()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR: No PDF file provided", flush=True)
        sys.exit(1)

    pdf_file = sys.argv[1]
    extracted_text = extract_text_from_pdf(pdf_file)

    if not extracted_text:
        print("ERROR: No text extracted!", flush=True)
        sys.exit(1)

    print(extracted_text)
