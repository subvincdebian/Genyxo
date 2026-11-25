/**
 * Python run in the code sandbox to turn a canvas document into Word, PDF or
 * PowerPoint. Markdown is laid out as a real document (headings, lists,
 * tables, quotes, code); source code is exported as a clean listing.
 */
export const EXPORT_SCRIPT = String.raw`
import json, re
meta = json.load(open("input/meta.json", encoding="utf-8"))
fmt, title, kind = meta["format"], meta["title"].strip() or "Document", meta["kind"]
source = open("input/doc.txt", encoding="utf-8").read()
safe = re.sub(r"[^\w\-. ]+", "_", title).strip(" ._") or "document"

BULLET = re.compile(r"^\s*[-*+]\s+(.*)")
NUMBER = re.compile(r"^\s*\d+[.)]\s+(.*)")
STARTS = re.compile(r"^(#{1,6}\s|\x60\x60\x60|\s*[-*+]\s|\s*\d+[.)]\s|>|\|)")

def blocks(md):
    lines, i, out = md.splitlines(), 0, []
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("\x60\x60\x60"):
            code = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("\x60\x60\x60"):
                code.append(lines[i]); i += 1
            i += 1
            out.append(("code", "\n".join(code))); continue
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            out.append(("h", len(m.group(1)), m.group(2).strip().rstrip("#").strip())); i += 1; continue
        if re.match(r"^\s*(-{3,}|\*{3,}|_{3,})\s*$", line):
            out.append(("hr",)); i += 1; continue
        for pattern, name in ((BULLET, "ul"), (NUMBER, "ol")):
            if pattern.match(line):
                items = []
                while i < len(lines) and pattern.match(lines[i]):
                    items.append(pattern.match(lines[i]).group(1).strip()); i += 1
                out.append((name, items)); break
        else:
            if line.strip().startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|?\s*:?-{2,}", lines[i + 1]):
                rows = []
                while i < len(lines) and lines[i].strip().startswith("|"):
                    rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
                out.append(("table", [rows[0]] + rows[2:])); continue
            if line.strip().startswith(">"):
                quote = []
                while i < len(lines) and lines[i].strip().startswith(">"):
                    quote.append(lines[i].strip().lstrip(">").strip()); i += 1
                out.append(("quote", " ".join(quote))); continue
            if not line.strip():
                i += 1; continue
            para = [line.strip()]
            i += 1
            while i < len(lines) and lines[i].strip() and not STARTS.match(lines[i]):
                para.append(lines[i].strip()); i += 1
            out.append(("p", " ".join(para)))
            continue
        continue
    return out

INLINE = re.compile(r"(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|\x60[^\x60]+\x60|\[[^\]]+\]\([^)]+\))")
def runs(text):
    out = []
    for token in INLINE.split(text):
        if not token: continue
        if token[:2] in ("**", "__"): out.append((token[2:-2], True, False, False))
        elif token.startswith("\x60"): out.append((token[1:-1], False, False, True))
        elif token.startswith("["): out.append((re.match(r"\[([^\]]+)\]", token).group(1), False, False, False))
        elif token[0] in "*_" and len(token) > 2: out.append((token[1:-1], False, True, False))
        else: out.append((token, False, False, False))
    return out
plain = lambda text: "".join(part[0] for part in runs(text))

doc_blocks = blocks(source) if kind == "markdown" else [("h", 1, title), ("code", source)]
if kind == "markdown" and not any(b[0] == "h" for b in doc_blocks[:1]):
    doc_blocks = [("h", 1, title)] + doc_blocks

def to_docx(path):
    from docx import Document
    from docx.shared import Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    d = Document()
    d.core_properties.title = title
    style = d.styles["Normal"]; style.font.name = "Calibri"; style.font.size = Pt(11)
    def fill(paragraph, text, mono=False):
        for value, bold, italic, code in runs(text):
            run = paragraph.add_run(value)
            run.bold, run.italic = bold, italic
            if code or mono:
                run.font.name = "Consolas"; run.font.size = Pt(10)
    for block in doc_blocks:
        kind_ = block[0]
        if kind_ == "h": d.add_heading(plain(block[2]), level=min(block[1], 4) if block[1] > 1 else 0 if block is doc_blocks[0] else 1)
        elif kind_ == "p": fill(d.add_paragraph(), block[1])
        elif kind_ in ("ul", "ol"):
            for item in block[1]: fill(d.add_paragraph(style="List Bullet" if kind_ == "ul" else "List Number"), item)
        elif kind_ == "quote":
            p = d.add_paragraph(style="Quote"); fill(p, block[1])
        elif kind_ == "code":
            for line in block[1].splitlines() or [""]:
                p = d.add_paragraph(); p.paragraph_format.space_after = Pt(0)
                run = p.add_run(line or " "); run.font.name = "Consolas"; run.font.size = Pt(9.5)
                run.font.color.rgb = RGBColor(0x26, 0x2b, 0x2f)
        elif kind_ == "table":
            rows = block[1]; width = max(len(r) for r in rows)
            table = d.add_table(rows=len(rows), cols=width); table.style = "Table Grid"
            for r, row in enumerate(rows):
                for c in range(width):
                    cell = table.cell(r, c); cell.text = ""
                    fill(cell.paragraphs[0], row[c] if c < len(row) else "")
                    if r == 0:
                        for run in cell.paragraphs[0].runs: run.bold = True
            d.add_paragraph()
        elif kind_ == "hr": d.add_paragraph("")
    d.save(path)

def to_pdf(path):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Preformatted, Table, TableStyle, ListFlowable, ListItem, HRFlowable
    base = "/usr/share/fonts/truetype/dejavu/"
    pdfmetrics.registerFont(TTFont("Sans", base + "DejaVuSans.ttf"))
    pdfmetrics.registerFont(TTFont("Sans-Bold", base + "DejaVuSans-Bold.ttf"))
    import os
    oblique = base + "DejaVuSans-Oblique.ttf"
    pdfmetrics.registerFont(TTFont("Sans-Oblique", oblique if os.path.exists(oblique) else base + "DejaVuSans.ttf"))
    pdfmetrics.registerFont(TTFont("Mono", base + "DejaVuSansMono.ttf"))
    from reportlab.pdfbase.pdfmetrics import registerFontFamily
    registerFontFamily("Sans", normal="Sans", bold="Sans-Bold", italic="Sans-Oblique", boldItalic="Sans-Bold")
    ink = colors.HexColor("#16191b"); muted = colors.HexColor("#5c6468")
    body = ParagraphStyle("body", fontName="Sans", fontSize=10.5, leading=15.5, textColor=ink, spaceAfter=7)
    heads = {1: ParagraphStyle("h1", parent=body, fontName="Sans-Bold", fontSize=21, leading=26, spaceAfter=12, spaceBefore=4),
             2: ParagraphStyle("h2", parent=body, fontName="Sans-Bold", fontSize=15, leading=20, spaceBefore=12, spaceAfter=6),
             3: ParagraphStyle("h3", parent=body, fontName="Sans-Bold", fontSize=12.5, leading=17, spaceBefore=9, spaceAfter=4)}
    quote = ParagraphStyle("quote", parent=body, textColor=muted, leftIndent=12, borderPadding=(0, 0, 0, 8))
    code = ParagraphStyle("code", fontName="Mono", fontSize=8.6, leading=11.4, textColor=ink, backColor=colors.HexColor("#f3f4f5"), borderPadding=8, spaceAfter=10)
    def markup(text):
        out = ""
        for value, bold, italic, mono in runs(text):
            value = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            if mono: value = '<font name="Mono">' + value + "</font>"
            if bold: value = "<b>" + value + "</b>"
            if italic: value = "<i>" + value + "</i>"
            out += value
        return out
    def wrap(text, width=96):
        lines = []
        for line in text.splitlines() or [""]:
            while len(line) > width: lines.append(line[:width]); line = "  " + line[width:]
            lines.append(line)
        return "\n".join(lines)
    story = []
    for block in doc_blocks:
        kind_ = block[0]
        if kind_ == "h": story.append(Paragraph(markup(block[2]), heads[min(block[1], 3)]))
        elif kind_ == "p": story.append(Paragraph(markup(block[1]), body))
        elif kind_ in ("ul", "ol"):
            story.append(ListFlowable([ListItem(Paragraph(markup(i), body), leftIndent=14) for i in block[1]], bulletType="bullet" if kind_ == "ul" else "1", start="•" if kind_ == "ul" else 1, bulletFormat=None if kind_ == "ul" else "%s.", leftIndent=14, bulletFontName="Sans", bulletFontSize=9))
        elif kind_ == "quote": story.append(Paragraph(markup(block[1]), quote))
        elif kind_ == "code": story.append(Preformatted(wrap(block[1]), code))
        elif kind_ == "hr": story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#d9dcde"), spaceBefore=6, spaceAfter=10))
        elif kind_ == "table":
            rows = block[1]; width = max(len(r) for r in rows)
            data = [[Paragraph(("<b>%s</b>" if index == 0 else "%s") % markup(r[c] if c < len(r) else ""), body) for c in range(width)] for index, r in enumerate(rows)]
            table = Table(data, repeatRows=1, hAlign="LEFT")
            table.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, 0), 0.8, ink), ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#e1e3e5")), ("FONTNAME", (0, 0), (-1, 0), "Sans-Bold"), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
            story += [table, Spacer(1, 8)]
    def page(canvas, document):
        canvas.saveState(); canvas.setFont("Sans", 8); canvas.setFillColor(muted)
        canvas.drawRightString(A4[0] - 18 * mm, 12 * mm, str(document.page)); canvas.restoreState()
    SimpleDocTemplate(path, pagesize=A4, title=title, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm, bottomMargin=20 * mm).build(story, onFirstPage=page, onLaterPages=page)

def to_pptx(path):
    from pptx import Presentation
    from pptx.util import Inches, Pt, Emu
    from pptx.dml.color import RGBColor
    prs = Presentation(); prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    ink, muted = RGBColor(0x16, 0x19, 0x1b), RGBColor(0x5c, 0x64, 0x68)
    blank = prs.slide_layouts[6]
    def text_box(slide, left, top, width, height):
        frame = slide.shapes.add_textbox(left, top, width, height).text_frame; frame.word_wrap = True; return frame
    def add_slide(heading, items, subtitle=False):
        slide = prs.slides.add_slide(blank)
        frame = text_box(slide, Inches(0.8), Inches(0.6 if not subtitle else 2.6), Inches(11.7), Inches(1.4))
        p = frame.paragraphs[0]; run = p.add_run(); run.text = heading
        run.font.size = Pt(40 if subtitle else 30); run.font.bold = True; run.font.color.rgb = ink
        if not items: return
        body = text_box(slide, Inches(0.8), Inches(1.9 if not subtitle else 3.9), Inches(11.7), Inches(5.0))
        for index, (value, mono) in enumerate(items):
            p = body.paragraphs[0] if index == 0 else body.add_paragraph()
            p.space_after = Pt(10)
            prefix = "" if subtitle or mono else "•  "
            for text, bold, italic, code in runs(value) if not mono else [(value, False, False, True)]:
                r = p.add_run(); r.text = (prefix + text) if prefix else text; prefix = ""
                r.font.size = Pt(20 if not mono else 13); r.font.bold, r.font.italic = bold, italic
                r.font.color.rgb = muted if subtitle else ink
                if code or mono: r.font.name = "Consolas"
    slides, current = [], None
    for block in doc_blocks:
        if block[0] == "h" and block[1] <= 2:
            current = [plain(block[2]), []]; slides.append(current); continue
        if current is None:
            current = [title, []]; slides.append(current)
        if block[0] == "h": current[1].append((plain(block[2]), False))
        elif block[0] in ("p", "quote"): current[1].append((block[1], False))
        elif block[0] in ("ul", "ol"): current[1].extend((item, False) for item in block[1])
        elif block[0] == "code": current[1].extend((line, True) for line in block[1].splitlines()[:14])
        elif block[0] == "table": current[1].extend((" · ".join(row), False) for row in block[1])
    first = True
    for heading, items in slides:
        if first and not items:
            add_slide(heading, [], subtitle=True); first = False; continue
        first = False
        chunk = 7 if not any(mono for _, mono in items) else 14
        for start in range(0, max(1, len(items)), chunk):
            add_slide(heading if start == 0 else heading + " (cont.)", items[start:start + chunk])
    prs.save(path)

path = "output/" + safe + "." + fmt
{"docx": to_docx, "pdf": to_pdf, "pptx": to_pptx}[fmt](path)
print(path)
`;
