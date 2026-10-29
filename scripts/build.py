#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import os
import re
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

import pymupdf
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
EXAM_DIR = ROOT / "old-exams"
COURSE_DIR = ROOT / "course-material"
DPI = 150
ZOOM = DPI / 72.0
QUALITY = 88
GAP = 18

OFFICIAL = {
    "2023-10-25": {
        "title": "Tentamen 25 oktober 2023",
        "answers": "2023-10-25_Solutions.pdf",
        "part_c": 10,
    },
    "2024-11-01": {
        "title": "Tentamen 1 november 2024",
        "answers": "2024-11-01_Solutions.pdf",
        "part_c": 15,
    },
    "2025-10-30": {
        "title": "Tentamen 30 oktober 2025",
        "answers": "2025-10-30_Solutions.pdf",
        "part_c": 15,
    },
}
TOTAL = 90
BOUNDARIES = {3: 45, 4: 60, 5: 75}

TAGS = {
    "arch": ("Arkitektur", "Network-architectures.pdf", 6),
    "basic": ("Grundbegrepp", "Networks-and-applications-basic-concepts.pdf", 5),
    "pan": ("PAN", "Personal-Area-Networks-PAN.pdf", 5),
    "lpwan": ("LPWAN", "Low-Power-Wide-Area-Networks-LPWAN.pdf", 8),
    "wifi": ("WiFi", "IEEE-802.11-WiFi.pdf", 1),
    "cellular": ("Mobilnät", "Cellular-Mobile-Networks.pdf", 1),
    "ntn": ("Satellit/NTN", "Non-Terrestrial-Networks-NTN.pdf", 7),
    "space": ("Rymdnät", "Interplanetary-networks.pdf", 1),
    "dtn": ("DTN", "Delay-tolerant-networking.pdf", 1),
    "underwater": ("Undervatten", "Underwater-networks.pdf", 5),
    "backend": ("Back-end", "Users-and-back-ends.pdf", 8),
    "performance": ("Prestanda", "Users-and-back-ends.pdf", 28),
    "queue": ("Köteori", "QueuingSystems.pdf", 1),
    "probability": (
        "Sannolikhet",
        "Review-of-probability-theory-and-statistics.pdf",
        3,
    ),
    "articles": ("Artiklar", "articles/README.md", 1),
}

Q_TAGS = {
    ("2023-10-25", 1): ["arch", "pan", "lpwan"],
    ("2023-10-25", 2): ["wifi", "arch"],
    ("2023-10-25", 3): ["lpwan", "cellular"],
    ("2023-10-25", 4): ["underwater", "space", "dtn"],
    ("2023-10-25", 5): ["ntn"],
    ("2023-10-25", 6): ["basic", "arch"],
    ("2023-10-25", 7): ["backend"],
    ("2023-10-25", 8): ["cellular", "arch"],
    ("2023-10-25", 9): ["arch", "basic"],
    ("2023-10-25", 10): ["pan", "basic"],
    ("2023-10-25", 11): ["performance", "backend", "probability"],
    ("2023-10-25", 12): ["performance", "probability"],
    ("2023-10-25", 13): ["space", "performance"],
    ("2023-10-25", 14): ["performance", "probability"],
    ("2023-10-25", 15): ["arch", "pan", "lpwan", "backend"],
    ("2023-10-25", 16): ["cellular", "performance", "arch"],
    ("2023-10-25", 17): ["underwater", "ntn", "arch"],
    ("2024-11-01", 1): ["pan"],
    ("2024-11-01", 2): ["arch", "cellular", "ntn", "pan", "lpwan"],
    ("2024-11-01", 3): ["basic", "arch"],
    ("2024-11-01", 4): ["dtn"],
    ("2024-11-01", 5): ["underwater"],
    ("2024-11-01", 6): ["wifi", "arch"],
    ("2024-11-01", 7): ["cellular", "backend"],
    ("2024-11-01", 8): ["ntn", "space"],
    ("2024-11-01", 9): ["performance", "probability", "backend"],
    ("2024-11-01", 10): ["wifi", "performance", "probability"],
    ("2024-11-01", 11): ["ntn", "arch", "performance"],
    ("2024-11-01", 12): ["cellular", "backend", "performance"],
    ("2025-10-30", 1): ["lpwan", "pan", "cellular", "ntn"],
    ("2025-10-30", 2): ["arch", "basic"],
    ("2025-10-30", 3): ["underwater", "space", "dtn", "ntn"],
    ("2025-10-30", 4): ["pan"],
    ("2025-10-30", 5): ["dtn"],
    ("2025-10-30", 6): ["basic", "ntn", "backend"],
    ("2025-10-30", 7): ["performance", "probability", "wifi"],
    ("2025-10-30", 8): ["performance", "probability", "backend"],
    ("2025-10-30", 9): ["cellular", "backend", "performance"],
    ("2025-10-30", 10): ["underwater", "ntn", "pan"],
}

OFFICIAL_MCQ = (
    {("2023-10-25", n) for n in range(1, 6)}
    | {("2024-11-01", n) for n in range(1, 6)}
    | {("2025-10-30", n) for n in range(1, 4)}
)

# Choice labels shown in the answer panel. Image exams use letters; parsed
# HTML options use the visible 1-based numbers.
MCQ_ANSWER_CHOICES = {
    ("2023-10-25", 1): "a, b, d, g",
    ("2023-10-25", 2): "b, d",
    ("2023-10-25", 3): "b, d, f",
    ("2023-10-25", 4): "a, d, h",
    ("2023-10-25", 5): "c, d, g",
    ("2024-04-10", 1): "1, 2, 8, 9",
    ("2024-04-10", 2): "2, 4, 5, 7",
    ("2024-04-10", 3): "2, 4, 5, 6",
    ("2024-04-10", 4): "1, 3, 4, 5",
    ("2024-04-10", 5): "1, 5, 6, 9",
    ("2025-08-28", 1): "2, 13",
    ("2025-08-28", 2): "6, 7, 9, 11",
    ("2025-08-28", 3): "2, 4, 6, 7, 9, 11, 12",
    ("2026-04-09", 1): "2, 3, 7",
    ("2026-04-09", 2): "1, 4, 6, 7, 8",
    ("2026-04-09", 3): "2, 3, 5, 6, 7",
    ("2026-04-09", 4): "4, 5, 6, 7",
    ("2026-04-09", 5): "2, 5, 7, 9",
}

DRAW_TOOLS = """
<div class="draw-tools" role="toolbar" aria-label="Rita på bilden">
  <button type="button" class="draw-btn" data-draw-mode="pen" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg><span>Penna</span></button>
  <button type="button" class="draw-btn" data-draw-mode="line" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19 19 5"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/></svg><span>Linje</span></button>
  <button type="button" class="draw-btn" data-draw-mode="rect" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="12" rx="1"/></svg><span>Rektangel</span></button>
  <button type="button" class="draw-btn" data-draw-mode="erase" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4-4 10-10 4 4-10 10Z"/><path d="m14 7 3-3 4 4-3 3"/><path d="M7 21h14"/></svg><span>Sudd</span></button>
  <button type="button" class="draw-clear"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg><span>Rensa</span></button>
  <span class="draw-hint" hidden></span>
</div>"""


@dataclass
class Segment:
    page: int
    y0: float
    y1: float


@dataclass
class Question:
    n: int
    part: str
    points: float
    title: str
    page: int
    segments: list[Segment]
    solution_segments: list[Segment] = field(default_factory=list)
    q_image: str = ""
    s_image: str = ""
    q_size: tuple[int, int] | None = None
    s_size: tuple[int, int] | None = None
    tags: list[str] = field(default_factory=list)
    generated: bool = False
    prompt_html: str = ""
    options: list[str] = field(default_factory=list)
    solution_html: str = ""
    llm_solution: str = ""
    source_label: str = ""
    note: str = ""
    mcq: bool = False
    answer_choices: str = ""


@dataclass
class Exam:
    date: str
    title: str
    questions: list[Question]
    subtitle: str = (
        "ETSN11 · Trådlösa nätverk och applikationer – Systemdesign och prestanda"
    )
    generated: bool = False
    candidate: bool = False


def esc(s: str) -> str:
    return html.escape(str(s), quote=True)


def page_lines(page):
    out = []
    for b in page.get_text("dict")["blocks"]:
        for line in b.get("lines", []):
            text = "".join(s.get("text", "") for s in line.get("spans", [])).strip()
            if text:
                out.append((text, line["bbox"]))
    return out


def parse_layout(
    path: Path,
) -> tuple[pymupdf.Document, list[Question], list[tuple[str, int, float]]]:
    doc = pymupdf.open(path)
    heads: list[tuple[int, int, float, str]] = []
    parts: list[tuple[str, int, float]] = []
    for pno, page in enumerate(doc):
        for text, bb in page_lines(page):
            m = re.match(r"^(\d{1,2})\.\s+", text)
            if m and bb[0] < 130:
                n = int(m.group(1))
                if 1 <= n <= 30:
                    heads.append((n, pno, bb[1], text))
            pm = re.match(r"^(Part\s+[ABC])", text)
            if pm and bb[0] < 140:
                parts.append((pm.group(1), pno, bb[1]))
    seen = set()
    unique = []
    for h in heads:
        if h[0] in seen:
            continue
        seen.add(h[0])
        unique.append(h)
    unique.sort(key=lambda x: x[0])
    parts.sort(key=lambda x: (x[1], x[2]))

    def part_for(pno: int, y: float) -> str:
        current = "A"
        for label, pp, yy in parts:
            if (pp, yy) <= (pno, y):
                current = label[-1]
        return current

    questions = []
    for i, (n, pno, y, title) in enumerate(unique):
        if i + 1 < len(unique):
            endp, endy = unique[i + 1][1], unique[i + 1][2]
        else:
            endp, endy = doc.page_count - 1, doc[doc.page_count - 1].rect.height - 35
        # A following "Part B/C" heading belongs to the next section, not
        # to the current question. Cut the crop there instead of including it.
        for _label, pp, py in parts:
            if (pp, py) > (pno, y) and (pp, py) < (endp, endy):
                endp, endy = pp, py
                break
        segments = []
        for pn in range(pno, endp + 1):
            y0 = max(35, y - 8) if pn == pno else 35
            y1 = (endy - 7) if pn == endp else (doc[pn].rect.height - 35)
            if y1 - y0 >= 5:
                segments.append(Segment(pn, y0, y1))
        questions.append(
            Question(
                n=n,
                part=part_for(pno, y),
                points=0,
                title=title,
                page=pno + 1,
                segments=segments,
            )
        )
    return doc, questions, parts


def find_points(doc, q: Question, extra_text: str = "") -> float:
    text = extra_text
    for seg in q.segments:
        text += "\n" + doc[seg.page].get_text(
            clip=pymupdf.Rect(50, seg.y0, 545, seg.y1)
        )
    # The first point marker in the question is normally the total for the question.
    m = re.search(r"\((\d+(?:[.,]\d+)?)\s*p\)", text, re.I)
    if m:
        return float(m.group(1).replace(",", "."))
    return 0


def trim_white(im: Image.Image, pad: int = 12) -> Image.Image | None:
    """Crop pure white margins left over from the PDF page layout."""
    background = Image.new("RGB", im.size, "white")
    bbox = ImageChops.difference(im, background).getbbox()
    if not bbox:
        return None
    left, top, right, bottom = bbox
    return im.crop(
        (
            max(0, left - pad),
            max(0, top - pad),
            min(im.width, right + pad),
            min(im.height, bottom + pad),
        )
    )


def render_segments(
    doc, segments: list[Segment], x0: float = 55, x1: float = 540
) -> Image.Image | None:
    imgs = []
    for seg in segments:
        page = doc[seg.page]
        clip = pymupdf.Rect(x0, seg.y0, x1, seg.y1)
        pix = page.get_pixmap(
            matrix=pymupdf.Matrix(ZOOM, ZOOM),
            clip=clip,
            colorspace=pymupdf.csRGB,
            alpha=False,
        )
        im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        im = trim_white(im)
        if im is not None:
            imgs.append(im)
    if not imgs:
        return None
    w = max(im.width for im in imgs)
    h = sum(im.height for im in imgs) + GAP * (len(imgs) - 1)
    canvas = Image.new("RGB", (w, h), "white")
    y = 0
    for im in imgs:
        canvas.paste(im, ((w - im.width) // 2, y))
        y += im.height + GAP
    return trim_white(canvas)


def save_webp(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "WEBP", quality=QUALITY, method=6)


def build_official() -> list[Exam]:
    exams = []
    for date, meta in OFFICIAL.items():
        qpath = EXAM_DIR / f"{date}.pdf"
        spath = EXAM_DIR / meta["answers"]
        qdoc, questions, _ = parse_layout(qpath)
        sdoc, squestions, _ = parse_layout(spath)
        smap = {q.n: q for q in squestions}
        outdir = ASSETS / "exams" / date
        for q in questions:
            q.points = find_points(qdoc, q)
            if not q.points:
                q.points = meta["part_c"] if q.part == "C" else 15
            q.tags = Q_TAGS.get((date, q.n), ["basic"])
            if "performance" in q.tags and "queue" not in q.tags:
                q.tags.append("queue")
            if date == "2023-10-25" and q.n == 14:
                q.note = "Figuren som uppgiften hänvisar till saknas i original-PDF:en."
            q.mcq = (date, q.n) in OFFICIAL_MCQ
            q.answer_choices = MCQ_ANSWER_CHOICES.get((date, q.n), "")
            q.q_image = f"assets/exams/{date}/q{q.n:02d}.webp"
            img = render_segments(qdoc, q.segments)
            if img is not None:
                save_webp(img, ROOT / q.q_image)
                q.q_size = img.size
            sq = smap.get(q.n)
            # 2023 has no official MCQ answers in the solutions document.
            has_answer = sq is not None and not (date == "2023-10-25" and q.n <= 5)
            if has_answer and sq is not None:
                q.solution_segments = sq.segments
                q.s_image = f"assets/exams/{date}/s{q.n:02d}.webp"
                simg = render_segments(sdoc, sq.segments)
                if simg is not None:
                    save_webp(simg, ROOT / q.s_image)
                    q.s_size = simg.size
        exams.append(Exam(date=date, title=meta["title"], questions=questions))
    return exams


def fmt_num(n: float) -> str:
    return (f"{n:g}").replace(".", ",")


def box_values(p: float) -> list[float]:
    vals: list[float] = []
    whole = int(p + 1e-9)
    for _ in range(whole):
        vals.append(1.0)
    rest = round(p - whole, 3)
    if rest >= 0.49:
        vals.append(0.5)
    return vals or [float(p)]


def tag_html(slug: str) -> str:
    label, file, page = TAGS.get(slug, (slug, "Introduction.pdf", 1))
    href = f"course-material/{file}" + (f"#page={page}" if page > 0 else "")
    return (
        f'<span class="tag-group tag-{slug}">'
        f'<a class="tag-main" href="{href}" target="_blank" rel="noopener noreferrer" '
        f'title="{esc(label)} – kursmaterial sida {page}">'
        f'<span class="tag-label">{esc(label)}</span>'
        f'<span class="tag-page">s. {page}</span>'
        f'<svg class="tag-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M9 7h8v8"/></svg>'
        f"</a></span>"
    )


def tags_html(q: Question) -> str:
    tags = q.tags or ["basic"]
    return '<div class="qtags">' + "".join(tag_html(t) for t in tags) + "</div>\n"


def draw_block_html(src: str, alt: str, draw_id: str, size=None) -> str:
    dims = f' width="{size[0]}" height="{size[1]}"' if size else ""
    return f'''
      <div class="draw-block" data-draw-id="{draw_id}">
        <div class="draw-wrap">
          <img loading="lazy" decoding="async" src="{src}" alt="{esc(alt)}"{dims}>
          <canvas class="draw-canvas" aria-hidden="true"></canvas>
        </div>{DRAW_TOOLS}
      </div>'''


def scoring_html(q: Question, date: str) -> str:
    if not q.points:
        return ""
    boxes = []
    for i, value in enumerate(box_values(q.points)):
        half = (
            '<span class="pt-half" aria-hidden="true">½</span>' if value == 0.5 else ""
        )
        boxes.append(
            f'<label class="pt" title="{fmt_num(value)} p">'
            f'<input type="checkbox" class="pt-input" data-key="{esc(date)}-{q.n}-{i}" '
            f'data-value="{value:g}" aria-label="{fmt_num(value)} poäng">'
            f'<span class="pt-box" aria-hidden="true"></span>{half}</label>'
        )
    group = (
        f'<div class="point-group"><span class="group-label">{fmt_num(q.points)} p</span>'
        f'<div class="pt-boxes">{"".join(boxes)}</div></div>'
    )
    return f'''      <div class="scoring" data-total="{q.points:g}">
        <span class="scoring-label">Poäng</span>
        <div class="point-groups">{group}</div>
        <button type="button" class="btn small score-all" data-score-all title="Fyll i alla poäng för uppgiften"><span aria-hidden="true">✓✓</span> Alla poäng</button>
      </div>
'''


def answer_html(q: Question) -> str:
    choice = (
        f'<div class="answer-choice"><span>Rätt val</span><strong>{esc(q.answer_choices)}</strong></div>'
        if q.answer_choices
        else ""
    )
    if q.s_image:
        dims = f' width="{q.s_size[0]}" height="{q.s_size[1]}"' if q.s_size else ""
        body = f'<img loading="lazy" decoding="async" src="{q.s_image}" alt="Lösning till uppgift {q.n}"{dims}>'
        return f"""      <details class="answer">
        <summary><span class="chev" aria-hidden="true"></span><span class="label">Visa lösning</span></summary>
        <div class="answer-body"><div class="answer-inner"><div class="answer-scroll">{body}</div></div></div>
      </details>
"""
    if q.solution_html:
        note = f'<p class="src">{q.source_label}</p>' if q.source_label else ""
        return f"""      <details class="answer">
        <summary><span class="chev" aria-hidden="true"></span><span class="label">Visa lösning</span></summary>
        <div class="answer-body"><div class="answer-inner"><div class="answer-scroll"><div class="answer-text">{choice}{q.solution_html}{note}</div></div></div></div>
      </details>
"""
    if q.llm_solution:
        note = f'<p class="src">{q.source_label}</p>' if q.source_label else ""
        return f"""      <details class="answer">
        <summary><span class="chev" aria-hidden="true"></span><span class="label">Visa LLM-lösning</span></summary>
        <div class="answer-body"><div class="answer-inner"><div class="answer-scroll"><div class="answer-text">
          <p class="answer-warning"><strong>Officiell lösning saknas.</strong> Följande är ett LLM-förslag som utgår från kursmaterialet. Kontrollera alltid mot föreläsningar och artiklar.</p>
          {choice}{q.llm_solution}{note}
        </div></div></div></div>
      </details>
"""
    return """      <details class="answer">
        <summary><span class="chev" aria-hidden="true"></span><span class="label">Lösning saknas</span></summary>
        <div class="answer-body"><div class="answer-inner"><div class="answer-scroll"><div class="answer-text">Det finns ingen officiell lösning för den här uppgiften i kursens lösningsdokument. Använd uppgiften som övning och jämför med kursmaterialet.</div></div></div></div>
      </details>
"""


def writing_html(q: Question, date: str) -> str:
    if q.mcq or q.options:
        return ""
    return f"""
      <div class="write-answer">
        <label for="answer-{date}-{q.n}">Ditt svar <span>Sparas lokalt i webbläsaren</span></label>
        <textarea id="answer-{date}-{q.n}" data-answer-notes data-key="{esc(date)}-{q.n}" rows="4" placeholder="Skriv ditt svar här …"></textarea>
      </div>"""


def card_html(q: Question, date: str) -> str:
    pts = fmt_num(q.points)
    pdf_page = q.page
    title_link = ""
    if not q.generated and date not in CANDIDATES:
        title_link = (
            f'<a class="q-title-link" href="old-exams/{date}.pdf#page={pdf_page}" target="_blank" '
            f'rel="noopener noreferrer" title="Öppna uppgift {q.n} i original-PDF:en (sida {pdf_page})">'
            f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M9 7h8v8"/></svg></a>'
        )
    note = f'<p class="source-note">{esc(q.note)}</p>' if q.note else ""
    if q.prompt_html:
        options = ""
        if q.options:
            options = (
                '<ul class="gen-options">'
                + "".join(f"<li>{esc(o)}</li>" for o in q.options)
                + "</ul>"
            )
        body = f'<div class="gen-prompt">{q.prompt_html}{options}</div>'
        qbody = f'<div class="qbody"><div class="qscroll">{body}{note}</div></div>'
    else:
        dims = q.q_size
        body = draw_block_html(q.q_image, f"Uppgift {q.n}", f"{date}-q{q.n}", dims)
        qbody = f'<div class="qbody"><div class="qscroll">{body}{note}</div></div>'
    return f"""
    <article class="qcard" id="{date}-q{q.n}" data-q="{q.n}">
      <div class="qcard-head">
        <span class="qnum">{q.n}</span>
        <h2>Uppgift {q.n}{title_link}</h2>
        <span class="points" data-card-points>0 / {pts} p</span>
      </div>
{tags_html(q)}      {qbody}
{writing_html(q, date)}
{scoring_html(q, date)}{answer_html(q)}    </article>
"""


def gradebar_html(date: str) -> str:
    b_json = json.dumps({str(k): v for k, v in BOUNDARIES.items()})
    scale = (
        " · ".join(f"{g} = {fmt_num(v)} p" for g, v in BOUNDARIES.items())
        + " · 6 = alla poäng"
    )
    return f'''    <div class="gradebar" data-exam="{date}" data-total="{TOTAL}" data-boundaries='{b_json}'>
      <div class="grade-score-wrap">
        <span class="grade-label">Dina poäng</span>
        <div class="grade-score"><strong data-grade-score>0</strong><span> / {TOTAL} p</span></div>
      </div>
      <div class="grade-badge grade-u" data-grade-badge><span>Betyg</span><strong>U</strong></div>
      <div class="grade-info">
        <div class="grade-note" data-grade-note>45 p kvar till betyg 3</div>
        <div class="grade-scale">Gränser: {scale}</div>
      </div>
      <button type="button" class="btn ghost small" data-reset>Nollställ poäng</button>
    </div>'''


def exam_panel_html(exam: Exam) -> str:
    qnav = "".join(f'<a href="#{exam.date}-q{q.n}">{q.n}</a>' for q in exam.questions)
    cards = "".join(card_html(q, exam.date) for q in exam.questions)
    note = ""
    if exam.date == "2023-10-25":
        note = '<div class="exam-note"><strong>Obs:</strong> lösningsdokumentet saknar officiella svar för de fem första flervalsfrågorna. Övriga lösningar finns.</div>'
    eyebrow = "ETSN11 · Genererad övning" if exam.generated else "ETSN11 · Riktig tenta"
    meta = (
        f"{len(exam.questions)} uppgifter · {TOTAL} p · AI-genererad övning · kontrollera mot kursmaterialet"
        if exam.generated
        else f"{len(exam.questions)} uppgifter · {TOTAL} p · officiell lösning där den finns"
    )
    if exam.generated:
        note = '<div class="exam-note"><strong>Övningsprov:</strong> frågorna är AI-genererade från kursmaterialet. De är inte officiella tentafrågor – kontrollera alltid mot föreläsningar och artiklar.</div>'
    return f"""<section class="exam-panel switch-panel" id="exam-{exam.date}" data-score-panel>
  <header class="exam-head">
    <p class="eyebrow">{eyebrow}</p>
    <h1>{esc(exam.title)}</h1>
    <p class="meta">{meta}</p>
{gradebar_html(exam.date)}
    <div class="toolbar">
      <nav class="qnav" aria-label="Hoppa till uppgift">{qnav}</nav>
      <div class="actions">
        <button type="button" class="btn" data-open-all>Visa alla lösningar</button>
        <button type="button" class="btn ghost" data-close-all>Dölj alla</button>
      </div>
    </div>
  </header>
  {note}
  <div class="questions">{cards}</div>
</section>"""


def official_panel_html(exams: list[Exam]) -> str:
    buttons = "".join(
        f'<button type="button" data-panel-target="exam-{e.date}" aria-pressed="false">{esc(e.date)}</button>'
        for e in exams
    )
    panels = "".join(exam_panel_html(e) for e in exams)
    return f"""<section class="category-head">
  <p class="eyebrow">Riktiga tentor</p>
  <h1>Träna på de riktiga tentorna</h1>
  <p>Sex tentamenstillfällen i kursen. Tre har officiella lösningar; övriga är exempel på inlämnade tentor och publiceras utan facit. Välj tillfälle nedan.</p>
</section>
<div class="switcher" data-switcher>{buttons}</div>
{panels}"""


COURSE_MATERIALS = [
    (
        "Introduction.pdf",
        "Introduktion",
        "Kursens upplägg, mål, examination och projekt.",
    ),
    (
        "Networks-and-applications-basic-concepts.pdf",
        "Nätverk och applikationer – grundbegrepp",
        "Hosts, protokoll, adresser, applikationstyper, radio/optik/ljud, backhaul och energiförsörjning.",
    ),
    (
        "Network-architectures.pdf",
        "Nätverksarkitekturer",
        "Centraliserade och decentraliserade arkitekturer, mesh, MAC, routing och resursbegränsade nät.",
    ),
    (
        "Review-of-probability-theory-and-statistics.pdf",
        "Sannolikhet och statistik",
        "Grundläggande sannolikhet, betingning, Bernoulliförsök, Poisson och exponentialfördelning.",
    ),
    (
        "Users-and-back-ends.pdf",
        "Användare och backends",
        "Cloud, edge, CDN, köteori, M/M/1, M/G/1, Littles lag och prestandamodeller.",
    ),
    (
        "Personal-Area-Networks-PAN.pdf",
        "PAN",
        "Bluetooth, BLE, BLE Mesh, ZigBee och lågeffektnät i hemmet.",
    ),
    (
        "Low-Power-Wide-Area-Networks-LPWAN.pdf",
        "LPWAN",
        "LoRa, LoRaWAN, NB-IoT, LTE-M, energisparande och typiska IoT-scenarier.",
    ),
    (
        "IEEE-802.11-WiFi.pdf",
        "IEEE 802.11 / WiFi",
        "WiFi 6/7, mesh, OFDMA, MCCA, HWMP och prestanda i trådlösa LAN.",
    ),
    (
        "Cellular-Mobile-Networks.pdf",
        "Mobila nät",
        "4G/5G, C-RAN, nätverksslicing, URLLC/eMBB/mMTC och privata nät.",
    ),
    (
        "Non-Terrestrial-Networks-NTN.pdf",
        "Satellitnät / NTN",
        "Starlink, Argos, Iridium, satellitbanor, backhaul och NTN-applikationer.",
    ),
    (
        "Interplanetary-networks.pdf",
        "Interplanetära nät",
        "Rymdlänkar, fördröjningar, space relays, LTP och DTN i rymden.",
    ),
    (
        "Delay-tolerant-networking.pdf",
        "Delay-tolerant networking",
        "Store-and-forward, Bundle protocol, LTP, JANUS och nätverk med intermittenta länkar.",
    ),
    (
        "Underwater-networks.pdf",
        "Undervattensnät",
        "Akustik, radio, optik, JANUS, IoUT, lokalisering och DTN-lösningar under vatten.",
    ),
    (
        "Lecture-about-Project.pdf",
        "Projekt",
        "Projektarbetets upplägg, läsuppgifter och redovisning.",
    ),
]

MATERIAL_DESC = {f: (t, d) for f, t, d in COURSE_MATERIALS}


TAG_ORDER = [k for k in TAGS if k != "articles"]


def clean_excerpt(q: Question) -> str:
    if q.prompt_html:
        text = re.sub(r"<[^>]+>", " ", q.prompt_html)
        text = html.unescape(re.sub(r"\s+", " ", text)).strip()
    else:
        text = re.sub(r"^\d+\.\s*", "", q.title or "").strip()
        text = re.sub(r"\(\d+\s*p\)", "", text).strip()
    if not text:
        text = "Bildfråga – öppna uppgiften för att se hela frågan."
    text = re.sub(r"\s+([?!.,;:])", r"\1", text)
    text = re.sub(r"\?{2,}", "?", text)
    if len(text) > 240:
        return text[:240].rstrip() + "…"
    if not q.prompt_html and text[-1] not in ".?!…":
        text += "…"
    return text


def all_tag_button(slug: str) -> str:
    label = TAGS.get(slug, (slug,))[0]
    return (
        f'<button type="button" class="tag-btn tag-{slug}" data-filter-tag="{slug}" '
        f'aria-pressed="false">{esc(label)}</button>'
    )


def all_item_html(q: Question, exam: Exam) -> str:
    if exam.generated:
        label = exam.title
        kind = "AI-genererad övning"
        tab = "tab-practice"
        cls = "kind-gen"
    elif exam.candidate:
        label = exam.title
        kind = "Exempel på inlämnad tenta"
        tab = "tab-real"
        cls = "kind-example"
    else:
        label = f"Tenta {exam.date}"
        kind = "Riktig tenta"
        tab = "tab-real"
        cls = "kind-real"
    return f"""<article class="all-item" data-tags="{esc("|".join(q.tags))}" data-generated="{1 if exam.generated else 0}">
  <div class="all-item-top"><span class="all-exam">{esc(label)} · Uppgift {q.n}</span><span class="all-points">{fmt_num(q.points)} p</span></div>
  <span class="all-kind {cls}">{esc(kind)}</span>
  <h2>Uppgift {q.n}</h2>
  <p class="all-excerpt">{esc(clean_excerpt(q))}</p>
  <div class="all-tags">{"".join(all_tag_button(t) for t in q.tags)}</div>
  <button type="button" class="all-open" data-open-all-question data-tab="{tab}" data-panel="exam-{exam.date}" data-card="{exam.date}-q{q.n}">Öppna uppgiften</button>
</article>"""


def all_panel_html(exams: list[Exam], practice: list[Exam]) -> str:
    all_exams = exams + practice
    items = "".join(all_item_html(q, e) for e in all_exams for q in e.questions)
    chips = "".join(
        f'<button type="button" class="filter-chip tag-{slug}" data-filter-tag="{slug}" aria-pressed="false">{esc(TAGS[slug][0])}</button>'
        for slug in TAG_ORDER
    )
    total = sum(len(e.questions) for e in all_exams)
    return f"""<section class="category-head all-head">
  <p class="eyebrow">Alla frågor</p>
  <h1>Hitta rätt uppgift</h1>
  <p>Filtrera på ämne och välj om AI-genererade övningsprov ska ingå. De ingår som standard.</p>
</section>
<div class="filter-panel">
  <div class="filter-top">
    <div class="filter-heading"><strong>Filtrera på ämne</strong><span>Välj ett eller flera ämnen – frågor som matchar minst ett visas.</span></div>
    <label class="all-toggle">
      <input type="checkbox" data-all-generated checked aria-label="Visa AI-genererade övningsprov">
      <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
      <span class="toggle-label">Visa AI-genererade övningsprov</span>
    </label>
  </div>
  <div class="filter-chips">{chips}</div>
  <div class="filter-foot"><span data-filter-count>Visar {total} av {total} frågor</span><button type="button" class="btn ghost small" data-filter-clear>Rensa filter</button></div>
</div>
<div class="all-list">{items}</div>
<p class="all-empty" hidden>Inga frågor matchar filtret.</p>"""


def material_panel_html() -> str:
    cards = []
    for filename, title, desc in COURSE_MATERIALS:
        cards.append(
            f'<a class="material-card" href="course-material/{filename}" target="_blank" rel="noopener noreferrer">'
            f'<span class="badge-soft">Föreläsning</span>'
            f"<h3>{esc(title)}</h3><p>{esc(desc)}</p>"
            f'<span class="material-link">Öppna PDF ↗</span></a>'
        )
    articles = ""
    apath = ROOT / "content" / "articles.json"
    if apath.exists():
        try:
            data = json.loads(apath.read_text())
        except Exception:
            data = []
        if data:
            acards = []
            for a in data:
                links = []
                if a.get("pdf"):
                    links.append(
                        f'<a href="{esc(a["pdf"])}" target="_blank" rel="noopener noreferrer">PDF ↗</a>'
                    )
                if a.get("url"):
                    links.append(
                        f'<a href="{esc(a["url"])}" target="_blank" rel="noopener noreferrer">Källa ↗</a>'
                    )
                access = {
                    "open": "Öppen",
                    "restricted": "Begränsad",
                    "web": "Webb",
                }.get(a.get("access"), "")
                acards.append(
                    f'<article class="article-card"><h3>{esc(a.get("title", ""))}</h3>'
                    f'<div class="meta">{esc(a.get("authors", ""))} · {esc(str(a.get("year", "")))} · {esc(a.get("venue", ""))} · {esc(access)}</div>'
                    f'<p class="article-note">{esc(a.get("note", ""))}</p>'
                    f'<div class="links">{" ".join(links) or "Ingen publik länk hittad"}</div></article>'
                )
            articles = (
                '<h2 style="margin-top:26px">Artiklar och vidare läsning</h2>'
                '<p class="meta" style="margin-bottom:10px">Kursens föreläsningar hänvisar till dessa artiklar. Öppna PDF:er är nedladdade i repo:t; begränsade källor länkas till förlaget.</p>'
                '<div class="article-grid">' + "".join(acards) + "</div>"
            )
    return f"""<section class="category-head">
  <p class="eyebrow">Kursmaterial</p>
  <h1>Allt kursmaterial på ett ställe</h1>
  <p>Föreläsningarna är grunden för taggarna och källänkarna i uppgifterna. Artiklarna är de som föreläsningarna hänvisar till.</p>
</section>
<div class="material-grid">{"".join(cards)}</div>
{articles}"""


def terms_panel_html() -> str:
    return """<section class="category-head">
  <p class="eyebrow">Begreppsträning</p>
  <h1>Matcha begrepp, definitioner och användning</h1>
  <p>Varje runda drar nya begrepp och blandar in extra alternativ. Du kan inte gissa dig fram till sista paret.</p>
</section>
<div class="match-shell">
  <div class="match-head">
    <div class="match-mode" role="group" aria-label="Välj träningsläge">
      <button type="button" data-match-mode="definition" aria-pressed="true">Definition → begrepp</button>
      <button type="button" data-match-mode="usage" aria-pressed="false">Användning → begrepp</button>
      <button type="button" data-match-mode="mixed" aria-pressed="false">Blandat</button>
    </div>
    <button type="button" class="match-new" data-match-new>Nytt prov</button>
  </div>
  <div class="match-stats">
    <span class="match-stat">Poäng <strong data-match-score>0</strong></span>
    <span class="match-stat">Streak <strong data-match-streak>0</strong></span>
    <span class="match-stat">Bästa streak <strong data-match-best>0</strong></span>
    <span class="match-stat">Klara <strong data-match-progress>0 / 0</strong></span>
  </div>
  <div class="match-board" data-match-board>
    <svg class="match-cables" data-match-cables aria-hidden="true"></svg>
    <div class="match-col"><h3>Frågor</h3><div class="match-prompts" data-match-prompts></div></div>
    <div class="match-col"><h3>Begrepp</h3><div class="match-options" data-match-options></div></div>
  </div>
  <p class="match-feedback" data-match-feedback role="status"></p>
  <div class="match-result" data-match-result hidden></div>
</div>"""


def practice_panel_html(sets: list[Exam]) -> str:
    if not sets:
        return """<section class="category-head">
  <p class="eyebrow">Övningsprov</p>
  <h1>Genererade övningsprov</h1>
  <p>Frågebanken byggs från kursmaterialet och sätts ihop efter samma balans som de riktiga tentorna: del A, B och C.</p>
</section>
<div class="exam-note"><strong>Under uppbyggnad:</strong> frågebanken och de genererade proven fylls på här.</div>"""
    buttons = "".join(
        f'<button type="button" data-panel-target="exam-{e.date}" aria-pressed="false">{esc(e.title)}</button>'
        for e in sets
    )
    panels = "".join(exam_panel_html(e) for e in sets)
    return f"""<section class="category-head">
  <p class="eyebrow">Övningsprov</p>
  <h1>Genererade övningsprov</h1>
  <p>Frågorna är AI-genererade från kursmaterialet och följer samma bredd och poängfördelning som tentorna. De är inte officiella tentor – kontrollera alltid mot kursmaterialet.</p>
</section>
<div class="switcher" data-switcher>{buttons}</div>
{panels}"""


def page_html(exams: list[Exam], practice: list[Exam], terms: list[dict]) -> str:
    tabs = f"""<button class="tab" id="tab-real" role="tab" aria-controls="cat-real" aria-selected="true" tabindex="0">Riktiga tentor</button>
<button class="tab" id="tab-practice" role="tab" aria-controls="cat-practice" aria-selected="false" tabindex="-1">Övningsprov</button>
<button class="tab" id="tab-terms" role="tab" aria-controls="cat-terms" aria-selected="false" tabindex="-1">Begrepp</button>
<button class="tab" id="tab-all" role="tab" aria-controls="exam-all" aria-selected="false" tabindex="-1">Alla frågor</button>
<button class="tab" id="tab-material" role="tab" aria-controls="cat-material" aria-selected="false" tabindex="-1">Kursmaterial</button>"""
    count = f"{len(exams)} tentor · {len(practice)} övningsprov · {sum(len(e.questions) for e in exams + practice)} uppgifter"
    terms_json = json.dumps(terms, ensure_ascii=False).replace("</", "<\\/")
    return f"""<!doctype html>
<html lang="sv" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ETSN11 – trådlösa nätverk och applikationer</title>
<meta name="description" content="Studieverktyg för ETSN11: riktiga tentor, genererade övningsprov och begreppsträning.">
<script>
(function () {{
  try {{
    var saved = localStorage.getItem('etsn11-theme');
    document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
  }} catch (e) {{
    document.documentElement.setAttribute('data-theme', 'dark');
  }}
}})();
</script>
<link rel="stylesheet" href="assets/site.css">
<link rel="stylesheet" href="assets/theme.css">
</head>
<body>
<canvas id="net-canvas" class="net-backdrop" aria-hidden="true"></canvas>
<div class="topbar">
  <div class="topbar-inner">
    <div class="topbar-head">
      <div class="brand"><span class="brand-mark">ETSN11</span> <span>trådlösa nätverk</span></div>
      <div class="topbar-actions">
        <div class="count">{count}</div>
        <button type="button" class="theme-switch" data-theme-toggle role="switch" aria-checked="true" aria-label="Mörkt tema" title="Byt till ljust tema">
          <span class="theme-slot theme-slot-sun" aria-hidden="true"><svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg></span>
          <span class="theme-slot theme-slot-moon" aria-hidden="true"><svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
          <span class="theme-thumb" aria-hidden="true"></span>
        </button>
      </div>
    </div>
    <nav class="tabs" role="tablist" aria-label="Välj del">{tabs}</nav>
  </div>
</div>
<main>
  <section id="cat-real" role="tabpanel" aria-labelledby="tab-real" data-switch-scope>
    {official_panel_html(exams)}
  </section>
  <section id="cat-practice" role="tabpanel" aria-labelledby="tab-practice" data-switch-scope hidden>
    {practice_panel_html(practice)}
  </section>
  <section id="cat-terms" role="tabpanel" aria-labelledby="tab-terms" hidden>
    {terms_panel_html()}
  </section>
  <section id="exam-all" role="tabpanel" aria-labelledby="tab-all" hidden>
    {all_panel_html(exams, practice)}
  </section>
  <section id="cat-material" role="tabpanel" aria-labelledby="tab-material" hidden>
    {material_panel_html()}
  </section>
</main>
<script>window.ETSN11_TERMS = {terms_json};</script>
<script src="assets/site.js"></script>
<script src="assets/app.js"></script>
<script src="assets/matching.js"></script>
<script src="assets/network.js"></script>
</body>
</html>"""


def build_generated() -> list[Exam]:
    bank = load_json(ROOT / "content" / "generated_bank.json", [])
    if not bank:
        return []
    by = {"A": [], "B": [], "C": []}
    for item in bank:
        by[item.get("part", "A")].append(item)
    sets = []
    for i, letter in enumerate("ABCDEF"):
        chosen = (
            by["A"][i * 5 : (i + 1) * 5]
            + by["B"][i * 2 : (i + 1) * 2]
            + by["C"][i * 2 : (i + 1) * 2]
        )
        if len(chosen) < 9:
            continue
        questions = []
        for n, item in enumerate(chosen, 1):
            solution_html = item.get("solution", "")
            choice_match = re.search(
                r"<strong>True:</strong>\s*([0-9][0-9,\s]*)", solution_html
            )
            answer_choices = (
                choice_match.group(1).strip().rstrip(" .") if choice_match else ""
            )
            if choice_match:
                false_match = re.search(
                    r"<strong>False:</strong>\s*([0-9][0-9,\s]*)", solution_html
                )
                solution_html = re.sub(
                    r"^\s*<p><strong>True:</strong>.*?</p>",
                    "",
                    solution_html,
                    count=1,
                    flags=re.S,
                )
                if false_match:
                    solution_html = (
                        '<p><strong>Fel:</strong> '
                        + false_match.group(1).strip().rstrip(" .")
                        + ".</p>"
                        + solution_html
                    )
            questions.append(
                Question(
                    n=n,
                    part=item["part"],
                    points=float(item["points"]),
                    title=f"Uppgift {n}",
                    page=0,
                    segments=[],
                    tags=(
                        item.get("tags", [])
                        + (
                            ["queue"]
                            if "performance" in item.get("tags", [])
                            and "queue" not in item.get("tags", [])
                            else []
                        )
                    ),
                    generated=True,
                    prompt_html=item.get("prompt", ""),
                    options=item.get("options", []),
                    solution_html=solution_html,
                    mcq=bool(item.get("options")),
                    answer_choices=answer_choices,
                    source_label=(
                        item.get("source_label", "")
                        + (
                            ' · <a href="course-material/QueuingSystems.pdf" target="_blank" rel="noopener noreferrer">Kihl, Queuing systems</a>'
                            if "performance" in item.get("tags", [])
                            and "QueuingSystems.pdf" not in item.get("source_label", "")
                            else ""
                        )
                    ),
                )
            )
        sets.append(
            Exam(
                date=f"gen-{letter}",
                title=f"Övningsprov {letter}",
                questions=questions,
                generated=True,
            )
        )
    return sets


def load_json(path: Path, default):
    try:
        return json.loads(path.read_text())
    except Exception:
        return default


def attach_llm_solutions(exams: list[Exam]) -> None:
    data = load_json(ROOT / "content" / "llm_solutions.json", {})
    for exam in exams:
        for q in exam.questions:
            if q.s_image or q.solution_html:
                continue
            q.llm_solution = data.get(f"{exam.date}-q{q.n}", "")


def build() -> None:
    exams = build_official() + build_candidates()
    attach_llm_solutions(exams)
    practice = build_generated()
    terms = load_json(ROOT / "content" / "terms.json", [])
    html_text = page_html(exams, practice, terms)
    (ROOT / "index.html").write_text(html_text)
    (ROOT / ".nojekyll").write_text("")
    print(f"wrote {ROOT / 'index.html'} ({len(html_text):,} bytes)")


CANDIDATES = {
    "2024-04-10": "2024-04-10.pdf",
    "2025-08-28": "2025-08-28.pdf",
    "2026-04-09": "2026-04-tenta.pdf",
}
CANDIDATE_TITLES = {
    "2024-04-10": "Exempel: tentamen 10 april 2024",
    "2025-08-28": "Exempel: tentamen 28 augusti 2025",
    "2026-04-09": "Exempel: tentamen 9 april 2026",
}
CAND_POINTS = {
    "2024-04-10": {
        1: 3,
        2: 3,
        3: 3,
        4: 3,
        5: 3,
        6: 5,
        7: 4,
        8: 3,
        9: 3,
        10: 8,
        11: 10,
        12: 6,
        13: 6,
        14: 15,
        15: 15,
    },
    "2025-08-28": {
        1: 5,
        2: 5,
        3: 5,
        4: 5,
        5: 5,
        6: 5,
        7: 10,
        8: 10,
        9: 10,
        10: 15,
        11: 15,
    },
    "2026-04-09": {
        1: 3,
        2: 3,
        3: 3,
        4: 3,
        5: 3,
        6: 5,
        7: 5,
        8: 5,
        9: 10,
        10: 10,
        11: 10,
        12: 15,
        13: 15,
    },
}
KEYWORD_TAGS = [
    ("wifi", ["wifi", "wi-fi", "802.11", "ofdma", "mimo", "mesh", "mcca", "hwmp"]),
    ("pan", ["bluetooth", "ble", "zigbee", "pan", "frequency hopping"]),
    ("lpwan", ["lora", "lorawan", "nb-iot", "lte-m", "lpwan", "aloha"]),
    (
        "cellular",
        ["5g", "4g", "lte", "c-ran", "cellular", "urllc", "embb", "mmtc", "slicing"],
    ),
    (
        "ntn",
        ["satellite", "starlink", "argos", "iridium", "orbit", "ntn", "space relay"],
    ),
    ("space", ["space", "moon", "interplanetary", "deep-space", "ltp", "solar"]),
    (
        "dtn",
        [
            "dtn",
            "delay-tolerant",
            "disruption",
            "bundle",
            "store-and-forward",
            "custody",
        ],
    ),
    ("underwater", ["underwater", "acoustic", "janus", "iout", "auv", "dolphin"]),
    (
        "backend",
        [
            "cloud",
            "edge",
            "fog",
            "cdn",
            "back-end",
            "backend",
            "data center",
            "data centre",
        ],
    ),
    (
        "performance",
        [
            "queue",
            "queuing",
            "poisson",
            "throughput",
            "utilization",
            "utilisation",
            "response time",
            "m/m/",
            "m/d/",
            "m/g/",
            "blocking",
            "aloha",
        ],
    ),
    (
        "probability",
        ["probability", "poisson", "exponential", "random variable", "bernoulli"],
    ),
]


def guess_tags(text: str) -> list[str]:
    low = text.lower()
    found = []
    for slug, words in KEYWORD_TAGS:
        if any(w in low for w in words):
            found.append(slug)
    # Keep the most informative tags, but always at least one.
    found = list(dict.fromkeys(found))
    return found[:3] or ["basic"]


def clean_candidate_lines(lines: list[str]) -> list[str]:
    out = []
    for line in lines:
        t = html.unescape(line.strip())
        if not t:
            continue
        if "Candidate " in t or t.startswith("Examination "):
            continue
        if re.match(r"^\d+\s*/\s*\d+$", t):
            continue
        if re.match(r"^\d{6}-\d+$", t):
            continue
        if re.match(r"^Part\s+[ABC]\b", t, re.I):
            continue
        if re.match(r"^Totalpoäng\b", t, re.I):
            continue
        if t.lower().startswith("uppgift") and "poäng" in t.lower():
            continue
        out.append(t)
    return out


def candidate_prompt(lines: list[str]) -> tuple[str, list[str]]:
    # Stop before the candidate's answer field.
    stop = len(lines)
    for i, line in enumerate(lines):
        if re.search(r"fill in your answer here|your answer|answer:", line, re.I):
            stop = i
            break
    lines = lines[:stop]
    if not lines:
        return "", []
    prompt_lines = []
    option_lines = []
    in_options = False
    for line in lines:
        if re.search(r"select one or more alternatives", line, re.I):
            in_options = True
            continue
        if in_options:
            option_lines.append(line)
        else:
            prompt_lines.append(line)
    paragraphs = []
    current = []
    for line in prompt_lines:
        starts_part = re.match(r"^\(?[a-hA-H][\).]\s+", line)
        starts_transition = re.match(
            r"^(?:First|Second|Third|Finally|Next|Then)\b", line, re.I
        )
        if current and (starts_part or starts_transition):
            paragraphs.append(" ".join(current))
            current = []
        current.append(line)
    if current:
        paragraphs.append(" ".join(current))
    html = "".join(f"<p>{esc(p)}</p>" for p in paragraphs)
    return html, option_lines


def build_candidates() -> list[Exam]:
    out = []
    for date, filename in CANDIDATES.items():
        path = EXAM_DIR / filename
        if not path.exists():
            continue
        doc = pymupdf.open(path)
        blocks = []
        for pno, page in enumerate(doc):
            for b in page.get_text("dict")["blocks"]:
                for line in b.get("lines", []):
                    text = "".join(
                        s.get("text", "") for s in line.get("spans", [])
                    ).strip()
                    if text:
                        blocks.append((pno, line["bbox"][1], line["bbox"][0], text))
        blocks.sort(key=lambda x: (x[0], x[1], x[2]))
        headings = []
        for pno, y, x, text in blocks:
            m = re.match(r"^(\d{1,2})\s+\d{6}-\d+$", text)
            if m:
                headings.append((int(m.group(1)), pno, y))
        # remove duplicate heading numbers (e.g. page artefacts)
        seen = set()
        uniq = []
        for h in headings:
            if h[0] in seen:
                continue
            seen.add(h[0])
            uniq.append(h)
        uniq.sort(key=lambda x: x[0])
        questions = []
        points_map = CAND_POINTS.get(date, {})
        for i, (n, pno, y) in enumerate(uniq):
            endp = uniq[i + 1][1] if i + 1 < len(uniq) else doc.page_count - 1
            endy = uniq[i + 1][2] if i + 1 < len(uniq) else doc[endp].rect.height
            lines = []
            for pp in range(pno, endp + 1):
                for pn, yy, xx, text in blocks:
                    if pn != pp:
                        continue
                    if pp == pno and yy <= y + 2:
                        continue
                    if pp == endp and yy >= endy - 1:
                        continue
                    lines.append(text)
            lines = clean_candidate_lines(lines)
            prompt, options = candidate_prompt(lines)
            text_for_tags = " ".join(lines[:30])
            pts = points_map.get(n)
            if not pts:
                m = re.search(r"\((\d+(?:[.,]\d+)?)\s*p\)", " ".join(lines), re.I)
                pts = (
                    float(m.group(1).replace(",", ".")) if m else (3 if n <= 9 else 15)
                )
            questions.append(
                Question(
                    n=n,
                    part=("A" if n <= 9 else "B" if n <= 13 else "C"),
                    points=pts,
                    title=f"Uppgift {n}",
                    page=pno + 1,
                    segments=[],
                    prompt_html=prompt,
                    options=options,
                    tags=guess_tags(text_for_tags),
                    mcq=bool(options),
                    answer_choices=MCQ_ANSWER_CHOICES.get((date, n), ""),
                )
            )
        # only use the questions whose text really exists
        questions = [q for q in questions if q.prompt_html.strip()]
        for q in questions:
            if "performance" in q.tags and "queue" not in q.tags:
                q.tags.append("queue")
        out.append(
            Exam(
                date=date,
                title=CANDIDATE_TITLES.get(date, date),
                questions=questions,
                candidate=True,
            )
        )
    return out


if __name__ == "__main__":
    build()
