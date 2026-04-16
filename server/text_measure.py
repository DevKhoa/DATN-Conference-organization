"""
Utility: compute line count for a given text using actual Inter font metrics.
This is the ground-truth used by the PDF renderer (reportlab), so the frontend
can call this endpoint to get an exact height.
"""
import math
from reportlab.pdfbase import pdfmetrics


def compute_wrapped_lines(text: str, font_name: str, font_size_pt: float, max_width_pt: float) -> int:
    """Return number of visual lines when text is word-wrapped into max_width_pt."""
    if not text:
        return 0
    words = text.split()
    if not words:
        return 0
    lines = 1
    current = words[0]
    for word in words[1:]:
        test = f"{current} {word}"
        if pdfmetrics.stringWidth(test, font_name, font_size_pt) <= max_width_pt:
            current = test
        else:
            lines += 1
            current = word
    return lines
