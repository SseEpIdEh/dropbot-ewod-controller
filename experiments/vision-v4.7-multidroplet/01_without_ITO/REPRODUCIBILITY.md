# Reproducibility checklist

Use this to improve the quality of future experiments; **do not retroactively fill unknown measurements** for Experiment 01.

- [ ] Save Git commit hash used for the experiment.
- [ ] Record camera hardware model, lens, hardware capture resolution, and delivered recording resolution.
- [ ] Record actual zoom, pan, exposure, gain, focus, and white balance where available.
- [ ] Record illumination type, lamp placement, and whether it changed between tests.
- [ ] Record ITO-glass status and the physical camera/chip geometry.
- [ ] Save the empty reference image and identify whether the system reloads it after refresh.
- [ ] Save eight-point calibration data, ROI coordinates, and edge-check result.
- [ ] Record droplet liquid, volume (µL), placement channel, number of droplets, and placement timestamps.
- [ ] Annotate ground truth separately from automated detections.
- [ ] Quantify true positives / false positives / false negatives, dominant channel accuracy, and marker stability.
- [ ] Log particular failure cases such as large electrode channel 33.
- [ ] Preserve unmodified original annotated video and its SHA-256.

**Safety / method:** Keep detection tests read-only until calibration and channel detection are validated; don't conflate optical recognition with successful electrically actuated movement.
