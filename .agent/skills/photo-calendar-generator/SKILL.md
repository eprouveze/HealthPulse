---
name: photo-calendar-generator
description: >
  Create a new wall calendar project with AI-generated images. Guides through year, language, layout,
  and theme selection, then scaffolds the calendar folder with config.json and generates the date CSV.
  Use when user says 'make a calendar', 'photo calendar', 'wall calendar', 'print calendar',
  'generate calendar pages', 'calendar from photos', or wants to create personalized monthly
  calendar pages from their photos.
disable-model-invocation: true
---

# /photo-calendar-generator — Create a New Wall Calendar

You are guiding the user through building a print-ready wall calendar using this project's Python+Pillow pipeline.

## Step 1: Gather Requirements

Use `AskUserQuestion` to ask these questions (one at a time or grouped logically):

### 1a. Year

Ask: "What year should the calendar be for?"
- Default: next calendar year
- This determines: `calendar.monthcalendar(YEAR, month)` for date grids

### 1b. Language

Ask: "What language should the calendar use?"
Options: French (default), English, Arabic, Spanish, Other

Use these lookup tables:

**Month names:**

| # | French | English | Spanish | Arabic |
|---|--------|---------|---------|--------|
| 1 | Janvier | January | Enero | يناير |
| 2 | Février | February | Febrero | فبراير |
| 3 | Mars | March | Marzo | مارس |
| 4 | Avril | April | Abril | أبريل |
| 5 | Mai | May | Mayo | ماي |
| 6 | Juin | June | Junio | يونيو |
| 7 | Juillet | July | Julio | يوليوز |
| 8 | Août | August | Agosto | غشت |
| 9 | Septembre | September | Septiembre | شتنبر |
| 10 | Octobre | October | Octubre | أكتوبر |
| 11 | Novembre | November | Noviembre | نونبر |
| 12 | Décembre | December | Diciembre | دجنبر |

**Day headers (Mon-Sun):**

| French | English | Spanish | Arabic |
|--------|---------|---------|--------|
| L M M J V S D | M T W T F S S | L M X J V S D | ن ث ر خ ج س ح |

### 1c. Layout Format

Ask: "Which layout format?"
Options with descriptions:

- **Above** — Calendar grid overlaid on dark upper zone of image. Best for subjects with dark wall/void above them. Script: `scripts/generate_monthly_pages.py`. Prompt template: `prompts/dalle-calendar-above.md`
- **Below** — Calendar grid overlaid on dark lower zone of image. Best for low-angle shots with dark ground. Script: `scripts/generate_monthly_pages_bottom.py`. Prompt template: `prompts/dalle-calendar-below.md`
- **Split** — Image fills top half, white panel with calendar grid fills bottom half. Works with any photo. Script: `scripts/generate_monthly_pages_split.py`. Prompt template: `prompts/dalle-calendar-split.md`

### 1d. Print Size

Ask: "What print size?"
Options: A4 (default), A3

This determines the upscaling strategy:

| Print Size | Target DPI | Min upscaled resolution | Upscale passes |
|-----------|-----------|------------------------|----------------|
| A4 (210x297mm) | 300+ | ~2480x3508 | 1 pass (Topaz ~2.76x from 1024x1536 → 2826x4239 = 362 DPI) |
| A3 (297x420mm) | 300+ | ~3508x4961 | 2 passes (Topaz 2.76x twice: 1024→2826→5652x8478 = 483 DPI) |

Store the choice in config.json as `"print_size": "A3"` or `"A4"`.

### 1e. Bleed

Ask: "Do you want bleed for professional printing? (default: yes, 6mm)"

- **Yes (default)** — Standard 6mm bleed. Photo extends 6mm past trim on all sides.
  - `bleed_mm`: 6
  - BLEED pixels = round(6 * 600 / 25.4) = 142px
  - Canvas: TRIM + 2×BLEED = 5244×7300
  - PDF DPI: 431 (so larger canvas still encodes as A4)
- **No** — No bleed. Canvas = trim = 4960×7016.
  - `bleed_mm`: 0
  - PDF DPI: 600 (A4) or 424 (A3)
- **Custom** — Ask for bleed in mm. Compute: `round(mm * 600 / 25.4)` pixels.

### 1f. Theme

Ask: "What is the theme for this calendar?"

Gather:
1. 12 subjects (one per month) with location/description
2. Cover details: title lines, subtitle (cover image chosen later — see Step 5)
3. Credits text for the year overview page

**IMPORTANT — Do NOT set accent colors yet.** Colors must be determined AFTER images are generated (Step 5), because they should complement the actual image content. Set `"color": "TODO"` and `"color_split": "TODO"` as placeholders in config.json.

### 1g. Reference Images

Ask: "Do you already have reference images for the 12 months?"

- **Yes** — Ask the user to place them in `calendars/<name>/images-generated/Amal/` (or another subfolder). The script will use `images.edit` to adapt each reference to the calendar layout while preserving its original colors, lighting, and atmosphere.
- **No** — The script will use `images.generate` with detailed per-month prompts to create images from scratch. You'll need to add per-month prompt data to the script (subject descriptions, season notes).

When reference images exist, the generation script adapts the layout rather than recreating from scratch. This preserves the intrinsic colors and mood of the originals — which is critical for color diversity across the 12 months.

### 1h. Calendar Name

Derive a folder name from the theme, year, and language. Format: `<theme>-<year>-<lang>`
Examples: `morocco-doors-2026-fr`, `japanese-gardens-2027-en`, `paris-cafes-2026-fr`

## Step 2: Scaffold the Calendar Folder

Create the calendar directory structure:

```
calendars/<calendar-name>/
├── config.json
├── data/
│   └── calendar-<YEAR>-monday.csv
├── images-generated/    (empty, or with Amal/ subfolder for references)
├── images-upscaled/     (empty, Topaz output goes here)
└── final/               (empty, scripts output here)
```

### 2a. Generate config.json

Create `calendars/<calendar-name>/config.json` with this structure:

```json
{
  "year": <YEAR>,
  "language": "<lang>",
  "layout": "<above|below|split>",
  "day_headers": ["<Mon>", "<Tue>", "<Wed>", "<Thu>", "<Fri>", "<Sat>", "<Sun>"],
  "months": [
    {
      "name": "<MONTH_NAME_UPPER>",
      "city": "<location>",
      "subject": "<subject>",
      "color": "TODO",
      "color_split": "TODO",
      "overlay_alpha": 160,
      "image": "<NN_Month_Location.png>"
    }
  ],
  "cover": {
    "image": "TODO",
    "color": "TODO",
    "city": "TODO",
    "subject": "TODO",
    "title_lines": ["<LINE 1>", "<LINE 2>"],
    "subtitle": "<subtitle text>"
  },
  "year_overview": {
    "credits": "<credits text>"
  },
  "bleed_mm": <BLEED_MM>,
  "pdf": {
    "filename": "<Calendar_Name_YEAR.pdf>",
    "resolution": <431 if bleed_mm > 0 else 600 for A4 / 424 for A3>
  }
}
```

Note: `color`, `color_split`, cover image, and cover details are set to `"TODO"` — they will be finalized in Step 5 after reviewing the generated images.

### 2b. Generate Calendar Data (CSV)

Generate the CSV programmatically. Never compute dates manually.

```python
import calendar
import csv

YEAR = <YEAR>
MONTHS = [
    ("<month1_name>", "<city1>", "<subject1>"),
    # ... 12 entries
]

with open("calendars/<calendar-name>/data/calendar-<YEAR>-monday.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    header = ["Mois", "Ville", "Porte"] + [f"D{i}" for i in range(1, 43)]
    writer.writerow(header)
    for month_idx, (mois, ville, porte) in enumerate(MONTHS, start=1):
        weeks = calendar.monthcalendar(YEAR, month_idx)
        cells = []
        for week in weeks:
            for day in week:
                cells.append("" if day == 0 else str(day))
        while len(cells) < 42:
            cells.append("")
        writer.writerow([mois, ville, porte] + cells)
```

## Step 3: Generate Images

Run the image generation script:

```bash
python3 scripts/generate_images.py calendars/<calendar-name>
```

This script automatically:
- Detects reference images in `images-generated/Amal/` (matched by `NN_*.png` pattern)
- **With references:** Uses `images.edit` to adapt layout while preserving original colors/mood
- **Without references:** Uses `images.generate` with detailed per-month prompts
- Fires all requests in parallel, retries on rate limits, skips existing files

### Re-running after failures

The script is idempotent — it skips already-generated images. If some fail (rate limits, billing limits), just re-run the same command to catch the remaining ones.

## Step 4: HITL — Review Generated Images

**STOP HERE and wait for user approval before proceeding.**

Show the user the generated images and ask for review:
1. Display all 12 images for the user to inspect
2. Ask: "Are you happy with these images, or should any be regenerated?"
3. If the user wants changes: delete the specific image files and re-run the generation script
4. Iterate until the user approves all 12 images

Only proceed to Step 5 after explicit user approval of the images.

## Step 5: Finalize Colors and Cover

**Now that images exist**, determine accent colors and cover details:

### 5a. Accent Colors

View each image and select accent colors that:
- **Echo the distinctive element** of each image (not uniform across all 12)
- **Provide visual variety** across the calendar year
- **Are readable** on the target background:
  - Above/Below layouts: pastel/light colors (text on dark overlay)
  - Split layout: rich/dark colors (text on white background, WCAG AA contrast)

| Layout | Background | Color style | Example |
|--------|-----------|-------------|---------|
| Above | Dark overlay on photo | Pastel/light — readable on dark | `#A8C8D0`, `#E8A030` |
| Below | Dark overlay on photo | Pastel/light — readable on dark | `#A8C8D0`, `#E8A030` |
| Split | White panel | Rich/dark — WCAG AA on white | `#2B6E78`, `#A86208` |

Update each month's `color` and `color_split` in config.json.

### 5b. Cover Image

Ask the user which of the 12 images to reuse for the cover, and finalize cover city/subject/color in config.json.

## Step 6: Upscale Images

Use Topaz Photo AI CLI. The number of passes depends on the print size chosen in Step 1d.

**IMPORTANT:** Use absolute paths — the Topaz CLI does not handle relative paths.

### A4 (single pass)

One Topaz pass: 1024x1536 → ~2826x4239 (~2.76x). Gives 362 DPI on A4.

```bash
"/Applications/Topaz Photo AI.app/Contents/Resources/bin/tpai" --cli \
  --output <absolute-path>/images-upscaled/ \
  --format png --overwrite --upscale \
  <absolute-path>/images-generated/[0-9][0-9]_*.png
```

### A3 (double pass)

Topaz caps at ~2.76x per pass regardless of the `factor` setting. For A3 at 300+ DPI, run two passes:

**Pass 1:** 1024x1536 → ~2826x4239
```bash
"/Applications/Topaz Photo AI.app/Contents/Resources/bin/tpai" --cli \
  --output <absolute-path>/images-upscaled/ \
  --format png --overwrite --upscale \
  <absolute-path>/images-generated/[0-9][0-9]_*.png
```

**Pass 2:** ~2826x4239 → ~5652x8478 (483 DPI on A3)
```bash
mkdir -p <absolute-path>/images-upscaled-2x/
"/Applications/Topaz Photo AI.app/Contents/Resources/bin/tpai" --cli \
  --output <absolute-path>/images-upscaled-2x/ \
  --format png --overwrite --upscale \
  <absolute-path>/images-upscaled/*.png
```

Then swap:
```bash
rm <absolute-path>/images-upscaled/*.png
mv <absolute-path>/images-upscaled-2x/*.png <absolute-path>/images-upscaled/
rmdir <absolute-path>/images-upscaled-2x/
```

## Step 7: Compose Calendar Pages

Run the appropriate script for a single month first to verify layout:

```bash
python3 scripts/generate_monthly_pages_bottom.py calendars/<calendar-name>
# Or generate_monthly_pages.py (above) / generate_monthly_pages_split.py (split)
```

Show the user one output image and ask for approval before the full run.

## Step 8: Full Run

On approval, generate all pages:

```bash
python3 scripts/generate_cover.py calendars/<calendar-name>
python3 scripts/generate_monthly_pages*.py calendars/<calendar-name>
python3 scripts/generate_year_overview.py calendars/<calendar-name>
python3 scripts/generate_pdf.py calendars/<calendar-name>
```

Output lands in `calendars/<calendar-name>/final/`.

## Step 9: Print Shop (Accea)

Ask: "Are you printing at Accea?"

If yes, generate Japanese print shop instructions based on this template:

```
アクセア 印刷依頼 — <Calendar Title>

**仕様：**
- **サイズ：** A4仕上がり（塗り足し<BLEED_MM>mm込みのPDFデータ）
- **用紙：** マットコート 135K
- **印刷：** 片面カラー
- **製本：** リング製本（黒リング）、上部中央穴あき
- **印刷方法：** フチなし印刷
- **ページ数：** 14ページ（表紙1枚 + 月別12枚 + 年間カレンダー1枚）
- **部数：** <ask user>

**データについて：**
- PDF解像度：<PDF_DPI> DPI
- 仕上がりサイズ A4（210×297mm）に対して、上下左右<BLEED_MM>mmの塗り足しを含んだデータです
- トンボはありませんが、塗り足し<BLEED_MM>mmで作成しております

**備考：**
- 吊り下げフック不要（リング製本には対応なし）
```

Adjust size (A4/A3), bleed, and DPI from config.json. If `bleed_mm` is 0, omit the bleed notes and change to `データサイズはA4原寸です`.

## Key Constants (all scripts)

- `TRIM_W, TRIM_H = 4960, 7016` (A3 at 600 DPI)
- `BLEED_MM` from `config.json` → `BLEED = round(BLEED_MM * 600 / 25.4)` (142px for 6mm)
- `PAGE_W, PAGE_H = TRIM_W + 2*BLEED, TRIM_H + 2*BLEED` (5244×7300 with 6mm bleed)
- `BINDING_Y = BLEED + int(TRIM_H * 0.057)` (23.9mm Wire-O clearance, offset by bleed)
- `DARK_FRAC = 0.41` (above/below layouts)
- `IMAGE_FRAC = 0.50` (split layout)
- Font: Cormorant Garamond variable TTF (`~/Library/Fonts/CormorantGaramond*.ttf`)
- PDF DPI: 431 with bleed (encodes bleed canvas as A4), 600 without bleed for A4, 424 for A3

## Pipeline Summary

```
Step 1-2: Gather requirements → Scaffold folder + config.json + CSV
Step 3:   generate_images.py → images-generated/
Step 4:   *** HITL: User reviews images ***
Step 5:   Finalize accent colors + cover from actual images → update config.json
Step 6:   Topaz Photo AI CLI → images-upscaled/
Step 7-8: generate_cover.py + generate_monthly_pages*.py + generate_year_overview.py + generate_pdf.py → final/
Step 9:   Print shop instructions (Accea) if applicable
```
