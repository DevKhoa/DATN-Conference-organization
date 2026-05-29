import asyncio
import base64
import io
import os
import re
import tempfile
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
from fastapi import APIRouter, Body, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image, ImageDraw
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from packages.file_storage import StorageClient
from packages.utils import BUCKET_NAME, logger, storage_client, supabase_client

router = APIRouter(tags=["proceedings"])
storage_service = StorageClient(client=storage_client, bucket_name=BUCKET_NAME)

A4_WIDTH, A4_HEIGHT = A4
CANVAS_W = 744
CANVAS_H = round((CANVAS_W * A4_HEIGHT) / A4_WIDTH)
SCALE_X = A4_WIDTH / CANVAS_W
SCALE_Y = A4_HEIGHT / CANVAS_H

_FONTS_READY = False
_REGISTERED_FONTS: set[str] = set()
_IMAGE_CACHE: Dict[str, ImageReader] = {}
_IMAGE_CACHE_MAX = 200  # prevent unbounded memory growth

# In-process cache for GCS blob existence + public URLs
# Avoids repeated blob.exists() round-trips (~150-300ms each) for same cache keys
_GCS_URL_CACHE: Dict[str, str] = {}  # cache_key_str -> public_url
_GCS_CACHE_MAX = 500

# Increment this whenever the PDF rendering logic (fonts, layout, etc.) changes
# so that old cached PDFs on GCS are not returned to clients.
_RENDER_VERSION = "v2"  # v1 = Helvetica, v2 = Inter (Vietnamese fix)


def _register_fonts():
    global _FONTS_READY
    if _FONTS_READY:
        return
    try:
        # __file__ is: <project_root>/server/src/routers/proceedings.py
        # parents[0] = routers/, parents[1] = src/, parents[2] = server/, parents[3] = project root
        here = Path(__file__).resolve()
        # Try parents[3] first (project root), then fall back to parents[2] in case of flat layout
        for level in (3, 2, 4):
            candidate = here.parents[level] / "client" / "public" / "fonts"
            if candidate.exists():
                font_dir = candidate
                break
        else:
            logger.warning("Font directory not found — Vietnamese text may render as boxes")
            _FONTS_READY = True
            return
        fonts = {
            "Inter-Regular": font_dir / "Inter-Regular.ttf",
            "Inter-Bold": font_dir / "Inter-Bold.ttf",
            "Inter-Italic": font_dir / "Inter-Italic.ttf",
        }
        for name, path in fonts.items():
            if path.exists():
                pdfmetrics.registerFont(TTFont(name, str(path)))
                _REGISTERED_FONTS.add(name)
                logger.debug(f"Registered font: {name} at {path}")
            else:
                logger.warning(f"Font file not found: {path}")
    except Exception as e:
        logger.warning(f"Font registration skipped: {e}")
    _FONTS_READY = True


def _pick_font(font_family: Optional[str], bold: bool, italic: bool) -> str:
    fam = (font_family or "").lower()
    # Times New Roman
    if "times" in fam:
        if bold and italic:
            return "Times-BoldItalic"
        if bold:
            return "Times-Bold"
        if italic:
            return "Times-Italic"
        return "Times-Roman"
    # Courier / monospace
    if "courier" in fam:
        if bold and italic:
            return "Courier-BoldOblique"
        if bold:
            return "Courier-Bold"
        if italic:
            return "Courier-Oblique"
        return "Courier"
    # Inter (explicit) OR any other font (including default / Helvetica mentions) —
    # always prefer Inter when registered because Inter covers the full Unicode / Vietnamese
    # character set, while ReportLab's built-in Helvetica is limited to Latin-1.
    if _REGISTERED_FONTS:
        if bold and "Inter-Bold" in _REGISTERED_FONTS:
            return "Inter-Bold"
        if italic and "Inter-Italic" in _REGISTERED_FONTS:
            return "Inter-Italic"
        if "Inter-Regular" in _REGISTERED_FONTS:
            return "Inter-Regular"
    # Hard fallback — only reached when Inter is not registered at all
    if bold and italic:
        return "Helvetica-BoldOblique"
    if bold:
        return "Helvetica-Bold"
    if italic:
        return "Helvetica-Oblique"
    return "Helvetica"


@lru_cache(maxsize=256)
def _parse_color(value: Optional[str], default: str = "#000000") -> Tuple[float, float, float]:
    color = (value or default).strip()
    if color.startswith("#"):
        hex_val = color[1:]
        if len(hex_val) in (3, 4):
            hex_val = "".join([c * 2 for c in hex_val[:3]])
        if len(hex_val) >= 6:
            r = int(hex_val[0:2], 16) / 255.0
            g = int(hex_val[2:4], 16) / 255.0
            b = int(hex_val[4:6], 16) / 255.0
            return r, g, b
    if color.startswith("rgb"):
        nums = re.findall(r"[\d.]+", color)
        if len(nums) >= 3:
            r, g, b = (min(255, float(nums[0])), min(255, float(nums[1])), min(255, float(nums[2])))
            return r / 255.0, g / 255.0, b / 255.0
    return 0.0, 0.0, 0.0


def _extract_colors(css: str) -> List[str]:
    if not css:
        return []
    hex_pat = re.compile(r"#[0-9a-fA-F]{3,8}\b")
    rgb_pat = re.compile(r"rgba?\([^)]+\)")
    colors = hex_pat.findall(css) + rgb_pat.findall(css)
    return colors


def _gradient_image(width: int, height: int, colors: List[str]) -> Optional[Image.Image]:
    if len(colors) < 2:
        return None
    c1 = _parse_color(colors[0], "#667eea")
    c2 = _parse_color(colors[-1], "#764ba2")
    c1_int = tuple(int(v * 255) for v in c1)
    c2_int = tuple(int(v * 255) for v in c2)
    img = Image.new("RGB", (width, height), c1_int)
    draw = ImageDraw.Draw(img)
    for y in range(height):
        t = y / max(1, height - 1)
        r = int(c1_int[0] + (c2_int[0] - c1_int[0]) * t)
        g = int(c1_int[1] + (c2_int[1] - c1_int[1]) * t)
        b = int(c1_int[2] + (c2_int[2] - c1_int[2]) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return img


def _load_image(src: str) -> Optional[ImageReader]:
    if not src:
        return None
    # blob: URLs are browser-local — server can never fetch them
    if src.startswith("blob:"):
        logger.warning("Cannot load blob: URL on server — convert to base64 on frontend first")
        return None
    # Use shorter cache key for data URLs to avoid huge dict keys
    cache_key = src[:128] if src.startswith("data:") else src
    if cache_key in _IMAGE_CACHE:
        return _IMAGE_CACHE[cache_key]
    try:
        if src.startswith("data:"):
            _, b64 = src.split(",", 1)
            data = base64.b64decode(b64)
        elif src.startswith("http://") or src.startswith("https://"):
            resp = requests.get(src, timeout=12)
            resp.raise_for_status()
            data = resp.content
        elif os.path.exists(src):
            with open(src, "rb") as f:
                data = f.read()
        else:
            return None
        reader = ImageReader(io.BytesIO(data))
        # Evict oldest entry when cache is full (simple FIFO)
        if len(_IMAGE_CACHE) >= _IMAGE_CACHE_MAX:
            _IMAGE_CACHE.pop(next(iter(_IMAGE_CACHE)))
        _IMAGE_CACHE[cache_key] = reader
        return reader
    except Exception as e:
        logger.warning(f"Failed to load image {str(src)[:80]}: {e}")
        return None


_LIGATURES = str.maketrans({
    "\uFB00": "ff", "\uFB01": "fi", "\uFB02": "fl",
    "\uFB03": "ffi", "\uFB04": "ffl", "\uFB05": "st", "\uFB06": "st",
    "\u00AD": "",   # soft hyphen
    "\u200B": "", "\u200C": "", "\u200D": "", "\uFEFF": "",  # zero-width chars
})


def _clean_text(text: str) -> str:
    """Decompose PDF extraction artifacts: ligatures, soft hyphens, invisible chars."""
    return text.translate(_LIGATURES)


@lru_cache(maxsize=4096)
def _string_width(text: str, font_name: str, font_size: float) -> float:
    """Cached pdfmetrics.stringWidth — same (text, font, size) tuples repeat heavily."""
    return pdfmetrics.stringWidth(text, font_name, font_size)


def _wrap_text(text: str, font_name: str, font_size: float, max_width: float) -> List[str]:
    if not text:
        return [""]
    text = _clean_text(text)
    lines: List[str] = []

    def _break_word(w: str) -> List[str]:
        if _string_width(w, font_name, font_size) <= max_width:
            return [w]
        parts = []
        cur_part = ""
        for char in w:
            test = cur_part + char
            if _string_width(test, font_name, font_size) <= max_width:
                cur_part = test
            else:
                if cur_part:
                    parts.append(cur_part)
                cur_part = char
        if cur_part:
            parts.append(cur_part)
        return parts

    for para in text.split("\n"):
        words = []
        for w in para.split():
            words.extend(_break_word(w))
            
        if not words:
            lines.append("")
            continue
            
        current = words[0]
        for word in words[1:]:
            test = f"{current} {word}"
            if _string_width(test, font_name, font_size) <= max_width:
                current = test
            else:
                lines.append(current)
                current = word
        lines.append(current)
    return lines


def _draw_text(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    w: float,
    h: float,
    font_name: str,
    font_size: float,
    color: Tuple[float, float, float],
    align: str,
):
    c.setFillColorRGB(*color)
    c.setFont(font_name, font_size)
    line_height = font_size * 1.35
    lines = _wrap_text(text, font_name, font_size, max(w, 1))
    # Do NOT clip by max_lines: frontend element h may be slightly smaller than
    # line_height due to different multipliers. Instead render all lines.
    y_cursor = y + h - font_size
    for i, line in enumerate(lines):
        if y_cursor < 0:
            break  # past top of page
        is_last_line = (i == len(lines) - 1)
        if align == "center":
            c.drawCentredString(x + w / 2, y_cursor, line)
        elif align == "right":
            c.drawRightString(x + w, y_cursor, line)
        elif align == "justify" and not is_last_line and line.strip():
            # Justify: distribute extra space between words
            words = line.split()
            if len(words) > 1:
                total_word_w = sum(_string_width(word, font_name, font_size) for word in words)
                space_w = (w - total_word_w) / (len(words) - 1)
                wx = x
                for word in words:
                    c.drawString(wx, y_cursor, word)
                    wx += _string_width(word, font_name, font_size) + space_w
                logger.debug(f"Justified line: {line[:30]}...")
            else:
                c.drawString(x, y_cursor, line)
        else:
            c.drawString(x, y_cursor, line)
        y_cursor -= line_height


def _draw_table(
    c: canvas.Canvas,
    el: Dict[str, Any],
    x: float,
    y: float,
    w: float,
    h: float,
):
    table = el.get("tableData") or {}
    rows = int(table.get("rows") or 0)
    cols = int(table.get("cols") or 0)
    if rows <= 0 or cols <= 0:
        return
    cells = table.get("cells") or []
    col_widths = table.get("colWidths") or [w / cols] * cols
    row_heights = table.get("rowHeights") or [h / rows] * rows
    sum_w = sum(col_widths) or 1
    sum_h = sum(row_heights) or 1
    col_widths_pt = [cw * (w / sum_w) for cw in col_widths]
    row_heights_pt = [rh * (h / sum_h) for rh in row_heights]
    top = y + h
    border_on = table.get("borderOn", True)
    border_thickness = float(table.get("borderThickness") or 1)
    border_color = table.get("borderColor") or "#cbd5e0"
    cell_padding = float(table.get("cellPadding") or 4) * SCALE_Y
    header_highlight = table.get("headerHighlight", False)
    header_bg = table.get("headerBgColor") or "#1a3a6b"

    for r in range(rows):
        for c_idx in range(cols):
            try:
                cell = cells[r][c_idx]
            except Exception:
                cell = {}
            if cell.get("hidden"):
                continue
            col_span = int(cell.get("colSpan") or 1)
            row_span = int(cell.get("rowSpan") or 1)
            cell_w = sum(col_widths_pt[c_idx : c_idx + col_span])
            cell_h = sum(row_heights_pt[r : r + row_span])
            cell_x = x + sum(col_widths_pt[:c_idx])
            cell_y = top - sum(row_heights_pt[: r + row_span])

            bg = cell.get("bgColor") or (header_bg if header_highlight and r == 0 else None)
            if bg:
                c.setFillColorRGB(*_parse_color(bg, "#ffffff"))
                c.rect(cell_x, cell_y, cell_w, cell_h, fill=1, stroke=0)

            if border_on:
                c.setStrokeColorRGB(*_parse_color(cell.get("borderColor") or border_color))
                c.setLineWidth(float(cell.get("borderWidth") or border_thickness))
                draw_top = cell.get("borderTop") is not False
                draw_right = cell.get("borderRight") is not False
                draw_bottom = cell.get("borderBottom") is not False
                draw_left = cell.get("borderLeft") is not False
                if draw_top:
                    c.line(cell_x, cell_y + cell_h, cell_x + cell_w, cell_y + cell_h)
                if draw_right:
                    c.line(cell_x + cell_w, cell_y, cell_x + cell_w, cell_y + cell_h)
                if draw_bottom:
                    c.line(cell_x, cell_y, cell_x + cell_w, cell_y)
                if draw_left:
                    c.line(cell_x, cell_y, cell_x, cell_y + cell_h)

            text = cell.get("text") or ""
            if text:
                font_size = float(cell.get("fontSize") or 10) * SCALE_Y
                font_name = _pick_font(cell.get("fontFamily"), bool(cell.get("bold")), bool(cell.get("italic")))
                color = _parse_color(cell.get("fontColor") or "#1a202c")
                align = cell.get("align") or "center"
                inner_x = cell_x + cell_padding
                inner_y = cell_y + cell_padding
                inner_w = max(1, cell_w - cell_padding * 2)
                inner_h = max(1, cell_h - cell_padding * 2)
                _draw_text(c, text, inner_x, inner_y, inner_w, inner_h, font_name, font_size, color, align)


def _render_pages(pages: List[Dict[str, Any]], hf: Dict[str, Any], conference_name: str) -> bytes:
    _register_fonts()
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    for pi, page in enumerate(pages):
        bg_color = page.get("bgColor") or "#ffffff"
        if "gradient" in bg_color:
            colors = _extract_colors(bg_color)
            gradient = _gradient_image(int(A4_WIDTH), int(A4_HEIGHT), colors)
            if gradient:
                c.drawImage(ImageReader(gradient), 0, 0, width=A4_WIDTH, height=A4_HEIGHT)
            else:
                c.setFillColorRGB(*_parse_color(colors[0] if colors else "#667eea"))
                c.rect(0, 0, A4_WIDTH, A4_HEIGHT, fill=1, stroke=0)
        else:
            c.setFillColorRGB(*_parse_color(bg_color, "#ffffff"))
            c.rect(0, 0, A4_WIDTH, A4_HEIGHT, fill=1, stroke=0)

        elements = page.get("els") or []
        elements = sorted(elements, key=lambda e: e.get("zIndex") or 0)
        for el in elements:
            el_type = el.get("type")
            x_pt = (el.get("x") or 0) * SCALE_X
            w_pt = (el.get("w") or 0) * SCALE_X
            h_pt = (el.get("h") or 0) * SCALE_Y
            y_pt = A4_HEIGHT - ((el.get("y") or 0) + (el.get("h") or 0)) * SCALE_Y
            rotation = el.get("rotation") or 0

            # Only pay saveState/restoreState cost when rotation is needed
            if rotation:
                c.saveState()
                cx = x_pt + w_pt / 2
                cy = y_pt + h_pt / 2
                c.translate(cx, cy)
                c.rotate(-rotation)
                c.translate(-cx, -cy)

            if el_type == "text":
                font_size = float(el.get("fontSize") or 12) * SCALE_Y
                font_name = _pick_font(el.get("fontFamily"), bool(el.get("bold")), bool(el.get("italic")))
                color = _parse_color(el.get("color") or "#000000")
                align = el.get("align") or "left"
                _draw_text(c, el.get("text") or "", x_pt, y_pt, w_pt, h_pt, font_name, font_size, color, align)
            elif el_type == "image" and el.get("src"):
                reader = _load_image(el.get("src"))
                if reader:
                    is_full_page = (
                        abs(x_pt) < 1 
                        and abs(y_pt) < 1 
                        and abs(w_pt - A4_WIDTH) < 1 
                        and abs(h_pt - A4_HEIGHT) < 1
                    )
                    c.drawImage(
                        reader,
                        x_pt,
                        y_pt,
                        width=w_pt,
                        height=h_pt,
                        preserveAspectRatio=not is_full_page,
                        anchor='c' if not is_full_page else 'sw',
                        mask="auto",
                    )
            elif el_type == "bar":
                c.setFillColorRGB(*_parse_color(el.get("barColor") or "#93c5fd"))
                c.rect(x_pt, y_pt, w_pt, h_pt, fill=1, stroke=0)
            elif el_type == "table" and el.get("tableData"):
                _draw_table(c, el, x_pt, y_pt, w_pt, h_pt)

            if rotation:
                c.restoreState()

        if pi > 1:
            header_text = (hf.get("headerText") or "").strip()
            footer_text = (hf.get("footerText") or "").strip()
            show_page_num = bool(hf.get("showPageNum"))
            start_from = int(hf.get("startFrom") or 1)

            # Pick Unicode-capable fonts (Inter when registered, Helvetica as last resort)
            font_regular = "Inter-Regular" if "Inter-Regular" in _REGISTERED_FONTS else "Helvetica"
            font_bold = "Inter-Bold" if "Inter-Bold" in _REGISTERED_FONTS else "Helvetica-Bold"

            if header_text:
                c.setFillColorRGB(*_parse_color("#1a3a6b"))
                c.setFont(font_bold, 8)
                c.drawCentredString(A4_WIDTH / 2, A4_HEIGHT - 14, header_text)

            left = 42
            right = A4_WIDTH - 42
            footer_base = 22
            if conference_name:
                name_len = len(conference_name)
                name_size = 6.5 if name_len > 80 else 7 if name_len > 55 else 8
                c.setFont(font_regular, name_size)
                c.setFillColorRGB(*_parse_color("#1a3a6b"))
                c.drawString(left, footer_base + 16, conference_name)
            c.setLineWidth(0.75)
            c.setStrokeColorRGB(*_parse_color("#1a3a6b"))
            c.line(left, footer_base + 12, right, footer_base + 12)

            c.setFont(font_regular, 8)
            c.setFillColorRGB(*_parse_color("#1a3a6b"))
            c.drawString(left, footer_base, footer_text or " ")
            if show_page_num:
                c.setFont(font_bold, 10)
                c.drawRightString(right, footer_base, str(start_from + (pi - 2)))

        c.showPage()
    c.save()
    return buffer.getvalue()


def _first_obj(value: Any) -> Optional[Dict[str, Any]]:
    if isinstance(value, list):
        return value[0] if value else None
    if isinstance(value, dict):
        return value
    return None


@router.get("/proceedings/{conf_id}/papers")
async def list_proceedings_papers(
    conf_id: int,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    include_abstract: bool = Query(True),
):
    try:
        columns = "paper_id, title, primary_author_id, author:profiles!primary_author_id(full_name, organization)"
        if include_abstract:
            columns = "paper_id, title, abstract, primary_author_id, author:profiles!primary_author_id(full_name, organization)"

        res = (
            supabase_client.table("papers")
            .select(columns, count="exact")
            .eq("submitted_conf", conf_id)
            .eq("status", "ACCEPTED")
            .order("paper_id", desc=False)
            .range(offset, offset + limit - 1)
            .execute()
        )

        papers = res.data or []
        total = res.count or 0

        paper_ids = [p.get("paper_id") for p in papers if p.get("paper_id") is not None]
        session_map: Dict[int, Dict[str, Any]] = {}
        if paper_ids:
            sp_res = (
                supabase_client.table("session_papers")
                .select("paper_id, session_id, start_time, end_time")
                .in_("paper_id", paper_ids)
                .execute()
            )
            for sp in sp_res.data or []:
                pid = sp.get("paper_id")
                if pid is not None:
                    session_map[pid] = sp

        for p in papers:
            pid = p.get("paper_id")
            p["session"] = session_map.get(pid)

        return {
            "papers": papers,
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    except Exception as e:
        logger.error(f"Proceedings papers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proceedings/{conf_id}/reviewers")
async def list_proceedings_reviewers(conf_id: int):
    try:
        # Get all session chairs for sessions belonging to this conference
        # (session_chairs is the table that replaced reviewer_assignments)
        sessions_res = (
            supabase_client.table("sessions")
            .select("session_id")
            .eq("conf_id", conf_id)
            .execute()
        )
        session_ids = [s["session_id"] for s in (sessions_res.data or []) if s.get("session_id")]

        reviewers: List[Dict[str, Any]] = []
        seen = set()
        if session_ids:
            chairs_res = (
                supabase_client.table("session_chairs")
                .select("user_id, profile:profiles!session_chairs_user_id_fkey(full_name, organization)")
                .in_("session_id", session_ids)
                .execute()
            )
            for item in chairs_res.data or []:
                rv = _first_obj(item.get("profile"))
                if not rv:
                    continue
                name = rv.get("full_name")
                if not name or name in seen:
                    continue
                seen.add(name)
                reviewers.append(
                    {
                        "id": str(uuid.uuid4()),
                        "full_name": name,
                        "organization": rv.get("organization") or "",
                    }
                )

        return {"reviewers": reviewers, "count": len(reviewers)}

    except Exception as e:
        logger.error(f"Proceedings reviewers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proceedings/{conf_id}/bootstrap")
async def bootstrap_proceedings(conf_id: int, limit: int = Query(50, ge=1, le=500)):
    try:
        config_res = (
            supabase_client.table("proceedings_configs")
            .select("*")
            .eq("conf_id", conf_id)
            .maybe_single()
            .execute()
        )
        sessions_res = (
            supabase_client.table("sessions")
            .select("*")
            .eq("conf_id", conf_id)
            .order("start_time", desc=False)
            .execute()
        )
        sessions = sessions_res.data or []

        # Fetch session chairs via session_chairs table (chair_person_id no longer exists on sessions)
        session_ids_list = [s["session_id"] for s in sessions if s.get("session_id")]
        session_chairs_map: Dict[int, List[Dict[str, Any]]] = {}
        if session_ids_list:
            sc_res = (
                supabase_client.table("session_chairs")
                .select("session_id, user_id, profile:profiles!session_chairs_user_id_fkey(user_id, full_name, organization)")
                .in_("session_id", session_ids_list)
                .execute()
            )
            for sc in sc_res.data or []:
                sid = sc.get("session_id")
                if sid is None:
                    continue
                profile = _first_obj(sc.get("profile"))
                if profile:
                    session_chairs_map.setdefault(sid, []).append(profile)
        for s in sessions:
            sid = s.get("session_id")
            chairs_list = session_chairs_map.get(sid, [])
            # Keep first chair as "chair" for backwards compatibility with frontend
            s["chair"] = chairs_list[0] if chairs_list else None
            s["chairs"] = chairs_list

        columns = (
            "paper_id, title, abstract, primary_author_id, "
            "author:profiles!papers_primary_author_id_fkey(full_name, organization)"
        )
        papers_res = (
            supabase_client.table("papers")
            .select(columns, count="exact")
            .eq("submitted_conf", conf_id)
            .eq("status", "ACCEPTED")
            .order("paper_id", desc=False)
            .range(0, limit - 1)
            .execute()
        )
        papers = papers_res.data or []
        total = papers_res.count or 0

        paper_ids = [p.get("paper_id") for p in papers if p.get("paper_id") is not None]
        session_map: Dict[int, Dict[str, Any]] = {}
        if paper_ids:
            sp_res = (
                supabase_client.table("session_papers")
                .select("paper_id, session_id, start_time, end_time")
                .in_("paper_id", paper_ids)
                .execute()
            )
            for sp in sp_res.data or []:
                pid = sp.get("paper_id")
                if pid is not None:
                    session_map[pid] = sp
        for p in papers:
            pid = p.get("paper_id")
            p["session"] = session_map.get(pid)

        # Build reviewers/committee list from all session chairs in this conference
        reviewers: List[Dict[str, Any]] = []
        seen: set = set()
        for chairs_list in session_chairs_map.values():
            for profile in chairs_list:
                name = profile.get("full_name")
                if not name or name in seen:
                    continue
                seen.add(name)
                reviewers.append(
                    {
                        "id": str(uuid.uuid4()),
                        "full_name": name,
                        "organization": profile.get("organization") or "",
                    }
                )

        return {
            "config": config_res.data if config_res else None,
            "sessions": sessions,
            "papers": papers,
            "total": total,
            "limit": limit,
            "reviewers": reviewers,
            "reviewers_count": len(reviewers),
        }

    except Exception as e:
        logger.error(f"Proceedings bootstrap error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proceedings/{conf_id}/pdf-cache")
async def get_cached_proceedings_pdf(conf_id: int, key: str = Query(...)):
    try:
        if not re.fullmatch(r"[a-f0-9]{32,64}", key):
            raise HTTPException(status_code=400, detail="Invalid cache key")

        blob_path = f"proceedings/{conf_id}/cache/{key}.pdf"
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(blob_path)
        if not blob.exists():
            raise HTTPException(status_code=404, detail="Cache not found")

        return {"url": blob.public_url, "key": key}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Proceedings cache lookup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/proceedings/{conf_id}/pdf-cache")
async def upload_cached_proceedings_pdf(
    conf_id: int,
    key: str = Form(...),
    file: UploadFile = File(...),
):
    temp_file_path = None
    try:
        if not re.fullmatch(r"[a-f0-9]{32,64}", key):
            raise HTTPException(status_code=400, detail="Invalid cache key")
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted")

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_file_path = os.path.join(temp_dir, file.filename)
            with open(temp_file_path, "wb") as buffer:
                buffer.write(await file.read())

            gcs_path = f"proceedings/{conf_id}/cache/{key}.pdf"
            public_url = storage_service.upload_generic_file(
                local_file_path=temp_file_path,
                gcs_destination_path=gcs_path,
            )

            if not public_url:
                raise HTTPException(status_code=500, detail="Failed to upload cached PDF")

            return {"url": public_url, "key": key}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Proceedings cache upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/proceedings/{conf_id}/render")
async def render_proceedings_pdf(conf_id: int, payload: Dict[str, Any] = Body(...)):
    try:
        pages = payload.get("pages")
        hf = payload.get("hf") or {}
        conference_name = payload.get("conferenceName") or ""
        cache_key = payload.get("key")
        use_cache = payload.get("cache", True)

        if not isinstance(pages, list) or len(pages) == 0:
            raise HTTPException(status_code=400, detail="Missing pages payload")

        if cache_key and use_cache:
            if not re.fullmatch(r"[a-f0-9]{32,64}", cache_key):
                raise HTTPException(status_code=400, detail="Invalid cache key")
            # Include _RENDER_VERSION in the path so old PDFs rendered with
            # previous font/layout code are never reused after a server upgrade.
            blob_path = f"proceedings/{conf_id}/cache/{_RENDER_VERSION}/{cache_key}.pdf"
            mem_key = blob_path  # path already contains version

            # Check in-process cache first (avoids GCS round-trip ~150-300ms)
            if mem_key in _GCS_URL_CACHE:
                return {"url": _GCS_URL_CACHE[mem_key], "key": cache_key, "cached": True}

            bucket = storage_client.bucket(BUCKET_NAME)
            blob = bucket.blob(blob_path)
            if blob.exists():
                url = blob.public_url
                _GCS_URL_CACHE[mem_key] = url
                return {"url": url, "key": cache_key, "cached": True}

        # Run CPU-bound PDF rendering in thread pool so we don't block the event loop
        loop = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(
            None, _render_pages, pages, hf, conference_name
        )

        if cache_key and use_cache:
            try:
                with tempfile.TemporaryDirectory() as temp_dir:
                    file_path = os.path.join(temp_dir, f"{cache_key}.pdf")
                    with open(file_path, "wb") as f:
                        f.write(pdf_bytes)
                    # blob_path already includes _RENDER_VERSION (set above)
                    gcs_path = blob_path
                    public_url = storage_service.upload_generic_file(
                        local_file_path=file_path,
                        gcs_destination_path=gcs_path,
                    )
                    if public_url:
                        # Store in process cache
                        if len(_GCS_URL_CACHE) >= _GCS_CACHE_MAX:
                            _GCS_URL_CACHE.pop(next(iter(_GCS_URL_CACHE)))
                        _GCS_URL_CACHE[mem_key] = public_url
                        return {"url": public_url, "key": cache_key, "cached": False}
                    else:
                        logger.warning(f"GCS upload returned None for key={cache_key}; falling back to streaming")
            except Exception as upload_err:
                logger.warning(f"GCS upload failed for key={cache_key}: {upload_err}; falling back to streaming")

        return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf")

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Proceedings render error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
