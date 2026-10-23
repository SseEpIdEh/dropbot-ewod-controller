# Experiment 01 — Multi-Droplet Detection **Without ITO Glass**

**Date:** 2026-10-23 (from video filename and contemporaneous observations)  
**Project:** PCB-EWOD / DropBot, browser camera feedback  
**UI version shown:** Droplet Vision V4.7 — Detection + Flexible Layout  
**Status:** Qualitative demonstration completed; accuracy **not yet quantified**  
**Glass:** **NO ITO GLASS INSTALLED** for this experiment  
**Control mode:** Read-only Preview Detection (No Actuation); DropBot shown disconnected / realtime off.

## 1. Objective

Assess whether the calibrated camera-based preview can (a) display separate candidate droplets during a multi-droplet test, and (b) assign DropBot channel numbers corresponding to the electrode geometry.

**Research question:** In a fixed, empty-background-referenced camera view **without ITO glass**, can the current computer-vision system show plausible distinct droplet candidates with meaningful channel labels?

## 2. Hardware and imaging setup

- PCB-based EWOD chip with reservoirs and smaller transport electrodes; electrode shapes have DropBot channel mapping in the blue browser schematic.
- Overhead camera viewing the working electrode region, with a yellow ROI and magenta SVG geometry overlay.
- Eight-point camera-to-SVG calibration and saved reference (as configured during this session).
- Empty-chip background captured before droplet placement and reused during preview.
- Camera setting menu shown as **High Detail — 1920×1440 / 30 fps** in screenshots, **but the recorded output file is 1920×1080 pixels**. Do not substitute the menu setting for measured recording dimensions.
- The preview threshold shown in screenshots is **30**.
- Droplet volume, liquid composition, ambient temperature, exact illumination intensity, calibration metrics during the video, and ground-truth per-frame masks: **not documented for this recording**.

## 3. Procedure (reconstructed from lab steps described in the conversation)

1. Position and focus the camera. Keep chip, camera, illumination, and zoom unchanged while collecting an experimental sequence.
2. Align the magenta mapped electrode geometry with the physical electrode array, and save calibration/reference.
3. Set and save the yellow working ROI.
4. With the chip empty **and without ITO glass**, capture the empty-chip reference.
5. Start **Preview Detection (No Actuation)**. Confirm the empty region does not have an accepted droplet marker, then add droplets at known locations one at a time.
6. Inspect red candidate markers and channel labels as the number of droplets increases. Compare reported channels against the blue EWOD chip map.
7. Record an annotated video with the on-screen markers and labels.
8. Note any known missed detections, particularly the large gray electrode **channel 33**.

**Caution:** The procedure records what was described, not a timestamped execution audit. Exact droplet volumes and each placement time were not provided.

## 4. Recorded results and user observations

| Item | Observation | Interpretation / limit |
|---|---|---|
| Multiple markers | The annotated recording and screenshots show multiple simultaneous red candidate markers as droplets were added. | Evidence of **multiple candidates**, not a formally measured droplet-detection rate. |
| Channel labels | The user manually compared reported channels to the blue schematic and stated that the channel names matched. | Supports initial channel mapping; does not independently verify all physical droplet locations. |
| Primary channels displayed in later screenshots | **40, 86, 114, 38, 94** | These are detected candidate-channel labels, **not** a claim that five correctly identified physical droplets were independently ground-truthed. |
| Overlapping channel examples | Candidate readouts also reported overlapping channels including **82, 106, 42**. | A candidate may span more than one electrode; channel overlap is an estimated changed-pixel overlap, not droplet physical volume. |
| Known miss | A droplet on the large gray rectangular electrode (**channel 33**) was reported as missed. | Test in isolation in a follow-up experiment; do not silently count this as a success. |
| Control | Preview readout explicitly said **UNVERIFIED PREVIEW (NO ACTUATION)**; DropBot disconnected. | No evidence of automated droplet movement/closed-loop control in this recording. |

### Evidence

- **[Watch the complete original annotated video (~85 sec)](video/multidroplet_without_ITO_v4.7.webm)** (GitHub may require **View raw** / download for WebM)
- [At ~2 seconds](figures/frame_002s.jpg), [~30 seconds](figures/frame_030s.jpg), [~80 seconds](figures/frame_080s.jpg) — selected stills from the exact uploaded recording
- [Time-sampled observation log](data/observation_log.csv)
- [Video metadata & SHA-256](video/video_metadata.json)

## 5. How the V4.7 preview works (implementation summary)

The current browser preview uses a **saved empty-chip reference** and live image differences to propose foreground regions. The calibrated SVG outlines are mapped into camera coordinates; stable candidate changes are associated with overlapping electrode channel numbers. The display places **red markers** and reports a primary channel and meaningful overlaps.

This is **classical image processing / heuristic detection**, not a trained machine-learning model or a validated multi-object detector. “ANALYZING” and red markers do **not** independently prove a region is a droplet. The exact source-code configuration should be preserved at the milestone commit.

## 6. Limitations (report these alongside the video)

- No frame-by-frame ground truth, measured droplet volume, per-channel sensitivity, sensitivity/specificity, or precision/recall.
- Potential false positives from optical artifacts and reflections; number of physical droplets not independently counted in the uploaded video.
- Channel 33 missed in the reported trial.
- Geometry over the large gray electrode has shown width mismatch in earlier camera views; do not assume that explains the missed droplet without testing.
- Results are **without ITO glass**. They cannot be used as evidence of success **with** glass.
- Marker/channel stability and position error not numerically evaluated.

## 7. Immediate next experiment

Run [Experiment 02 — With ITO glass](../02_with_ITO_planned/README.md) using the same chip, lighting, camera settings, and placement plan where possible. Capture a new empty-chip reference after installing glass and verify calibration again. Compare false positives, missed detections, reported primary/secondary channels, and tracking stability.
