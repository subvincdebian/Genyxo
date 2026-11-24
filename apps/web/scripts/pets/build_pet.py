"""Build a Genyxo pet atlas from generated animation sheets.

Input:  pets-src/<pet>/<state>.png  - 4x2 grids of 8 poses on a flat chroma key.
Output: public/pets/<pet>.webp      - 8 columns x len(STATES) rows of CELL-sized
                                      transparent frames (one row per state).
        public/pets/<pet>-preview.png - contact sheet on a dark background for QA.

Usage: python scripts/pets/build_pet.py <pet> [<pet> ...]   (run from apps/web)
Requires Pillow and numpy.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
STATES = ["idle", "run", "wave", "jump", "failed", "listen", "think", "happy", "sleep", "talk"]
COLS, GRID_ROWS = 4, 2
CELL_W, CELL_H = 192, 216
PAD_X, PAD_BOTTOM, PAD_TOP = 8, 9, 6
# Until a sheet exists, a missing state borrows the closest one so the atlas is
# always complete (the build prints which rows are stand-ins).
FALLBACK = {"think": "listen", "talk": "listen", "happy": "jump", "sleep": "idle",
            "listen": "idle", "wave": "idle", "jump": "idle", "failed": "idle", "run": "idle"}
KEYS = {"magenta": (255, 0, 255), "green": (0, 255, 0)}


def detect_key(rgb: np.ndarray) -> str:
    corner = rgb[:8, :8].reshape(-1, 3).mean(axis=0)
    return "green" if corner[1] > corner[0] else "magenta"


def matte(image: Image.Image) -> Image.Image:
    """Chroma-key the flat background into alpha and remove colour spill."""
    rgb = np.asarray(image.convert("RGB")).astype(np.float32)
    key_name = detect_key(rgb)
    key = np.array(KEYS[key_name], dtype=np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # How strongly a pixel leans towards the key colour.
    lean = (g - np.maximum(r, b)) if key_name == "green" else (np.minimum(r, b) - g)
    alpha = 1.0 - np.clip((lean - 40.0) / 70.0, 0.0, 1.0)
    # Unmix the key from partially transparent edge pixels.
    a = np.clip(alpha, 0.05, 1.0)[..., None]
    clean = np.clip((rgb - (1.0 - a) * key) / a, 0, 255)
    edge = (alpha > 0) & (alpha < 1)
    rgb[edge] = clean[edge]
    # Residual spill on opaque edge pixels.
    if key_name == "green":
        limit = np.maximum(rgb[..., 0], rgb[..., 2])
        rgb[..., 1] = np.where(rgb[..., 1] > limit + 12, limit + 12, rgb[..., 1])
    out = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
    result = Image.fromarray(out, "RGBA")
    # Drop single-pixel specks.
    alpha_channel = result.getchannel("A").filter(ImageFilter.MedianFilter(3))
    result.putalpha(alpha_channel)
    return result


def split_points(profile: np.ndarray, parts: int) -> list[int]:
    """Cut a projection profile into `parts` at the emptiest point near each boundary."""
    size = len(profile)
    cuts = [0]
    for index in range(1, parts):
        center = size * index // parts
        window = size // (parts * 4)
        lo, hi = max(1, center - window), min(size - 1, center + window)
        segment = profile[lo:hi]
        empties = np.where(segment == segment.min())[0]
        cuts.append(lo + int(empties[len(empties) // 2]))
    cuts.append(size)
    return cuts


def frames_of(sheet: Image.Image):
    """Return 8 (crop, bottom_offset) tuples in reading order."""
    alpha = np.asarray(sheet.getchannel("A")) > 40
    row_cuts = split_points(alpha.sum(axis=1), GRID_ROWS)
    frames = []
    for row in range(GRID_ROWS):
        top, bottom = row_cuts[row], row_cuts[row + 1]
        band = alpha[top:bottom]
        col_cuts = split_points(band.sum(axis=0), COLS)
        boxes = []
        for col in range(COLS):
            left, right = col_cuts[col], col_cuts[col + 1]
            cell = band[:, left:right]
            ys, xs = np.where(cell)
            if len(xs) == 0:
                boxes.append(None)
                continue
            boxes.append((left + xs.min(), top + ys.min(), left + xs.max() + 1, top + ys.max() + 1))
        floor = max(box[3] for box in boxes if box)
        for box in boxes:
            frames.append(None if box is None else (sheet.crop(box), floor - box[3]))
    return frames


def build(pet: str):
    source = ROOT / "pets-src" / pet
    atlas = Image.new("RGBA", (CELL_W * 8, CELL_H * len(STATES)), (0, 0, 0, 0))
    per_state = {}
    for state in STATES:
        path = next(
            (source / f"{state}.{ext}" for ext in ("png", "jpg", "jpeg", "webp") if (source / f"{state}.{ext}").exists()),
            None,
        )
        if path is None:
            print(f"  missing {state}")
            continue
        per_state[state] = frames_of(matte(Image.open(path)))
    if "idle" not in per_state:
        raise SystemExit(f"{pet}: idle sheet is required")
    for state in STATES:
        if state not in per_state:
            stand_in = FALLBACK[state] if FALLBACK[state] in per_state else "idle"
            per_state[state] = per_state[stand_in]
            print(f"  {state}: using {stand_in} until its sheet is generated")
    # One scale for the whole pet, taken from the resting pose, so it never
    # changes size between animations; shrink only when a pose would overflow.
    idle = [frame for frame in per_state["idle"] if frame]
    base_scale = min(
        (CELL_H - PAD_TOP - PAD_BOTTOM) * 0.72 / max(crop.height for crop, _ in idle),
        (CELL_W - 2 * PAD_X) * 0.80 / max(crop.width for crop, _ in idle),
    )
    counts = {}
    for row, state in enumerate(STATES):
        frames = per_state.get(state)
        if not frames:
            continue
        present = [frame for frame in frames if frame]
        fit = min(
            (CELL_W - 2 * PAD_X) / max(crop.width for crop, _ in present),
            (CELL_H - PAD_TOP - PAD_BOTTOM) / max(crop.height + lift for crop, lift in present),
        )
        scale = min(base_scale, fit)
        counts[state] = len(present)
        for col, frame in enumerate(frames):
            if frame is None:
                continue
            crop, lift = frame
            size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
            sprite = crop.resize(size, Image.LANCZOS)
            x = col * CELL_W + (CELL_W - size[0]) // 2
            y = row * CELL_H + CELL_H - PAD_BOTTOM - size[1] - round(lift * scale)
            atlas.alpha_composite(sprite, (x, max(row * CELL_H, y)))
    out = ROOT / "public" / "pets"
    out.mkdir(parents=True, exist_ok=True)
    atlas.save(out / f"{pet}.webp", "WEBP", quality=90, alpha_quality=100, method=6)
    preview = Image.new("RGBA", atlas.size, (24, 26, 27, 255))
    preview.alpha_composite(atlas)
    preview.convert("RGB").save(source / "preview.png")
    (out / f"{pet}.json").write_text(
        json.dumps(
            {
                "id": pet,
                "cell": [CELL_W, CELL_H],
                "columns": 8,
                "states": {state: {"row": STATES.index(state), "frames": counts[state]} for state in counts},
            },
            indent=2,
        )
        + "\n"
    )
    print(f"{pet}: {len(counts)} states -> {out / (pet + '.webp')}")


if __name__ == "__main__":
    for name in sys.argv[1:]:
        build(name)
