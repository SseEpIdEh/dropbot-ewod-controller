# Training image collection and ground truth

**Current repository status:** The locally captured image dataset at `~/ewod-ui/experiments/vision-dataset/` has **not been verified as uploaded** to GitHub. Do not treat this document as evidence that these files are committed. Prior experiment screenshots are not interchangeable with raw training images.

The separate raw image capture utility runs with Flask on port 5002, reads the Logitech C920 camera stream, and saves unannotated full camera frames (no magenta lines, yellow ROI, markers, or browser UI), together with a metadata CSV. The utility does not connect to DropBot.

## Local data location
```text
~/ewod-ui/experiments/vision-dataset/sessions/<session-id>/
```

## Recommended collection matrix
- Empty PCB without ITO; empty PCB with ITO; empty plate after physically repositioning ITO (negative/artifact samples).
- Measured DI-water droplets of 1.0, 1.5, 2.5 µL and other feasible volumes, in multiple reservoir and transport locations.
- One, two and three droplets, including physical spreading across adjacent electrodes.
- Distinct session IDs, ITO-placement IDs, lighting conditions, and known actual placement, not just predicted channels.
- Repeat independently across days/sessions; hold whole sessions out for validation/test.

## Minimum metadata
`session_id, trial_id, ito_glass, ito_placement_id, condition, droplet_count, volumes_ul, initial_placement_channel, liquid, lighting, notes, camera_width_px, camera_height_px, captured_utc, label_status`

Segmentation ground truth should consist of manually reviewed droplet masks or polygons on the raw frames, with zero masks for confirmed-empty frames. Keep initial placement separate from measured footprint and primary/secondary electrode overlap.

## Responsible publication
Review filenames, annotations, and accidentally exposed personal/lab content before public upload. For large PNG/video datasets consider a versioned dataset release or appropriate large-file storage; never commit secrets. Logs from automated DropBot experiments must include timestamped actions, frequency, voltage, duration, channel and outcome to support future control learning.

## Current limitation
The GitHub connector cannot read files residing only on the user's Mac. To publish actual locally captured training images, they must be uploaded or pushed from the Mac, or otherwise made accessible to this conversation.
