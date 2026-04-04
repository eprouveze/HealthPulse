---
name: mvt-video-generator
description: Generate marketing videos for MyWritingTwin. Triggers on requests to create explainer videos, social media clips, or promotional content. Uses ElevenLabs for voice and Remotion for rendering. Trigger phrases — "create a video", "render video clips", "generate avatar video". Do NOT use for image generation, audio-only tasks, or non-video content.
allowed-tools: Bash, Read, Write, Glob, Grep, Task, WebFetch
metadata:
  version: "1.0.0"
  author: emmanuel
---

# MyWritingTwin Video Generator

Generate and manage AI avatar videos and animated scenes for MyWritingTwin marketing content.

## When to Use This Skill

Activate when:
- Generating HeyGen avatar video clips
- Re-rendering Remotion animated scenes
- Assembling video timelines in DaVinci Resolve
- Generating TTS audio with ElevenLabs
- Any video production task for the YouTube pipeline

## Video Pipeline Overview

The YouTube video pipeline has 3 systems:
1. **Remotion** — React-rendered animated scenes (data viz, before/after, product demo, etc.)
2. **HeyGen** — AI avatar clips with lip-synced narration (talking photo avatar)
3. **DaVinci Resolve** — Final compositing with Magic Mask background replacement

## HeyGen Avatar Video Generation

### Configuration

```
Avatar ID:   stored in .env.local as HEYGEN_AVATAR_ID
Voice:       River (ElevenLabs) — pre-configured as default on the avatar in HeyGen
API Key:     stored in .env.local as HEYGEN_API_KEY
```

### API Endpoint

```
POST https://api.heygen.com/v2/video/generate
Headers:
  x-api-key: <HEYGEN_API_KEY>
  Content-Type: application/json
```

### Request Body Template

```json
{
  "video_inputs": [{
    "character": {
      "type": "talking_photo",
      "talking_photo_id": "<HEYGEN_AVATAR_ID>",
      "talking_photo_style": "square",
      "talking_style": "stable",
      "expression": "default"
    },
    "voice": {
      "type": "text",
      "voice_id": "b214356f54eb4b46a4d8c861a6960866",
      "input_text": "<NARRATION TEXT>",
      "speed": 1.0
    },
    "background": {
      "type": "color",
      "value": "#0A0F1E"
    }
  }],
  "dimension": {"width": 1920, "height": 1080},
  "title": "<SCENE NAME>"
}
```

### Important Notes on Narration Text

- The API JSON does not support apostrophes in strings well via curl. Replace contractions:
  - "That's" → "That is" or use escaped form
  - "doesn't" → "does not"
  - "Here's" → "Here is"
  - "link's" → "link is"
- Em dashes (—) work fine in the text
- The voice (River) handles these naturally and re-introduces contractions in speech

### Generating Videos

**Step 1: Submit video generation requests**

Use curl to POST to the API for each scene. The response returns a `video_id`:
```json
{"error": null, "data": {"video_id": "abc123..."}}
```

**Step 2: Poll for completion and download**

Run the polling script:
```bash
bash video-production/scripts/heygen-poll-and-download.sh
```

This reads video IDs from `video-production/youtube-v1/renders/heygen-video-ids.json`, polls every 10s, and downloads completed videos to `video-production/youtube-v1/renders/`.

**Step 3: Manual — Check video status**

```bash
curl -s "https://api.heygen.com/v1/video_status.get?video_id=VIDEO_ID" \
  -H "x-api-key: $HEYGEN_API_KEY" | python3 -m json.tool
```

Status values: `pending` → `processing` → `completed` or `failed`

### Video ID Tracking

Save all generated video IDs to:
```
video-production/youtube-v1/renders/heygen-video-ids.json
```

Format:
```json
{
  "generated_at": "YYYY-MM-DD",
  "avatar_id": "<avatar_id>",
  "voice_id": "<voice_id>",
  "voice_name": "River",
  "videos": {
    "scene-02-accusation": "<video_id>",
    "scene-04-gap": "<video_id>",
    ...
  }
}
```

### Output Files

HeyGen clips are saved to:
```
video-production/youtube-v1/renders/scene-02-accusation.mp4
video-production/youtube-v1/renders/scene-04-gap.mp4
video-production/youtube-v1/renders/scene-05-solution-intro.mp4
video-production/youtube-v1/renders/scene-07-before-after-setup.mp4
video-production/youtube-v1/renders/scene-10-cta-close.mp4
```

## YouTube V1 Scene Map

| Scene | File | Type | Duration | Narration |
|-------|------|------|----------|-----------|
| 01 | scene-01-hook.mov | Remotion | 0-5s | "Read this out loud..." |
| 02 | scene-02-accusation.mp4 | **HeyGen** | 5-10s | "That's not you..." |
| 03 | scene-03-dataviz.mov | Remotion | 10-17s | Writing fingerprint |
| 04 | scene-04-gap.mp4 | **HeyGen** | 17-22s | "ChatGPT doesn't know..." |
| 05 | scene-05-solution-intro.mp4 | **HeyGen** | 22-27s | "My Writing Twin fixes this..." |
| 06 | scene-06-productdemo.mov | Remotion | 27-37s | Product demo |
| 07 | scene-07-before-after-setup.mp4 | **HeyGen** | 37-41s | "Here's what changes..." |
| 08 | scene-08-beforeafter.mov | Remotion | 41-55s | Before/after comparison |
| 09 | scene-09-quickstats.mov | Remotion | 55-61s | Quick stats |
| 10 | scene-10-cta-close.mp4 | **HeyGen** | 61-67s | "Stop sounding like everyone else's AI..." |
| 11 | scene-11-endscreen.mov | Remotion | 67-87s | End screen |

Full narration text and scene definitions: `video-production/video-scripts/youtube-v1.json`

## ElevenLabs TTS Audio

For Remotion scenes that need narration audio (scenes 1, 3, 6, 8, 9, 11):

```bash
# Generate TTS with ElevenLabs
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/VOICE_ID" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "...", "model_id": "eleven_multilingual_v2"}' \
  --output video-production/youtube-v1/renders/audio-filename.mp3
```

## DaVinci Resolve Assembly

After all clips are ready:

```bash
# Create compositing timeline (V1/V2 + audio tracks)
python3 video-production/scripts/resolve-composite-youtube-v1.py

# Add V3 track if needed
python3 video-production/scripts/resolve-add-v3-track.py
```

Then manually:
1. Arrange clips across V1 (solid bg + Remotion), V2 (overlays), V3 (HeyGen)
2. Apply Magic Mask (Color page → person silhouette icon) to each HeyGen clip on V3
3. Add transitions, adjust audio levels, color grade, export

## Lex Avatar Management

The Lex avatar image prompts are documented in:
```
docs/Marketing Strategy/Lex Image Generation Prompts.md
```

To update the avatar:
1. Generate new image with DALL-E or Gemini
2. Create Photo Avatar in HeyGen dashboard (upload multiple consistent poses)
3. Update `HEYGEN_AVATAR_ID` in `.env.local`
4. Update `HEYGEN_AVATAR_ID_OLD` with the previous ID for reference
5. Regenerate all HeyGen clips with the new avatar

## Troubleshooting

**HeyGen video stuck in processing:**
- Check status endpoint: `GET /v1/video_status.get?video_id=<id>`
- AV4 renders take 10-15 min; legacy takes 2-5 min
- Re-run the poll script (`heygen-poll-and-download.py`) if it times out
- If stuck beyond 20 min, the render likely failed silently — resubmit

**ElevenLabs TTS generation fails:**
- Verify `ELEVENLABS_API_KEY` is set in `.env.local`
- Check voice ID is valid — list voices: `GET https://api.elevenlabs.io/v1/voices`
- Ensure text input is not empty and under the character limit
- Check API quota at https://elevenlabs.io/subscription

**Remotion render errors:**
- Run `npm run build` first to ensure compositions compile
- Check composition registry in `video-production/remotion/src/Root.tsx`
- Verify all referenced assets exist in `public/` or `video-production/`
- For memory errors, reduce `--concurrency` flag or render fewer frames

**DaVinci Resolve script fails:**
- Verify Python dependencies: `pip3 install DaVinciResolveScript` (or check Resolve's bundled Python)
- Ensure DaVinci Resolve is running before executing scripts
- Check that the Resolve scripting API is enabled (Preferences → General → External scripting)
- Media paths in scripts must be absolute paths
