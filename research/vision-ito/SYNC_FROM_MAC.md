# Local Mac → GitHub sync checklist

This change documents experiments without modifying the current controller on `main`. Before publishing executable V4.10–V4.12 code, verify it against the **current local working tree**.

1. In `~/ewod-ui`, confirm the camera/DropBot UI runs correctly and save a copy of `static/js/ui-controls.js` and relevant `templates` / `static` files.
2. Run `git status`, `git branch -vv`, `git remote -v`; record any uncommitted local changes. Do not overwrite or delete them.
3. Check differences from GitHub `main`, especially the installed V4.10 high-resolution extension, appended V4.11/V4.12 read-only diagnostics, camera/ROI persistence, and any local modified files.
4. Confirm each addon was installed and is syntactically valid; do not imply the Github copy contains features that only exist in a local installation.
5. Review `experiments/vision-dataset/` image counts, CSV metadata, and experimental consent/privacy; stage reviewed files only.
6. Use a new branch and PR for code synchronization. Preserve the original controller and include exact steps to reproduce detection experiments.
7. Never enable automatic actuation from V4.10–V4.12 tentative droplet markers before validation.

### Example inspection commands (no files modified)
```bash
cd ~/ewod-ui
git status
git branch -vv
git remote -v
find experiments/vision-dataset -type f | wc -l
find experiments/vision-dataset -name '*.png' | wc -l
du -sh experiments/vision-dataset
```

### What was not included in this research-documentation update
- Raw frames still on the Mac
- The installed, combined local `static/js/ui-controls.js` (GitHub's older copy is untouched)
- V4.10–V4.12 addon source and installer ZIPs
- Live firmware/hardware validation or a quantified droplet-detection benchmark

When all sources are verified, publish a separate **source-code and dataset PR** rather than silently replacing working hardware-control files.
