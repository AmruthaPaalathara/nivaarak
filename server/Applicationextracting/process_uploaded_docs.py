#!/usr/bin/env python3
import sys, os, json, logging
from pdf2image import convert_from_path
import pytesseract
try:
    import pdfplumber
except ImportError:
    pdfplumber = None
try:
    import cv2, numpy as np
except ImportError:
    cv2 = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def deskew(img):
    if cv2 is None:
        return img
    gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    angle = cv2.minAreaRect(np.column_stack(np.where(bw>0)))[-1]
    if angle < -45: angle = -(90 + angle)
    else: angle = -angle
    (h, w) = gray.shape[:2]
    M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1.0)
    return Image.fromarray(cv2.warpAffine(np.array(img), M, (w, h),
                                           flags=cv2.INTER_CUBIC,
                                           borderMode=cv2.BORDER_REPLICATE))

def ocr_clean(pdf_path):
    # 1st try pdfplumber
    if pdfplumber:
        try:
            text = "\n".join(p.extract_text() or "" for p in pdfplumber.open(pdf_path).pages).strip()
            if text: return text, "pdfplumber"
        except Exception as e:
            logging.warning(f"pdfplumber failed: {e}")
    # fallback to simple OCR
    images = convert_from_path(pdf_path, dpi=200)
    text = "\n".join(pytesseract.image_to_string(img) for img in images).strip()
    return text, "tesseract-simple"

def ocr_scan(pdf_path):
    images = convert_from_path(pdf_path, dpi=300)
    parts = []
    for img in images:
        # aggressive preprocess
        img = img.convert("L")
        img = ImageOps.autocontrast(img)
        img = img.point(lambda x: 0 if x<128 else 255, "1")
        img = deskew(img)
        img = img.filter(ImageFilter.MedianFilter(3))
        cfg = "--psm 6 -c tessedit_char_whitelist=0123456789-/"
        parts.append(pytesseract.image_to_string(img, config=cfg))
    return "\n".join(parts).strip(), "tesseract-scan"

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"status":"error","message":"Usage: <pdf> <mode:clean|scan>"}))
        sys.exit(1)
    pdf_path, mode = sys.argv[1], sys.argv[2]
    if not os.path.isfile(pdf_path):
        print(json.dumps({"status":"error","message":"File not found"}))
        sys.exit(1)

    if mode == "clean":
        text, method = ocr_clean(pdf_path)
    else:
        text, method = ocr_scan(pdf_path)

    status = "success" if text else "error"
    print(json.dumps({"status": status, "method": method, "text": text}, ensure_ascii=False))
