# Rendering Code Reference

Implementation details for Steps 5–8 of the photo-calendar-generator skill.

---

## Step 5 — Compose Calendar Pages

### Constants and Font Loading

    from PIL import Image, ImageDraw, ImageFont
    import csv, os

    S      = 2       # scale: 2=600 DPI, 1=300 DPI draft
    PAGE_W = 4960    # A4 at 600 DPI
    PAGE_H = 7016
    SAFE   = 168     # px — 7.1 mm safe zone at 600 DPI

    FONT_DIR    = os.path.expanduser('~/Library/Fonts')
    ITALIC_TTF  = f'{FONT_DIR}/CormorantGaramond-Italic[wght].ttf'
    REGULAR_TTF = f'{FONT_DIR}/CormorantGaramond[wght].ttf'

    def load_fonts(size):
        return {
            'italic':  ImageFont.truetype(ITALIC_TTF,  max(8, size)),
            'bold':    ImageFont.truetype(REGULAR_TTF, max(8, int(size * 1.5))),
            'regular': ImageFont.truetype(REGULAR_TTF, max(8, int(size * 0.55))),
            'date':    ImageFont.truetype(REGULAR_TTF, max(8, int(size * 0.80))),
            'label':   ImageFont.truetype(ITALIC_TTF,  max(8, int(size * 0.52))),
        }
    # Full pages:            fonts = load_fonts(130 * S)
    # Year overview thumbs:  fonts = load_fonts(int(130 * S * cell_w / PAGE_W))

    DAY_HEADERS = ["L", "M", "M", "J", "V", "S", "D"]   # French; adapt per language

    def hex_rgb(h):
        h = h.lstrip('#')
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

### CRITICAL: textbbox Offset Bug

`draw.textbbox((0, 0), text, font)` returns `(left, top, right, bottom)` where `top` is
**NOT zero** — it is typically a large positive offset (~115 px at large sizes). This is
an internal font metric, not a bug, but it breaks naive y-advancement.

Rules:
- To advance `y` after drawing text at position `y`: use `y += bb[3]` (full bottom value)
  - **WRONG:** `y += bb[3] - bb[1]`  → misses top offset, places next element too high
  - **RIGHT:** `y += bb[3]`
- To place a rule below capital letters (not below descenders): use
  `cap_b = draw.textbbox((0,0), 'A', font)[3]` and draw rule at `y + cap_b + gap`.
  Descenders (e.g. J in JUIN) will naturally cross below the rule — correct typographically.

### Helper Functions

    def cover_fit(img, w, h):
        """Scale image to fill w×h exactly, anchor to top (preserves dark upper zone)."""
        iw, ih = img.size
        scale = max(w / iw, h / ih)
        nw, nh = int(iw * scale), int(ih * scale)
        img = img.resize((nw, nh), Image.LANCZOS)
        ox = (nw - w) // 2
        return img.crop((ox, 0, ox + w, h))   # oy=0: top-anchored

    def draw_spaced(draw, text, font, y, color, spacing, page_w):
        """Render text centered on page with extra letter spacing (luxury editorial effect)."""
        bbs = [draw.textbbox((0, 0), ch, font=font) for ch in text]
        total_w = sum(b[2] - b[0] for b in bbs) + spacing * (len(text) - 1)
        x = (page_w - total_w) // 2
        for ch, bb in zip(text, bbs):
            draw.text((x, y), ch, font=font, fill=color)
            x += bb[2] - bb[0] + spacing

### Wire-O Binding Clearance

If the calendar uses Wire-O binding (recommended for wall calendars), the punch hole sits
~10–12mm from the top. At A3 print scale (4960×7016px printed at 297×420mm = 424 DPI),
content must start below **23–25mm from top** to clear the hole.

    # A3 binding clearance: 400px = 23.9mm at 424 DPI
    BINDING_Y = int(PAGE_H * 0.057)   # ≈ 400px — content starts here
    DARK_FRAC = 0.41                   # extend dark zone from 0.37 to cover shifted content

    # A4 binding clearance: 168px = 7.1mm at 600 DPI (safe zone only)
    # BINDING_Y = int(PAGE_H * 0.024) # ≈ 168px — minimal clearance, risky for wire-O

### Page Rendering

    def render_page(month_name, city, subject_label, color_hex,
                    image_path, csv_row, out_path, fonts, year):
        color    = hex_rgb(color_hex)
        gold_dim = tuple(int(c * 0.65) for c in color)

        bg   = Image.open(image_path).convert('RGB')
        page = cover_fit(bg, PAGE_W, PAGE_H)

        # Gradient dark overlay — constant alpha through calendar zone, then fades to 0
        # overlay_alpha: 160 = default, 240 = extra dark for images with high-contrast arches
        overlay_alpha = 160   # per-month; increase for months where arch meets calendar zone
        dark_end   = int(PAGE_H * 0.41)
        fade_start = int(dark_end * 0.92)   # keep full opacity through all date rows
        fade_end   = int(dark_end * 1.22)   # soft tail extends well into door area — no hard line
        overlay    = Image.new('RGBA', (PAGE_W, fade_end), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        for row in range(fade_end):
            if row < fade_start:
                alpha = overlay_alpha
            else:
                t = (row - fade_start) / (fade_end - fade_start)
                alpha = int(overlay_alpha * (1.0 - t))
            od.line([(0, row), (PAGE_W, row)], fill=(0, 0, 0, alpha))
        rgba = page.convert('RGBA')
        rgba.alpha_composite(overlay, (0, 0))
        page = rgba.convert('RGB')
        draw = ImageDraw.Draw(page)

        y = BINDING_Y   # start below Wire-O punch hole

        # Year in italic
        bb = draw.textbbox((0, 0), str(year), font=fonts['italic'])
        draw.text(((PAGE_W - (bb[2]-bb[0])) // 2, y), str(year),
                  font=fonts['italic'], fill=color)
        y += bb[3] + int(PAGE_H * 0.006)

        # Month name in bold spaced caps
        draw_spaced(draw, month_name.upper(), fonts['bold'], y, color,
                    int(PAGE_W * 0.006), PAGE_W)
        cap_b = draw.textbbox((0, 0), 'A', font=fonts['bold'])[3]
        y += cap_b + int(PAGE_H * 0.008)

        # Thin rule (anchored to cap height — descenders cross it naturally)
        rule_hw = int(PAGE_W * 0.262)
        draw.line([(PAGE_W//2 - rule_hw, y), (PAGE_W//2 + rule_hw, y)],
                  fill=gold_dim, width=max(1, S))
        y += int(PAGE_H * 0.008)

        # Day headers
        col_w = (PAGE_W - 2 * int(PAGE_W * 0.071)) // 7
        margin_x = int(PAGE_W * 0.071)
        for i, h in enumerate(DAY_HEADERS):
            bb_h = draw.textbbox((0, 0), h, font=fonts['regular'])
            cx = margin_x + i * col_w + (col_w - (bb_h[2]-bb_h[0])) // 2
            draw.text((cx, y), h, font=fonts['regular'], fill=color)
        hdr_b = draw.textbbox((0, 0), 'M', font=fonts['regular'])[3]
        y += hdr_b + int(PAGE_H * 0.004)

        # Date grid — D1…D42
        # stroke_width simulates bold weight (no separate bold TTF after cask install)
        dark_end = int(PAGE_H * 0.41)
        row_h    = (dark_end - y - int(PAGE_H * 0.006)) // 6
        for idx in range(42):
            val = csv_row.get(f'D{idx+1}', '').strip()
            if val:
                col = idx % 7
                row = idx // 7
                bb_d = draw.textbbox((0, 0), val, font=fonts['date'])
                cx   = margin_x + col * col_w + (col_w - (bb_d[2]-bb_d[0])) // 2
                cy   = y + row * row_h
                draw.text((cx, cy), val, font=fonts['date'], fill=color,
                          stroke_width=max(1, S), stroke_fill=color)   # bold effect

        # Bottom label bar
        bar_h = int(PAGE_H * 0.05)
        bar   = Image.new('RGBA', (PAGE_W, bar_h), (0, 0, 0, 180))
        rgba  = page.convert('RGBA')
        rgba.paste(bar, (0, PAGE_H - bar_h), bar)
        page  = rgba.convert('RGB')
        draw  = ImageDraw.Draw(page)
        label = f'{subject_label}  ({city})'
        bb_l  = draw.textbbox((0, 0), label, font=fonts['label'])
        lh    = bb_l[3] - bb_l[1]
        ly    = PAGE_H - bar_h + (bar_h - lh) // 2
        draw.text(((PAGE_W - (bb_l[2]-bb_l[0])) // 2, ly),
                  label, font=fonts['label'], fill=color)

        page.save(out_path, dpi=(600, 600))

---

## Step 6 — Front Cover Page

Same dimensions as a monthly page, no calendar grid. File: `00_COVER_YEAR.png`.

    def render_cover(title_line1, title_line2, subtitle, year,
                     color_hex, image_path, bottom_label, out_path, fonts):
        color    = hex_rgb(color_hex)
        gold_dim = tuple(int(c * 0.65) for c in color)

        bg   = Image.open(image_path).convert('RGB')
        page = cover_fit(bg, PAGE_W, PAGE_H)

        # Gradient over top ~45%
        grad_h  = int(PAGE_H * 0.45)
        overlay = Image.new('RGBA', (PAGE_W, grad_h), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        for row in range(grad_h):
            alpha = int(200 * (1.0 - row / grad_h * 0.55))
            od.line([(0, row), (PAGE_W, row)], fill=(0, 0, 0, alpha))
        rgba = page.convert('RGBA')
        rgba.paste(overlay, (0, 0), overlay)
        page = rgba.convert('RGB')
        draw = ImageDraw.Draw(page)

        y = int(PAGE_H * 0.07)

        # Year
        bb = draw.textbbox((0, 0), str(year), font=fonts['italic'])
        draw.text(((PAGE_W - (bb[2]-bb[0])) // 2, y), str(year),
                  font=fonts['italic'], fill=color)
        y += bb[3] + int(PAGE_H * 0.010)

        # Rule
        rw = int(PAGE_W * 0.15)
        draw.line([(PAGE_W//2-rw, y), (PAGE_W//2+rw, y)], fill=gold_dim, width=max(1,S))
        y += int(PAGE_H * 0.018)

        # Title line 1 (e.g. "LES PORTES")
        draw_spaced(draw, title_line1.upper(), fonts['bold'], y, color,
                    int(PAGE_W * 0.007), PAGE_W)
        cap_b = draw.textbbox((0, 0), 'A', font=fonts['bold'])[3]
        y += cap_b + int(PAGE_H * 0.004)

        # Title line 2 (e.g. "DU MAROC")
        draw_spaced(draw, title_line2.upper(), fonts['bold'], y, color,
                    int(PAGE_W * 0.009), PAGE_W)
        cap_b2 = draw.textbbox((0, 0), 'A', font=fonts['bold'])[3]
        y += cap_b2 + int(PAGE_H * 0.018)

        # Rule
        draw.line([(PAGE_W//2-rw, y), (PAGE_W//2+rw, y)], fill=gold_dim, width=max(1,S))
        y += int(PAGE_H * 0.014)

        # Subtitle
        bb_s = draw.textbbox((0, 0), subtitle, font=fonts['label'])
        draw.text(((PAGE_W - (bb_s[2]-bb_s[0])) // 2, y),
                  subtitle, font=fonts['label'], fill=color)

        # Bottom bar
        bar_h = int(PAGE_H * 0.05)
        bar   = Image.new('RGBA', (PAGE_W, bar_h), (0, 0, 0, 180))
        rgba  = page.convert('RGBA')
        rgba.paste(bar, (0, PAGE_H - bar_h), bar)
        page  = rgba.convert('RGB')
        draw  = ImageDraw.Draw(page)
        bb_l  = draw.textbbox((0, 0), bottom_label, font=fonts['label'])
        lh    = bb_l[3] - bb_l[1]
        ly    = PAGE_H - bar_h + (bar_h - lh) // 2
        draw.text(((PAGE_W - (bb_l[2]-bb_l[0])) // 2, ly),
                  bottom_label, font=fonts['label'], fill=color)

        page.save(out_path, dpi=(600, 600))

---

## Step 7 — QA Overview Grid

Tile all 12 source images in a 4×3 grid for visual review (not a calendar page):

    THUMB_W  = int(700 * S)
    THUMB_H  = int(THUMB_W * PAGE_H / PAGE_W)
    LABEL_H  = int(50 * S)
    canvas_w = 4 * THUMB_W
    canvas_h = 3 * (THUMB_H + LABEL_H)
    canvas   = Image.new('RGB', (canvas_w, canvas_h), (15, 15, 15))
    draw     = ImageDraw.Draw(canvas)
    font_t   = ImageFont.truetype(REGULAR_TTF, int(28 * S))

    for idx, (month, data) in enumerate(MONTH_DATA.items()):
        col, row = idx % 4, idx // 4
        x = col * THUMB_W
        y = row * (THUMB_H + LABEL_H)
        thumb = cover_fit(Image.open(f"images-upscaled/{data['img']}"), THUMB_W, THUMB_H)
        canvas.paste(thumb, (x, y))
        draw.rectangle([x, y+THUMB_H, x+THUMB_W, y+THUMB_H+LABEL_H], fill=(25, 25, 25))
        lbl  = f"{month} — {data['city']}"
        bb_t = draw.textbbox((0, 0), lbl, font=font_t)
        draw.text((x + (THUMB_W-(bb_t[2]-bb_t[0]))//2, y+THUMB_H+(LABEL_H-(bb_t[3]-bb_t[1]))//2),
                  lbl, font=font_t, fill=hex_rgb(data['color']))

    canvas.save("overview_all_months.jpg", quality=88)

---

## Step 8 — Year Overview Page (Page 13)

Full A4 page containing a 4×3 thumbnail grid of the 12 final pages + next-year
mini-calendar strip + credits line.

**Key principles:**
- **Measure content height first, then position bottom-up** — prevents dead space.
- **2 rows × 6 months** for the next-year mini-calendar — far more legible than 1 row × 12 (each month ~755px vs ~368px wide).
- **Do NOT add extra text overlays** on top of thumbnails — the monthly pages already have month names baked in. Overlaying again doubles the text.
- Credits line: use `120px` (not 52px) — small enough to be subtle, large enough to read.
- **Thumbnail crop `vert=1.0` with `zoom=1.02`**: `vert=1.0` anchors doors to the bottom of each cell. The 2% zoom gives the crop enough extra room to fully hide the "2026" text from each monthly page (which otherwise peeks in as a sliver at the thumbnail top). Imperceptible at thumbnail size.
- **Year label at top-left, above the grid**: with Wire-O binding, the punch hole is at center-top. Placing "YEAR" (e.g. "2026") in the top-left corner margin (y centered in the SAFE zone above grid_top) is safe and gives the overview page its own year identity. Draw it AFTER pasting thumbnails so it's not covered.
- **Full month names** for next-year mini-calendar (JANVIER, SEPTEMBRE etc.) at `name_sz = int(mini_w * 0.09)` — abbreviated names look unnecessary when space is available.
- **Dim both Saturday AND Sunday** in mini-calendar: `strip_fade if di >= 5 else strip_gold` (Mon-first layout: 0=Mon … 5=Sat, 6=Sun).

    import calendar as cal_mod

    MINI_COLS  = 6     # months per row
    MINI_ROWS  = 2     # rows of mini-months
    mini_gap_h = 18    # horizontal gap between months
    mini_gap_v = 48    # vertical gap between the two rows

    # mini_w at 6 per row ≈ 755px (was ~368px at 12 per row — 2× bigger = much more legible)
    mini_w = (PAGE_W - 2*SAFE - (MINI_COLS-1)*mini_gap_h) // MINI_COLS

    def render_year_overview(final_dir, monthly_data, next_year,
                              credits_text, out_path):
        """
        monthly_data: list of (month_name, color_hex, filename) for 12 months
        """
        page = Image.new('RGB', (PAGE_W, PAGE_H), (12, 12, 12))
        draw = ImageDraw.Draw(page)
        _p   = ImageDraw.Draw(Image.new('RGB', (1,1)))   # probe for measurement

        strip_gold = (212, 180, 100)
        strip_dim  = tuple(int(c*0.65) for c in strip_gold)
        strip_fade = tuple(int(c*0.45) for c in strip_gold)

        GAP_COL = 24
        GAP_ROW = 36

        # --- Font sizes (proportional to mini_w ~755px) ---
        credits_sz = 120
        lbl_sz     = 130
        name_sz    = max(8, int(mini_w * 0.13))
        hdr_sz     = max(8, int(mini_w * 0.09))
        date_sz    = max(8, int(mini_w * 0.095))

        f_credits = ImageFont.truetype(ITALIC_TTF,  credits_sz)
        f_lbl     = ImageFont.truetype(ITALIC_TTF,  lbl_sz)
        f_name    = ImageFont.truetype(ITALIC_TTF,  name_sz)
        f_hdr     = ImageFont.truetype(REGULAR_TTF, hdr_sz)
        f_date    = ImageFont.truetype(REGULAR_TTF, date_sz)

        credits_h   = _p.textbbox((0,0), 'Hy',             font=f_credits)[3]
        lbl_h       = _p.textbbox((0,0), str(next_year),   font=f_lbl)[3]
        name_h      = _p.textbbox((0,0), 'JAN',            font=f_name)[3]
        row_h7      = int(_p.textbbox((0,0), 'M',          font=f_hdr)[3] * 1.55)
        mini_grid_h = name_h + 4 + row_h7 + 6 * row_h7
        two_rows_h  = 2 * mini_grid_h + mini_gap_v

        CREDITS_GAP = 36
        MINI_GAP_V  = 28
        LBL_GAP     = 24
        RULE_GAP    = 28

        strip_h = (RULE_GAP + 4 + LBL_GAP + lbl_h +
                   MINI_GAP_V + two_rows_h + CREDITS_GAP + credits_h + SAFE)

        # --- Thumbnail grid ---
        grid_top    = SAFE
        grid_bottom = PAGE_H - SAFE - strip_h - GAP_ROW
        row_h       = (grid_bottom - grid_top - 2*GAP_ROW) // 3
        cell_w      = (PAGE_W - 2*SAFE - 3*GAP_COL) // 4

        for idx, (mname, color_hex, fname) in enumerate(monthly_data):
            col = idx % 4
            row = idx // 4
            x0  = SAFE + col * (cell_w + GAP_COL)
            y0  = grid_top + row * (row_h + GAP_ROW)
            img = Image.open(f'{final_dir}/{fname}')
            # zoom=1.02: vert=1.0 with 2% zoom crops past the "2026" text sliver
            # at the top of each monthly page; imperceptible at thumbnail size
            page.paste(cover_fit(img, cell_w, row_h, vert=1.0, zoom=1.02), (x0, y0))
            gold = hex_rgb(color_hex)
            draw.rectangle([x0, y0, x0+cell_w-1, y0+row_h-1], outline=gold, width=max(1,S))
            # NOTE: do NOT add month name overlay here — thumbnails already have it baked in

        # "YEAR" label at top-left (drawn AFTER thumbnails so it's not covered)
        # Wire-O hole is center-top; top-left corner is safe
        lbl_y_pos = (SAFE - lbl_h) // 2   # vertically center in top margin
        draw.text((SAFE, lbl_y_pos), str(year), font=f_lbl, fill=strip_gold)

        # --- 2 rows × 6 months mini-calendar, bottom-up ---
        cy_bottom = PAGE_H - SAFE

        # Credits
        cb = draw.textbbox((0,0), credits_text, font=f_credits)
        cy = cy_bottom - (cb[3] - cb[1])
        draw.text(((PAGE_W-(cb[2]-cb[0]))//2, cy),
                  credits_text, font=f_credits,
                  fill=tuple(int(c*0.45) for c in strip_gold))

        # Mini-month block top
        mini_block_top = cy - CREDITS_GAP - two_rows_h
        col_w7         = mini_w // 7
        ABBR  = ['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE']
        DAY_H = ['L','M','M','J','V','S','D']

        for mi in range(12):
            row_idx = mi // MINI_COLS   # 0 = Jan–Jun, 1 = Jul–Dec
            col_idx = mi % MINI_COLS
            mx0     = SAFE + col_idx * (mini_w + mini_gap_h)
            y_cur   = mini_block_top + row_idx * (mini_grid_h + mini_gap_v)

            mb = draw.textbbox((0,0), ABBR[mi], font=f_name)
            draw.text((mx0 + (mini_w-(mb[2]-mb[0]))//2, y_cur),
                      ABBR[mi], font=f_name, fill=strip_gold)
            y_cur += name_h + 4

            for di, dh in enumerate(DAY_H):
                db = draw.textbbox((0,0), dh, font=f_hdr)
                dx = mx0 + di*col_w7 + (col_w7-(db[2]-db[0]))//2
                draw.text((dx, y_cur), dh, font=f_hdr, fill=strip_dim)
            y_cur += row_h7

            for week in cal_mod.monthcalendar(next_year, mi+1):
                for di, day in enumerate(week):
                    if day:
                        ds = str(day)
                        db = draw.textbbox((0,0), ds, font=f_date)
                        dx = mx0 + di*col_w7 + (col_w7-(db[2]-db[0]))//2
                        draw.text((dx, y_cur), ds, font=f_date,
                                  fill=strip_fade if di >= 5 else strip_gold)  # dim Sat+Sun
            y_cur += row_h7

        # --- Next-year label ---
        lbl_y = mini_block_top - MINI_GAP_V - lbl_h
        lb    = draw.textbbox((0,0), str(next_year), font=f_lbl)
        draw.text(((PAGE_W-(lb[2]-lb[0]))//2, lbl_y), str(next_year),
                  font=f_lbl, fill=strip_gold)

        # --- Separator rule ---
        rule_y = lbl_y - LBL_GAP
        draw.line([(SAFE, rule_y), (PAGE_W-SAFE, rule_y)], fill=strip_dim, width=max(1,S))

        page.save(out_path, dpi=(600, 600))
        print(f'Saved: {out_path}')

---

## Step 9 — PDF Generation

    from PIL import Image

    pages_in_order = [f"{FINAL}/{f}" for f in [
        f"00_COVER_{YEAR}.png",
        f"01_JANVIER_{YEAR}.png",
        # ... all 12 months ...
        f"13_YEAR_OVERVIEW_{YEAR}.png",
    ]]

    images = [Image.open(p).convert('RGB') for p in pages_in_order]
    images[0].save(
        f"{FINAL}/Calendar_{YEAR}.pdf",
        save_all=True, append_images=images[1:],
        resolution=424,   # ← A3 encoding: 4960/424*25.4 = 297mm (A3 width)
        quality=92,       # resolution=600 for A4 encoding instead
    )

**A3 vs A4 PDF encoding** — same pixel data (4960×7016), different page size metadata:
- `resolution=424` → printer reads page as A3 (297×420mm) = 424 DPI effective
- `resolution=600` → printer reads page as A4 (210×297mm) = 600 DPI effective

Memory note: 14 pages at 600 DPI ≈ 800 MB RAM. If memory is tight, convert pages
individually to single-page PDFs and merge with pypdf.
