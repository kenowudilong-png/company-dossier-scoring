from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: verify_paddleocr.py /path/to/image-or-pdf")
        return 2
    target = Path(sys.argv[1])
    if not target.exists():
        print(f"file not found: {target}")
        return 2
    try:
        from paddleocr import PaddleOCR
    except Exception as exc:
        print(f"PADDLEOCR_IMPORT_FAILED: {exc}")
        return 1
    ocr = PaddleOCR(use_angle_cls=True, lang="ch", show_log=False)
    result = ocr.ocr(str(target), cls=True)
    lines = []
    for page in result or []:
        for item in page or []:
            text, confidence = item[1]
            if text.strip():
                lines.append((text.strip(), float(confidence)))
    for text, confidence in lines[:20]:
        print(f"{confidence:.3f}\t{text}")
    if not lines:
        print("OCR_EMPTY")
        return 1
    print("OCR_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
