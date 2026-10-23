# Experiment 02 — Multi-Droplet Detection **With ITO Glass** (PLANNED)

**Status:** Not yet performed. No results should be reported as measured.

## Purpose

Test whether the same PCB-EWOD Vision V4.7 pipeline identifies and labels real droplets when the **ITO-glass top plate is installed**, and compare with [Experiment 01 (without glass)](../01_without_ITO/README.md).

## Step-by-step proposed procedure

1. Preserve Experiment 01 and its recorded video as an immutable baseline.
2. Stop camera preview and install the ITO glass following your established laboratory handling procedures.
3. Keep the camera mount, exposure and lighting stable if possible. If the camera view changes, update/revalidate the ROI and eight-point calibration before using the detector.
4. With no droplets present, capture a **new empty-chip reference under ITO glass**. Do not reuse the without-ITO background.
5. Start read-only Preview Detection. Record **empty-chip false marker count** over a fixed observation window.
6. Add one known-volume droplet to one known channel. Write down actual placement and expected channel, then record detected marker and channel labels.
7. Repeat on different electrode regions and a droplet spanning neighboring electrodes; test **channel 33** separately.
8. Test multiple droplets placed in known positions. Make a per-placement log, not only a video.
9. Record an annotated video showing the candidate red markers and associated channel numbers.
10. Recheck the empty chip at the end under the same conditions to evaluate spurious persistent markers.

## Comparison metrics

- Physical droplet count vs red marker count, measured at defined time points
- Primary DropBot channel identification accuracy (only where the true occupied channel is known)
- Secondary channel overlaps where the droplet spans electrodes
- False positives on empty-chip recordings
- False negatives, especially channel 33
- Analysis latency and marker stability across frames
- Effect of altered glass reflections/contrast

## Data entry

Use [test_log_template.csv](test_log_template.csv) for each run. Do **not** copy Experiment 01's estimated results into this file as if they were With-ITO measurements.

**Reminder:** This is a vision-validation test, **not an automatic closed-loop actuation demonstration**.
