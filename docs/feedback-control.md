# EWOD Feedback Control Development

## Current hardware-control stack

The browser interface can:

- connect and disconnect DropBot;
- actuate EWOD electrodes manually in Realtime Mode;
- run timed protocols;
- start the live camera;
- record video;
- digitally zoom and pan the camera;
- safely turn off and disable all channels on disconnect.

## Vision milestone 1

The first vision layer uses background subtraction.

Workflow:

1. Start the live camera.
2. Frame the EWOD chip.
3. Make sure no droplet is present.
4. Click **Capture Empty Chip**.
5. Place the droplet.
6. Click **Vision ON**.
7. The browser compares each camera frame against the stored empty-chip frame.
8. Changed pixels are grouped into connected components.
9. The largest sufficiently large component is treated as the current droplet candidate.
10. The interface reports:
   - detected / not detected;
   - X position;
   - Y position;
   - blob area.
11. A bounding box and centroid marker are drawn over the video.

## Important limitation

This is an initial detector, not yet the closed-loop controller.

Camera motion, lighting changes, reflections, hands entering the frame, or large chip changes may be detected as the largest moving region.

The camera and EWOD chip should remain stationary after the background frame is captured.

## Next milestone

Map the detected droplet centroid to EWOD electrode geometry:

camera coordinates
→ chip coordinates
→ electrode ID
→ DropBot channel.

Then implement the first rule-based feedback loop:

1. actuate target electrode;
2. observe camera;
3. determine whether the droplet reached the target;
4. if yes, advance;
5. if no, retry or recover;
6. record timing, retries, position error, and success/failure.

## Proposed experiment metrics

- target electrode;
- detected electrode;
- droplet centroid;
- position error;
- actuation time;
- arrival latency;
- number of retries;
- failure / success;
- voltage;
- frequency;
- camera frame timestamp.
