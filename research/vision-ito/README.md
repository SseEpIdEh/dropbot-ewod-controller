# EWOD vision robustness: transparent droplets under repositioned ITO

**Research record, experimental only.** This directory documents read-only vision experiments developed alongside the PCB-EWOD controller. Nothing here is validated for autonomous electrode actuation.

## Research question
How can camera feedback distinguish a true transparent droplet footprint from ITO-glass boundaries, electrode edges, shadows and illumination changes when the counter-electrode glass is lifted and replaced between experimental preparations?

The working setup uses a Logitech C920 webcam with an actual 1920×1080/30 fps stream, a PCB EWOD layout with six large reservoirs, transport electrodes and bottom rectangular electrode/channel 33, DropBot channel mapping from an SVG schematic, and saved 8-point magenta camera-to-electrode alignment.

## Experimental progression
| Version | Purpose | Known limitation |
| --- | --- | --- |
| V4.7 | 320-pixel-width classic frame differencing and tentative channel mapping | May reject small transparent droplets; detects ITO/glass edges |
| V4.8 | Empty/live/difference/candidate-mask diagnostics | Diagnostic only; mask remains heuristic |
| V4.9 | Experimental droplet footprint reconstruction/stability | Produced duplicate false candidates around one droplet |
| V4.10 | 1920×1080 processing, read-only diagnostics and independent empty reference | Higher detail also amplifies reflection artifacts |
| V4.11 | Electrode-aware search with up to four separate empty-ITO references | Unseen ITO replacements still produce false candidates |
| V4.12 | Scene-change and edge-dominated-region filters, uncertainty warning | Not validated against real droplets or autonomous control |

## Key observations (October 2026)
- When empty ITO glass was left stationary, a 30-second preview produced no visible droplet candidates in one run.
- On the empty chip, lifting/replacing ITO caused repeated false candidates around channel 89 and electrode/glass boundaries, even though no physical droplets were present.
- In one V4.10 trial with stable empty reference and restricted ROI, the interface reported seven changed pixels and zero tentative candidates.
- V4.11 held-out empty-glass trial: three known empty references, **1,724** changed pixels, **14** tentative regions and **9** stable false candidates after a new placement.
- Multi-reference exact matching can suppress changes at known empty placements, but does not demonstrate generalization. Persistent reflections can survive temporal hysteresis.
- V4.10 diagnostics showed indicative analysis costs of ~40–60 ms/frame; V4.11 at full resolution and multiple references showed ~54–113 ms/frame in displayed trials. These are per-analysis timings, not measured closed-loop frequency/latency.

## Data integrity
- A captured **empty ITO reference** means glass is installed, chip is truly empty, camera/lighting/zoom unchanged.
- **Never capture an empty reference while any droplet remains.**
- Each time the ITO plate is physically repositioned, assign a new placement ID (P1/P2/...), whether or not images are taken.
- Raw training frames must NOT include ROI, magenta polygons or colored GUI markers.
- An electrode's initial placement is not necessarily its final occupancy after spreading.
- Report true droplet counts/locations independently of algorithm predictions. Distinguish unknown, unverified, falsely detected and correctly identified.
- Separate independent sessions/ITO placements for training and evaluation to prevent leakage.

## Evaluation priorities
1. Empty stationary ITO versus unseen repositioned ITO: false-positive candidates per 30-second trial.
2. One, two and three physically verified droplets at known electrode positions and measured volumes: per-droplet recall, duplicate markers and channel assignment.
3. Per-session held-out performance across changes in lighting, ITO position, droplet size and fixture pressure.
4. Runtime measured separately from camera frame rate.
5. Compare V4.10/V4.11/V4.12 with U-Net or YOLO-seg trained on separately annotated raw images; compare with a simple rule-based closed-loop baseline before adding a learned policy.

## Implementation status
The current GitHub `main` branch is **not guaranteed to match the researcher's latest local macOS controller**. The V4.10–V4.12 add-ons were supplied as separate experimental ZIPs and tested locally. This branch documents research and reproducibility; it does not attempt to overwrite `static/js/ui-controls.js` with an unverified older copy.

See [V4.11 notes](versions/V4.11_README.md), [V4.12 notes](versions/V4.12_README.md), [dataset manifest](dataset/README.md), and [local sync checklist](SYNC_FROM_MAC.md).
