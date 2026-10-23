# Vision V4.7 — Multi-Droplet Detection Experiments

This folder stores the **camera-based, read-only droplet detection experiments** for the PCB-EWOD / DropBot controller.

> Research status: **Preliminary / unverified detection candidates.**
> A channel-number match to the SVG schematic checks the mapping but does not, by itself, establish droplet-detection accuracy.

## Experiment folders

| Experiment | Status | Main record | Video |
|---|---|---|---|
| **01 — Without ITO glass** | Completed (qualitative observation) | [Procedure, observations and results](01_without_ITO/README.md) | [Watch original annotated recording](01_without_ITO/video/multidroplet_without_ITO_v4.7.webm) |
| **02 — With ITO glass** | Planned; no results entered | [Comparison test plan](02_with_ITO_planned/README.md) | Not recorded yet |

**To watch the video on GitHub:** select the video link above. If GitHub doesn't play the `.webm` directly, select **View raw** or **Download raw file** and play it locally.

## Why keep separate folders?

ITO glass changes the optical conditions (reflections, contrast, and apparent droplet boundaries). Combining the two experiments without identifying the glass condition would make results difficult to interpret.

## What is in Experiment 01?

- `README.md`: experiment objective, setup, procedure, actual observations, limitations
- `data/observation_log.csv`: timestamped visual observations and user-reported findings
- `data/experiment_metadata.json`: condition, known setup, and unknown measurements
- `video/`: the **original, unchanged annotated video** and measured file metadata
- `figures/`: representative still frames extracted from the video (not enhanced or relabeled)
- `REPRODUCIBILITY.md`: steps to reproduce and details to record next time

**Provenance:** User-supplied video + observations reported during the experiment. Entries do not claim quantitative accuracy, ground-truth droplet masks, confirmed volumes, or successful closed-loop actuation.

## GitHub milestone

Recommended branch: `vision-v47-demo-2026-10-23`. Preserve the browser source code in the same repository and link this folder from the top-level README.

A V4.7 label in the UI is not a Git commit hash. Record the actual code commit in `01_without_ITO/data/experiment_metadata.json` after the milestone is pushed.
