# EWOD vision dataset (raw images)

Unannotated raw camera captures, collected for research. No magenta, yellow ROI, red markers or browser UI are embedded in saved PNGs.

## Folder organization
`experiments/vision-dataset/sessions/<session_id>/images/` — unmodified full camera frames.
`experiments/vision-dataset/sessions/<session_id>/metadata/` — one JSON per frame.
`experiments/vision-dataset/sessions/<session_id>/manifest.csv` — capture log.

`initial_placement_channel` is where liquid was deposited, **not** verified current droplet occupancy. To train segmentation, human-review and annotate each real droplet footprint separately.

## Experiment design
Keep training, validation, and test images from **different physical experimental sessions** (different placement/repositioning), not shuffled near-duplicate frames.
Record ITO yes/no, placement identity, volume, physical count, channel, illumination, and failures. Preserve empty-chip and glass-reflection negative examples.

This folder is for perception datasets. For future control learning, collect synchronized video and exact DropBot action logs separately.