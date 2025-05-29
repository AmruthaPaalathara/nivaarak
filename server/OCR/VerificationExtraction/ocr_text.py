#!/usr/bin/env python
import sys
import re
from pdf2image import convert_from_path
from PIL import Image, ImageFilter, ImageOps
import pytesseract

# 1️⃣ Tell pytesseract where to find your tesseract.exe
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def preprocess_image(page, threshold, median_sz):
    img = page.convert('L')
    img = ImageOps.autocontrast(img)
    img = img.point(lambda x: 0 if x < threshold else 255, '1')
    img = img.filter(ImageFilter.MedianFilter(size=median_sz))
    return img

def ocr_digits(page, threshold, median_sz):
    img = preprocess_image(page, threshold, median_sz)
    cfg = "--psm 6 -c tessedit_char_whitelist=0123456789-/"
    return pytesseract.image_to_string(img, config=cfg)

def ocr_raw(page, threshold, median_sz):
    img = preprocess_image(page, threshold, median_sz)
    return pytesseract.image_to_string(img)

def main():
    if len(sys.argv) < 2:
        print("Usage: python ocr_text.py <pdf> [mode=digit|raw|alpha] [dpi] [threshold] [median]")
        sys.exit(1)

    pdf_path  = sys.argv[1]
    mode      = sys.argv[2] if len(sys.argv) > 2 else 'digit'
    dpi        = int(sys.argv[3]) if len(sys.argv) > 3 else 500
    threshold  = int(sys.argv[4]) if len(sys.argv) > 4 else 100
    median_sz  = int(sys.argv[5]) if len(sys.argv) > 5 else 1

    # 2️⃣ Convert PDF → PIL images
    pages = convert_from_path(
        pdf_path,
        dpi=dpi,
        poppler_path=r"C:\Users\amrut\Downloads\Release-23.11.0-0\poppler-23.11.0\Library\bin"
    )

    # 3️⃣ OCR each page
    all_text = []
    for i, page in enumerate(pages):
        if mode == 'raw':
            text = ocr_raw(page, threshold, median_sz)
        else:
            text = ocr_digits(page, threshold, median_sz)

        print(f"\n--- Page {i+1} ({mode}) ---\n")
        print(text.strip() or "[NO TEXT]")

        all_text.append(text)

    combined = "\n".join(all_text)

    # 4️⃣ Post-process by mode
    if mode == 'digit':
        m = re.search(r"\b\d{12}\b", combined)
        if m:
            print(f"\nDETECTED_DIGITS:{m.group(0)}")
            sys.exit(0)
        sys.exit(2)

    if mode == 'alpha':
        # tweak the regex length as needed
        m = re.search(r"\b[A-Z0-9]{5,20}\b", combined.upper())
        if m:
            print(f"\nDETECTED_ALPHA:{m.group(0)}")
            sys.exit(0)
        sys.exit(2)

    # raw mode already printed everything
    sys.exit(0)

if __name__ == "__main__":
    main()
