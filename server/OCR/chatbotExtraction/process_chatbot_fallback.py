
import sys
import tempfile
from pdf2image import convert_from_path
import pytesseract

def main():
    # Ensure a PDF path is provided
    if len(sys.argv) < 2:
        print("Usage: python process_chatbot_fallback.py <path-to-pdf>", file=sys.stderr)
        sys.exit(1)
    pdf_path = sys.argv[1]

    try:

        poppler_path = r"C:\Users\amrut\Downloads\Release-23.11.0-0\poppler-23.11.0\Library\bin"
        # Convert PDF pages to images
        images = convert_from_path(
            pdf_path,
            dpi=300,
            grayscale=True,
            fmt="jpeg",
            output_folder=tempfile.gettempdir(),
            poppler_path=poppler_path
        )
    except Exception as e:
        print(f"Error converting PDF to images: {e}", file=sys.stderr)
        sys.exit(1)

    all_text = []
    # Run OCR on each page
    for idx, img in enumerate(images, start=1):
        try:
            text = pytesseract.image_to_string(img, lang="eng+hin+mar")
            all_text.append(text)
        except Exception as e:
            print(f"Error OCR page {idx}: {e}", file=sys.stderr)

    # Output the combined extracted text
    print("\n\n".join(all_text))

if __name__ == "__main__":
    main()
