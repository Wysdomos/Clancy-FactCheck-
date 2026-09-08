#!/usr/bin/env python3
"""Builds the PDF edition from js/data.js so it always matches the app.
Usage:  node export_data.js > /tmp/clancy.json && python3 build_pdf.py /tmp/clancy.json out.pdf
Needs:  pip install reportlab
"""
import json, re, sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether)

src, out = sys.argv[1], sys.argv[2]
D = json.load(open(src))
S = D["S"]

NAVY = colors.HexColor("#1B2A41"); SLATE = colors.HexColor("#3D4F63")
RED = colors.HexColor("#B4232C"); RED_BG = colors.HexColor("#FBE9EA")
GREEN = colors.HexColor("#1E6B3A"); GREEN_BG = colors.HexColor("#E7F3EB")
AMBER = colors.HexColor("#9A5B00"); AMBER_BG = colors.HexColor("#FFF4E0")
BLUE = colors.HexColor("#2C4C74"); BLUE_BG = colors.HexColor("#EAF0F7")
GREY_BG = colors.HexColor("#F2F4F7"); LINE = colors.HexColor("#C9D1DB"); WHITE = colors.white
LINK = "#2C4C74"

base = ParagraphStyle("base", fontName="Helvetica", fontSize=9.4, leading=13, textColor=colors.HexColor("#1F2933"))
small = ParagraphStyle("small", parent=base, fontSize=8, leading=10.6, textColor=SLATE)
h1 = ParagraphStyle("h1", parent=base, fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=WHITE)
h2 = ParagraphStyle("h2", parent=base, fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=NAVY, spaceBefore=8, spaceAfter=4)
label_st = ParagraphStyle("label", parent=base, fontName="Helvetica-Bold", fontSize=7.4, leading=9.2, textColor=WHITE)
bullet_st = ParagraphStyle("bullet", parent=base, leftIndent=12, bulletIndent=2, spaceAfter=3)
tl_t = ParagraphStyle("tt", parent=base, fontName="Helvetica-Bold", fontSize=8.8, leading=11.5, textColor=NAVY)
title_st = ParagraphStyle("title", parent=base, fontName="Helvetica-Bold", fontSize=21, leading=25, textColor=WHITE)
sub_st = ParagraphStyle("sub", parent=base, fontSize=10, leading=13.5, textColor=colors.HexColor("#DCE3EC"))
W = letter[0] - 1.5 * inch

link_re = re.compile(r"\[\[([a-z0-9_]+)\|([^\]]+)\]\]")
def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
def md(t):
    parts, pos = [], 0
    for m in link_re.finditer(t):
        parts.append(esc(t[pos:m.start()]))
        src = S.get(m.group(1))
        txt = esc(m.group(2))
        parts.append(f'<a href="{src["u"]}" color="{LINK}"><u>{txt}</u></a>' if src else txt)
        pos = m.end()
    parts.append(esc(t[pos:]))
    return "".join(parts).replace("<strong>", "<b>").replace("</strong>", "</b>")
def strip(t):
    return link_re.sub(r"\2", t)
def keys_in(t):
    out = []
    for m in link_re.finditer(t):
        if m.group(1) in S and m.group(1) not in out: out.append(m.group(1))
    return out
def cites(keys):
    if not keys: return ""
    return "Sources: " + "; ".join(f'<a href="{S[k]["u"]}" color="{LINK}"><u>{esc(S[k]["o"])}</u></a>' for k in keys)

def P(t, st=base): return Paragraph(t, st)
def bullets(items): return [Paragraph(md(i), bullet_st, bulletText="\u2022") for i in items]
def banner(text, color=NAVY):
    t = Table([[Paragraph(text, h1)]], colWidths=[W])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), color), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    return [Spacer(1, 10), t, Spacer(1, 8)]
def callout(text, bg=GREY_BG, border=LINE):
    t = Table([[Paragraph(text, base)]], colWidths=[W])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 0.8, border), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    return t
def pair(top_label, top, bot_label, bot, tc, tbg, bc, bbg, keys):
    lab = 0.95 * inch
    rows = [[Paragraph(top_label, label_st), Paragraph(md(top), base)], [Paragraph(bot_label, label_st), Paragraph(md(bot), base)]]
    if keys: rows.append([Paragraph("", label_st), Paragraph(cites(keys), small)])
    t = Table(rows, colWidths=[lab, W - lab])
    st = [("BACKGROUND", (0, 0), (0, 0), tc), ("BACKGROUND", (1, 0), (1, 0), tbg), ("BACKGROUND", (0, 1), (0, 1), bc), ("BACKGROUND", (1, 1), (1, 1), bbg),
          ("BOX", (0, 0), (-1, -1), 0.8, LINE), ("LINEBELOW", (0, 0), (-1, 0), 0.6, WHITE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]
    if keys: st += [("BACKGROUND", (0, 2), (-1, 2), GREY_BG)]
    t.setStyle(TableStyle(st))
    return KeepTogether([t, Spacer(1, 7)])
VC = {"v-false": (RED, RED_BG), "v-contra": (RED, RED_BG), "v-warn": (AMBER, AMBER_BG), "v-ok": (GREEN, GREEN_BG), "v-neutral": (BLUE, BLUE_BG)}
def ledger(rows, label_color=GREEN, label_bg=GREEN_BG, tagged=False):
    data = []
    for r in rows:
        k = f"<b>{esc(r['k'])}</b>" + (f"<br/><font size='7.5' color='{label_color.hexval()}'>{esc(r['tag'])}</font>" if tagged else "")
        data.append([Paragraph(k, base), Paragraph(md(r["x"]) + f"<br/><font size='7.5' color='#3D4F63'>{cites(keys_in(r['x']))}</font>", base)])
    lab = 1.55 * inch
    t = Table(data, colWidths=[lab, W - lab])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 0), (0, -1), label_bg), ("BOX", (0, 0), (-1, -1), 0.8, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    return t
def timeline(rows):
    data = [[Paragraph(esc(r["t"]), tl_t), Paragraph(md(r["x"]), base)] for r in rows]
    t = Table(data, colWidths=[1.1 * inch, W - 1.1 * inch])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE), ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, GREY_BG]),
                           ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    return t
def on_page(c, doc):
    c.saveState(); c.setFont("Helvetica", 7.5); c.setFillColor(SLATE)
    c.drawString(0.75 * inch, 0.5 * inch, f"Clancy case fact-check  |  updated {D['UPDATED']}  |  every underlined phrase is a link to its source")
    c.drawRightString(letter[0] - 0.75 * inch, 0.5 * inch, f"Page {doc.page}")
    c.setStrokeColor(LINE); c.line(0.75 * inch, 0.68 * inch, letter[0] - 0.75 * inch, 0.68 * inch); c.restoreState()

story = []
cover = Table([[Paragraph("The Lindsay Clancy Case: Separating Fact From Rumor", title_st)],
               [Paragraph("The claims about Patrick Clancy checked against the record, the proof that Lindsay did it, why she did it, the court files and trial video, and every source", sub_st)],
               [Paragraph(f"Updated {D['UPDATED']}. App version {D['VERSION']}.", sub_st)]], colWidths=[W])
cover.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY), ("LEFTPADDING", (0, 0), (-1, -1), 14), ("RIGHTPADDING", (0, 0), (-1, -1), 14), ("TOPPADDING", (0, 0), (-1, 0), 16), ("TOPPADDING", (0, 1), (-1, -1), 4), ("BOTTOMPADDING", (0, -1), (-1, -1), 16)]))
story += [cover, Spacer(1, 12)]
all_text = " ".join(D["STATUS"] + [t["x"] for t in D["TIMELINE"]] + [t["x"] for t in D["CASE_TIMELINE"]] + [m["claim"] + m["fact"] for m in D["MYTHS"]] +
                    [c["claim"] + c["rec"] for c in D["CLAIMS"]] + D["WHY"]["agreed"] + D["WHY"]["prosecution"] + D["WHY"]["defense"] + D["WHY"]["jury"] +
                    [p["x"] for p in D["PROOF"]] + [e["x"] for e in D["EVIDENCE"]] + D["CRITICISMS"] + D["CHECKS"] + [r["note"] for r in D["RESOURCES"]])
nlinks = len(link_re.findall(all_text))
story.append(callout("<b>Read this first.</b> Patrick Clancy is not on trial, has never been charged, and prosecutors have never indicated he played any role in the deaths of Cora (5), Dawson (3) and Callan (8 months) on Jan. 24, 2023. He was the prosecution's first witness. Lindsay Clancy does not deny strangling the children; her defense is that she was in the throes of postpartum mental illness and not criminally responsible. The items under Claims about Patrick are social-media claims, not evidence. "
                     f"This edition: {len(D['CLAIMS'])} theories about Patrick, {len(D['MYTHS'])} pieces of misinformation, {len(D['PROOF'])} categories of proof, {len(D['RESOURCES'])} court files and videos, {nlinks} linked facts, {len(S)} sources.", bg=AMBER_BG, border=AMBER))
story.append(Spacer(1, 8)); story.append(P("<b>Where the case stands</b>", h2)); story += bullets(D["STATUS"])

story += banner("1.  January 24, 2023, minute by minute"); story.append(timeline(D["TIMELINE"]))
story += banner("2.  The case, 2022 to 2026"); story.append(timeline(D["CASE_TIMELINE"]))

story += banner("3.  Misinformation about the case, checked")
for m in D["MYTHS"]:
    c, bg = VC[m["vc"]]
    story.append(pair(f"#{m['id']}<br/>{esc(m['v']).upper()}", m["claim"], "THE FACTS", m["fact"], c, bg, GREEN, GREEN_BG, keys_in(m["claim"] + m["fact"])))

story += banner("4.  The \"Patrick did it\" claims, against the record", color=RED)
cats = {"A": "A. Timeline and alibi", "B": "B. The scene, her injuries and the forensics", "C": "C. Digital evidence", "D": "D. Behavior, demeanor and \"vibes\"", "E": "E. The house, the move and the money"}
last = None
for c in D["CLAIMS"]:
    if c["cat"] != last: story.append(P(cats[c["cat"]], h2)); last = c["cat"]
    col, bg = VC[c["vc"]]
    story.append(pair(f"{c['id']}<br/>ONLINE CLAIM", c["claim"], f"THE RECORD<br/>({esc(c['v'])})", c["rec"], RED, RED_BG, col if c["vc"] != "v-contra" else GREEN, bg if c["vc"] != "v-contra" else GREEN_BG, keys_in(c["claim"] + c["rec"])))

story += banner("5.  Why she did it", color=BLUE)
for title, key in [("What both sides agree on", "agreed"), ("The prosecution's answer: it was a choice", "prosecution"), ("The defense's answer: her mind was gone", "defense"), ("What the jury was given, and what it did", "jury")]:
    story.append(P(title, h2)); story += bullets(D["WHY"][key])

story.append(PageBreak()); story += banner("6.  Proof she did it", color=GREEN)
story.append(P("Every category of evidence that she, and only she, carried out the killings.", small)); story.append(Spacer(1, 4))
story.append(ledger(D["PROOF"], tagged=True))

story.append(PageBreak()); story += banner("7.  Why Patrick is ruled out", color=GREEN)
story.append(ledger(D["EVIDENCE"]))

story += banner("8.  Fair criticism of Patrick that is not evidence of involvement"); story += bullets(D["CRITICISMS"])
story.append(P("Quick filter for the next viral claim", h2)); story += bullets(D["CHECKS"])

story.append(PageBreak()); story += banner("9.  Court files, dockets and trial video", color=BLUE)
rows = []
for r in D["RESOURCES"]:
    s = S[r["key"]]
    rows.append([Paragraph(f"<b>{esc(r['type'])}</b>", small), Paragraph(f'<a href="{s["u"]}" color="{LINK}"><u><b>{esc(s["t"])}</b></u></a><br/><font color="#3D4F63" size="7.5">{esc(s["o"])}, {esc(s["d"])}</font><br/>{md(r["note"])}', base)])
t = Table(rows, colWidths=[0.85 * inch, W - 0.85 * inch])
t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
story.append(t)

story.append(PageBreak()); story += banner("Sources")
src_st = ParagraphStyle("src", parent=small, leftIndent=12, bulletIndent=2, spaceAfter=2.5)
for k, s in S.items():
    story.append(Paragraph(f'<b>{esc(s["o"])}</b>, {esc(s["d"])}: <a href="{s["u"]}" color="{LINK}"><u>{esc(s["t"])}</u></a><br/><font size="7">{esc(s["u"])}</font>', src_st, bulletText="\u2022"))
story.append(Spacer(1, 8))
story.append(P("Compiled from trial testimony, court filings and news reporting. Not legal advice. If you or someone you know is struggling, call or text 988 (Suicide and Crisis Lifeline) or 1-833-TLC-MAMA (National Maternal Mental Health Hotline).", small))

doc = SimpleDocTemplate(out, pagesize=letter, leftMargin=0.75 * inch, rightMargin=0.75 * inch, topMargin=0.7 * inch, bottomMargin=0.85 * inch,
                        title="The Lindsay Clancy Case: Separating Fact From Rumor", author="Clancy case fact-check", subject="Claims checked against the record")
doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print("built", out)
