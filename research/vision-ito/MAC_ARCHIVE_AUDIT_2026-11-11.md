# November 11, 2026 — Uploaded Mac ZIP inspection and sync report

## Scope
Source: user-provided archive `ewod-ui.zip`. The archive included local Git internals and historical backups; neither is copied into this PR.

## Active source synchronized to research branch
Seven active project files were updated/added from the archived Mac working tree:
- `app.py` (Flask and DropBot backend)
- `static/js/ui-controls.js` (camera and experimental vision logic, including V4.10/V4.11/V4.12)
- `static/js/calibration.js` (camera/electrode calibration; previously untracked)
- `static/js/chip.js` (chip UI)
- `static/chip/ewod-chip.svg` (electrode geometry)
- `static/css/style.css` (user interface styles)
- `templates/index.html` (web interface)

Active JavaScript files passed `node --check`; Python backend passed `python -m py_compile`. **These are static syntax tests, not live hardware/camera/control tests.**

The original Mac archive had uncommitted modifications to six tracked source files and a new untracked `static/js/calibration.js`. The research branch is intentionally based on GitHub `main`, while retaining the historic `vision-v47-no-ITO-demo` branch as a separate source of the earlier demonstration.

## Raw camera training dataset inventory
Local location: `experiments/vision-dataset/sessions/S20261026_A/`.
- Session IDs: **1** (`S20261026_A`)
- Manifest records: **66**
- Raw PNG frames actually present in the ZIP: **64**
- Per-frame JSON files in the ZIP: **66**
- Total raw PNG size: **188,443,344 bytes (~179.7 MiB)**
- Manifest single-droplet records: **44**; empty-condition records: **22**
- Manifest entries marked ITO `yes`: **10**; ITO `no`: **56**
- Known volume strings: `2.5` (29 rows), `1` (15 rows), `1.5` (5 rows); `unknown` (3 rows), blank (14 rows)
- Raw PNG frames are **not segmentation-annotated**; the manifest's `initial_placement_channel` is not independently verified final occupancy.

### Missing image files
The manifest and JSON metadata reference two PNGs that were **not present in the archive**, both part of trial `T02` (ITO = yes, condition = empty):
- `images/20261027T004809_799Z_984f2b.png`
- `images/20261027T004817_948Z_0218ea.png`

Both manifest rows are preserved for auditability; do not silently count them as present images.

### Metadata quality checks
Some rows marked `condition=empty` retain copied notes referring to a previous droplet. Treat conditions as **experimenter-reported, unverified**; visual spot-check is necessary before using them as negative training labels. The `ito_placement_id` field is largely blank, so held-out ITO-placement generalization cannot be certified from this session alone.

## What this GitHub update includes
- Active controller source code, unmodified other than transporting its text to GitHub
- Raw dataset `manifest.csv` and `README.md`
- ITO-robustness research and reproducibility documentation

## Not included
- The **64 PNG frames (~180 MiB)** and 66 per-frame JSON files remain only in the provided archive / user's local data, not on this GitHub branch.
- Hundreds of MB of local `.git` objects, macOS metadata, old backups and test artifacts are omitted.
- No claim of validated autonomous actuation, measured closed-loop latency, model-training performance, or generalization.

## Before merging to main
1. Review the GitHub PR diff for any unintended changes to DropBot commands, voltage limits, camera handling, or saved calibration.
2. Run the Flask app and V4.12 read-only preview against the actual chip/camera on the Mac. Do not enable automatic actuation from unverified detections.
3. Audit all 64 images and correct uncertain/missing image metadata in a versioned, auditable update.
4. Decide whether to publish the ~180-MiB dataset as a separate research dataset/release or using Git LFS (ordinary Git history may not be the right storage).
5. Preserve all local unpublished experiments and record exact train/validation/test session splits after independent annotations.
