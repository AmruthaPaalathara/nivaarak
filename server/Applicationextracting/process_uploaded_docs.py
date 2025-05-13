#!/usr/bin/env python3
import sys
import os
import json

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    from pdf2image import convert_from_path
    import pytesseract
except ImportError:
    convert_from_path = None
    pytesseract = None


def extract_text_with_pdfplumber(pdf_path):
    text = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ''
            text.append(page_text)
    return '\n'.join(text)


def extract_text_with_ocr(pdf_path):
    # Requires pdf2image and pytesseract
    images = convert_from_path(pdf_path)
    ocr_text = []
    for img in images:
        ocr_text.append(pytesseract.image_to_string(img, lang='eng+hin+mar'))
    return '\n'.join(ocr_text)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing PDF path argument"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.isfile(pdf_path):
        print(json.dumps({"status": "error", "message": f"File not found: {pdf_path}"}))
        sys.exit(1)

    result = {"status": "success", "text": ""}
    text = ''
    # Try text extraction via pdfplumber first
    if pdfplumber:
        try:
            text = extract_text_with_pdfplumber(pdf_path)
        except Exception as e:
            # proceed to OCR fallback
            text = ''
    # If no text or pdfplumber unavailable, fallback to OCR
    if not text.strip():
        if convert_from_path and pytesseract:
            try:
                text = extract_text_with_ocr(pdf_path)
            except Exception as e:
                result = {"status": "error", "message": str(e)}
        else:
            result = {"status": "error", "message": "OCR libraries not installed"}

    result["text"] = text
    print(json.dumps(result))


if __name__ == '__main__':
    main()
