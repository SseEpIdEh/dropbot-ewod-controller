
document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // SVG + ROUTES
    // =====================================================

    const svg =
        document.querySelector(".svg-wrapper svg");

    const toggleRoutesButton =
        document.getElementById("toggle-routes");

    let routesVisible = true;

    if (svg && toggleRoutesButton) {

        toggleRoutesButton.addEventListener(
            "click",
            () => {

                routesVisible =
                    !routesVisible;

                const routes =
                    svg.querySelectorAll(
                        'path[id^="line"]'
                    );

                routes.forEach((route) => {

                    route.style.display =
                        routesVisible
                            ? ""
                            : "none";
                
});

                toggleRoutesButton.textContent =
                    routesVisible
                        ? "Hide Routes"
                        : "Show Routes";
            }
        );
    }


    // =====================================================
    // ELECTRODE IDS
    // =====================================================

    const toggleElectrodeIdsButton =
        document.getElementById(
            "toggle-electrode-ids"
        );

    let electrodeIdsVisible = false;


    function showElectrodeIds() {

        if (!svg) {
            return;
        }

        svg.querySelectorAll(
            ".electrode-id-label"
        ).forEach(
            label => label.remove()
        );

        const electrodes =
            svg.querySelectorAll(
                'path[id^="electrode"]'
            );

        electrodes.forEach((path) => {

            const box =
                path.getBBox();

            const text =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "text"
                );

            text.setAttribute(
                "x",
                box.x + box.width / 2
            );

            text.setAttribute(
                "y",
                box.y + box.height / 2
            );

            text.setAttribute(
                "text-anchor",
                "middle"
            );

            text.setAttribute(
                "dominant-baseline",
                "middle"
            );

            text.setAttribute(
                "class",
                "electrode-id-label"
            );

            const channel =
                path.getAttribute(
                    "data-channels"
                );
            text.textContent =
                channel || "?";
            svg.appendChild(text);
        });
    }


    function hideElectrodeIds() {

        if (!svg) {
            return;
        }

        svg.querySelectorAll(
            ".electrode-id-label"
        ).forEach(
            label => label.remove()
        );
    }


    if (toggleElectrodeIdsButton) {

        toggleElectrodeIdsButton.addEventListener(
            "click",
            () => {

                electrodeIdsVisible =
                    !electrodeIdsVisible;

                if (electrodeIdsVisible) {

                    showElectrodeIds();

                    toggleElectrodeIdsButton.textContent =
                        "Hide Electrode IDs";

                } else {

                    hideElectrodeIds();

                    toggleElectrodeIdsButton.textContent =
                        "Show Electrode IDs";
                }
            }
        );
    }


    // =====================================================
    // CAMERA ELEMENTS
    // =====================================================

    const cameraFeed =
        document.getElementById(
            "camera-feed"
        );

    const cameraSelect =
        document.getElementById(
            "camera-select"
        );

    const cameraModeSelect =
        document.getElementById(
            "camera-mode"
        );

    const startCameraButton =
        document.getElementById(
            "start-camera"
        );

    const stopCameraButton =
        document.getElementById(
            "stop-camera"
        );

    const cameraStatus =
        document.getElementById(
            "camera-status"
        );

    const cameraZoom =
        document.getElementById(
            "camera-zoom"
        );

    const cameraZoomValue =
        document.getElementById(
            "camera-zoom-value"
        );

    const startRecordingButton =
        document.getElementById(
            "start-recording"
        );

    const stopRecordingButton =
        document.getElementById(
            "stop-recording"
        );

    let cameraStream = null;
    let mediaRecorder = null;
    let recordedChunks = [];


    // =====================================================
    // CAMERA LIST
    // =====================================================

    async function updateCameraList() {

        if (!navigator.mediaDevices) {
            return;
        }

        const devices =
            await navigator.mediaDevices
                .enumerateDevices();

        const cameras =
            devices.filter(
                device =>
                    device.kind === "videoinput"
            );

        cameraSelect.innerHTML =
            '<option value="">Default Camera</option>';

        cameras.forEach(
            (camera, index) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    camera.deviceId;

                option.textContent =
                    camera.label ||
                    `Camera ${index + 1}`;

                cameraSelect.appendChild(
                    option
                );
            }
        );
    }


    // =====================================================
    // START CAMERA
    // =====================================================

    async function startCamera() {

        try {

            if (cameraStream) {

                cameraStream
                    .getTracks()
                    .forEach(
                        track => track.stop()
                    );
            }

            const selectedCamera =
                cameraSelect.value;

            const cameraMode =
                cameraModeSelect
                    ? cameraModeSelect.value
                    : "balanced";

            let width = 1920;
            let height = 1080;
            let frameRate = 30;

            if (cameraMode === "detail") {

                width = 1920;
                height = 1440;
                frameRate = 30;

            } else if (
                cameraMode === "speed"
            ) {

                width = 1920;
                height = 1080;
                frameRate = 60;
            }

            const videoConstraints = {

                width: {
                    ideal: width
                },

                height: {
                    ideal: height
                },

                frameRate: {
                    ideal: frameRate
                }
            };

            if (selectedCamera) {

                videoConstraints.deviceId = {
                    exact: selectedCamera
                };
            }

            cameraStream =
                await navigator.mediaDevices
                    .getUserMedia({
                        video: videoConstraints,
                        audio: false
                    });

            cameraFeed.srcObject =
                cameraStream;

            const track =
                cameraStream
                    .getVideoTracks()[0];

            const settings =
                track.getSettings();

            cameraStatus.textContent =
                `Connected — ${settings.width}×${settings.height} @ ${Math.round(settings.frameRate)} fps`;

            await updateCameraList();

        } catch (error) {

            console.error(
                "Camera error:",
                error
            );

            cameraStatus.textContent =
                "Camera Error";
        }
    }


    // =====================================================
    // STOP CAMERA
    // =====================================================

    function stopCamera() {

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );

            cameraStream = null;
        }

        if (cameraFeed) {
            cameraFeed.srcObject = null;
        }

        if (cameraStatus) {
            cameraStatus.textContent =
                "Off";
        }
    }


    // =====================================================
    // CAMERA EVENTS
    // =====================================================

    if (
        startCameraButton &&
        stopCameraButton &&
        cameraFeed &&
        cameraSelect
    ) {

        startCameraButton.addEventListener(
            "click",
            startCamera
        );

        stopCameraButton.addEventListener(
            "click",
            stopCamera
        );

        cameraSelect.addEventListener(
            "change",
            () => {

                if (cameraStream) {
                    startCamera();
                }
            }
        );

        if (cameraModeSelect) {

            cameraModeSelect.addEventListener(
                "change",
                () => {

                    if (cameraStream) {
                        startCamera();
                    }
                }
            );
        }

        updateCameraList();
    }


    // =====================================================
    // DIGITAL ZOOM
    // =====================================================

    if (
        cameraZoom &&
        cameraZoomValue &&
        cameraFeed
    ) {

        cameraZoom.addEventListener(
            "input",
            () => {

                const zoom =
                    parseFloat(
                        cameraZoom.value
                    );

                cameraFeed.style.transform =
                    `scale(${zoom})`;

                cameraZoomValue.textContent =
                    `${zoom.toFixed(1)}×`;
            }
        );
    }


    // =====================================================
    // VIDEO RECORDING — calibrated annotations included.
    // The camera's MediaStream contains raw pixels only. Droplet targets, ROI,
    // and calibration are separate canvases on top of the live <video>. Build
    // a composite canvas and record its stream so evidence matches the UI.
    // NEVER use this stream for DropBot actuation or vision analysis.
    // =====================================================
    let recordingCanvas = null;
    let recordingContext = null;
    let recordingStream = null;
    let recordingRaf = null;

    function drawAnnotatedRecordingFrame() {
        if (!recordingContext || !cameraFeed.videoWidth || !cameraFeed.videoHeight) return;
        const ctx = recordingContext;
        const w = recordingCanvas.width;
        const h = recordingCanvas.height;
        ctx.clearRect(0, 0, w, h);

        // Match the camera zoom and pan currently shown in the UI.
        const style = getComputedStyle(cameraFeed);
        const parts = style.transformOrigin.split(/\s+/);
        const clientW = cameraFeed.clientWidth || 1;
        const clientH = cameraFeed.clientHeight || 1;
        const ox = Number.parseFloat(parts[0]) / clientW;
        const oy = Number.parseFloat(parts[1]) / clientH;
        const z = Number(cameraZoom?.value || 1);
        const zoom = Number.isFinite(z) && z > 0 ? z : 1;
        ctx.drawImage(cameraFeed,
            (1-zoom)*(Number.isFinite(ox) ? ox : 0.5)*w,
            (1-zoom)*(Number.isFinite(oy) ? oy : 0.5)*h,
            w*zoom, h*zoom);

        // Capture only *visible* display overlays. In particular, a hidden
        // magenta overlay stays hidden in the recorded video as well.
        const stage = cameraFeed.closest('.vision-stage');
        if (stage) {
            const layerCanvases = [...stage.querySelectorAll('canvas')]
                .filter(c => c.width && c.height)
                .map((canvas, index) => ({
                    canvas, index,
                    z: Number.parseFloat(getComputedStyle(canvas).zIndex) || 0
                }))
                .sort((a,b) => a.z-b.z || a.index-b.index);
            for (const layer of layerCanvases) {
                const element = layer.canvas;
                const cs = getComputedStyle(element);
                if (cs.display === 'none' || cs.visibility === 'hidden' ||
                    Number(cs.opacity) === 0) continue;
                ctx.save();
                ctx.globalAlpha = Number.isFinite(Number(cs.opacity)) ? Number(cs.opacity) : 1;
                ctx.drawImage(element, 0, 0, w, h);
                ctx.restore();
            }
        }
    }

    function stopAnnotatedDrawing() {
        if (recordingRaf !== null) {
            cancelAnimationFrame(recordingRaf);
            recordingRaf = null;
        }
        for (const track of recordingStream?.getTracks() || []) track.stop();
        recordingStream = null;
        recordingContext = null;
        recordingCanvas = null;
    }

    function startRecording() {
        if (!cameraStream || !cameraFeed.videoWidth || !cameraFeed.videoHeight) {
            alert('Start the camera first.');
            return;
        }
        if (!HTMLCanvasElement.prototype.captureStream) {
            alert('Annotated video recording is not supported by this browser.');
            return;
        }
        try {
            recordingCanvas = document.createElement('canvas');
            recordingCanvas.width = cameraFeed.videoWidth;
            recordingCanvas.height = cameraFeed.videoHeight;
            recordingContext = recordingCanvas.getContext('2d', {alpha:false});
            // Render before starting the stream so the first recorded frame
            // already includes the overlays.
            drawAnnotatedRecordingFrame();
            recordingStream = recordingCanvas.captureStream(30);
            recordedChunks = [];
            mediaRecorder = new MediaRecorder(recordingStream);
            mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data.size > 0) recordedChunks.push(event.data);
            });
            mediaRecorder.addEventListener('stop', () => {
                const blob = new Blob(recordedChunks,
                    {type:mediaRecorder.mimeType || 'video/webm'});
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `ewod-annotated-${Date.now()}.webm`;
                link.click();
                // Defer revocation until the browser has used the download URL.
                setTimeout(() => URL.revokeObjectURL(url), 2000);
                stopAnnotatedDrawing();
            }, {once:true});
            mediaRecorder.start(250);
            function paint() {
                if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
                drawAnnotatedRecordingFrame();
                recordingRaf = requestAnimationFrame(paint);
            }
            recordingRaf = requestAnimationFrame(paint);
            startRecordingButton.disabled = true;
            stopRecordingButton.disabled = false;
            cameraStatus.textContent = 'Recording with overlays';
        } catch (error) {
            stopAnnotatedDrawing();
            mediaRecorder = null;
            alert(`Could not start annotated recording: ${error.message}`);
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        startRecordingButton.disabled = false;
        stopRecordingButton.disabled = true;
        cameraStatus.textContent = 'Connected';
    }

    if (startRecordingButton && stopRecordingButton) {
        startRecordingButton.textContent = 'Record With Markers';
        startRecordingButton.title = 'Record the visible camera, red droplet targets, ROI and (if shown) magenta outline.';
        startRecordingButton.addEventListener('click', startRecording);
        stopRecordingButton.addEventListener('click', stopRecording);
    }

// =====================================================
// SELECTED DROPBOT CHANNELS
// =====================================================

const selectedChannelsDisplay =
    document.getElementById(
        "selected-channels"
    );


function updateSelectedChannels() {

    if (!svg || !selectedChannelsDisplay) {
        return;
    }

    const selectedPaths =
        svg.querySelectorAll(
            'path.electrode.selected'
        );

    const channels = [];

    selectedPaths.forEach((path) => {

        const channel =
            path.getAttribute(
                "data-channels"
            );

        if (channel) {
            channels.push(channel);
        }
    });


    if (channels.length === 0) {

        selectedChannelsDisplay.textContent =
            "None";

    } else {

        selectedChannelsDisplay.textContent =
            channels.join(", ");
    }
}


// Watch the SVG for selected/unselected electrodes.
const electrodeObserver =
    new MutationObserver(
        updateSelectedChannels
    );

if (svg) {

    electrodeObserver.observe(
        svg,
        {
            subtree: true,
            attributes: true,
            attributeFilter: [
                "class"
            ]
        }
    );
}

updateSelectedChannels();


// =====================================================
// DROPBOT CONTROL / REALTIME MODE
// =====================================================

const dropbotStatus =
    document.getElementById(
        "dropbot-status"
    );

const realtimeMode =
        document.getElementById(
            "realtime-mode"
        );

    const realtimeState =
        document.getElementById(
            "realtime-state"
        );

    if (
        realtimeMode &&
        realtimeState
    ) {

        realtimeMode.addEventListener(
            "change",
            () => {

                const enabled =
                    realtimeMode.checked;

                realtimeState.textContent =
                    enabled
                        ? "ON"
                        : "OFF";

                console.log(
                    "Realtime Mode:",
                    enabled
                        ? "ON"
                        : "OFF"
                );

                if (
                    window.sendManualRealtimeState
                ) {
                    window.sendManualRealtimeState();
                }
            }
        );
    }


    // =====================================================
// SEND REALTIME TEST COMMAND TO FLASK
// =====================================================



// =====================================================
// DROPBOT CONNECT / DISCONNECT
// =====================================================

const connectDropBotButton =
    document.getElementById(
        "connect-dropbot"
    );

const disconnectDropBotButton =
    document.getElementById(
        "disconnect-dropbot"
    );

async function connectDropBot() {

    if (!dropbotStatus) {
        return;
    }

    dropbotStatus.textContent =
        "Connecting...";

    try {

        const response =
            await fetch(
                "/api/dropbot/connect",
                {
                    method: "POST"
                }
            );

        const result =
            await response.json();

        if (!response.ok || !result.ok) {

            throw new Error(
                result.error ||
                "Connection failed"
            );

        }

        dropbotStatus.textContent =
            "Connected";

        dropbotStatus.classList.remove(
            "status-off"
        );

        dropbotStatus.classList.add(
            "status-on"
        );

        console.log(
            "DropBot connected:",
            result
        );

    } catch (error) {

        dropbotStatus.textContent =
            "Connection Failed";

        console.error(
            "DropBot connection error:",
            error
        );

    }
}


async function disconnectDropBot() {

    if (!dropbotStatus) {
        return;
    }

    try {

        await fetch(
            "/api/dropbot/disconnect",
            {
                method: "POST"
            }
        );

    } catch (error) {

        console.error(
            "DropBot disconnect error:",
            error
        );

    }

    dropbotStatus.textContent =
        "Disconnected";

    dropbotStatus.classList.remove(
        "status-on"
    );

    dropbotStatus.classList.add(
        "status-off"
    );
}


if (connectDropBotButton) {

    connectDropBotButton.addEventListener(
        "click",
        connectDropBot
    );

}


if (disconnectDropBotButton) {

    disconnectDropBotButton.addEventListener(
        "click",
        disconnectDropBot
    );

}
});




// ===== EXPERIMENT LAYOUT + CAMERA PAN =====

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // -------------------------------------------------
        // EXPERIMENT PANEL LAYOUT
        // -------------------------------------------------

        const leftColumn =
            document.querySelector(
                ".left-column"
            );

        const rightColumn =
            document.querySelector(
                ".right-column"
            );

        const hardwarePanel =
            document.querySelector(
                ".hardware-panel"
            );

        const chipPanel =
            document.querySelector(
                ".chip-panel"
            );

        const cameraPanel =
            document.querySelector(
                ".camera-panel"
            );

        const graphPanel =
            document.querySelector(
                ".graph-panel"
            );

        if (
            leftColumn &&
            hardwarePanel &&
            chipPanel
        ) {
            hardwarePanel.insertAdjacentElement(
                "afterend",
                chipPanel
            );
        }

        if (
            rightColumn &&
            cameraPanel &&
            graphPanel
        ) {
            cameraPanel.insertAdjacentElement(
                "afterend",
                graphPanel
            );
        }


        // -------------------------------------------------
        // CAMERA DIGITAL PAN
        // -------------------------------------------------

        const cameraFeed =
            document.getElementById(
                "camera-feed"
            );

        const cameraZoom =
            document.getElementById(
                "camera-zoom"
            );

        if (
            cameraFeed &&
            cameraZoom
        ) {

            let cameraPanX = 50;
            let cameraPanY = 50;

            const PAN_STEP = 3;

            const panControls =
                document.createElement(
                    "div"
                );

            panControls.className =
                "camera-pan-controls";


            const upButton =
                document.createElement(
                    "button"
                );

            upButton.type = "button";
            upButton.textContent = "▲";
            upButton.title =
                "Pan camera view up";


            const leftButton =
                document.createElement(
                    "button"
                );

            leftButton.type = "button";
            leftButton.textContent = "◀";
            leftButton.title =
                "Pan camera view left";


            const centerButton =
                document.createElement(
                    "button"
                );

            centerButton.type = "button";
            centerButton.textContent =
                "Center";

            centerButton.title =
                "Center camera view";


            const rightButton =
                document.createElement(
                    "button"
                );

            rightButton.type = "button";
            rightButton.textContent = "▶";
            rightButton.title =
                "Pan camera view right";


            const downButton =
                document.createElement(
                    "button"
                );

            downButton.type = "button";
            downButton.textContent = "▼";
            downButton.title =
                "Pan camera view down";


            function updateCameraPan() {

                cameraFeed.style.transformOrigin =
                    cameraPanX +
                    "% " +
                    cameraPanY +
                    "%";
            }


            upButton.addEventListener(
                "click",
                () => {

                    cameraPanY =
                        Math.max(
                            0,
                            cameraPanY - PAN_STEP
                        );

                    updateCameraPan();
                }
            );


            downButton.addEventListener(
                "click",
                () => {

                    cameraPanY =
                        Math.min(
                            100,
                            cameraPanY + PAN_STEP
                        );

                    updateCameraPan();
                }
            );


            leftButton.addEventListener(
                "click",
                () => {

                    cameraPanX =
                        Math.max(
                            0,
                            cameraPanX - PAN_STEP
                        );

                    updateCameraPan();
                }
            );


            rightButton.addEventListener(
                "click",
                () => {

                    cameraPanX =
                        Math.min(
                            100,
                            cameraPanX + PAN_STEP
                        );

                    updateCameraPan();
                }
            );


            centerButton.addEventListener(
                "click",
                () => {

                    cameraPanX = 50;
                    cameraPanY = 50;

                    updateCameraPan();
                }
            );


            panControls.innerHTML = `
                <div class="camera-pan-row">
                </div>
                <div class="camera-pan-row">
                </div>
                <div class="camera-pan-row">
                </div>
            `;

            const rows =
                panControls.querySelectorAll(
                    ".camera-pan-row"
                );

            rows[0].appendChild(
                upButton
            );

            rows[1].appendChild(
                leftButton
            );

            rows[1].appendChild(
                centerButton
            );

            rows[1].appendChild(
                rightButton
            );

            rows[2].appendChild(
                downButton
            );


            const zoomParent =
                cameraZoom.parentElement;

            if (zoomParent) {

                zoomParent.appendChild(
                    panControls
                );
            }

            updateCameraPan();
        }
    }
);



// ===== DROPLET VISION V2 =====

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const video =
            document.getElementById(
                "camera-feed"
            );

        const cameraPanel =
            document.querySelector(
                ".camera-panel"
            );

        if (!video || !cameraPanel) {
            return;
        }


        // =====================================================
        // UI
        // =====================================================

        const controls =
            document.createElement(
                "div"
            );

        controls.className =
            "vision-controls";

        controls.innerHTML = `
            <div class="vision-title">
                Droplet Vision V4.7 - Detection + Flexible Layout
            </div>

            <div class="vision-control-row">

                <button
                    id="capture-vision-background"
                    type="button">
                    Capture Empty Chip
                </button>

                <button
                    id="toggle-vision"
                    type="button">
                    Vision ON
                </button>
                <button
                    id="ewod-preview-vision"
                    type="button"
                    title="Read-only test; precision check and actuation gate remain enforced">
                    Preview Detection (No Actuation)
                </button>
              
                <button
                    id="calibrate-four-points"
                    type="button">
                    Calibrate 4 Points
                </button>

                <label>
                    Threshold
                    <input
                        id="vision-threshold"
                        type="range"
                        min="10"
                        max="90"
                        value="30">
                </label>

                <span
                    id="vision-threshold-value">
                    30
                </span>

            </div>

            <div class="vision-control-row" id="ewod-background-preservation">
                <button id="ewod-load-empty-reference" type="button"
                    title="Load the previously saved empty-chip image if the camera and ROI match">
                    Load Empty Reference
                </button>
                <small id="ewod-empty-reference-message" role="status" aria-live="polite">
                    An empty-chip capture saves automatically for later reuse. Never capture with droplets present.
                </small>
            </div>

            <div class="vision-readout">

                <span>
                    Droplet:
                    <strong id="vision-detected">
                        NO
                    </strong>
                </span>

                <span>
                    X:
                    <strong id="vision-x">
                        --
                    </strong>
                </span>

                <span>
                    Y:
                    <strong id="vision-y">
                        --
                    </strong>
                </span>

                <span>
                    Area:
                    <strong id="vision-area">
                        --
                    </strong>
                </span>

                <span>
                    Confidence:
                    <strong id="vision-confidence">
                        --
                    </strong>
                </span>

                <span>
                    Alignment:
                    <strong id="vision-alignment">
                        0, 0
                    </strong>
                </span>

                <span>
                    Status:
                    <strong id="vision-status">
                        Capture empty chip first
                    </strong>
                </span>

            </div>
        `;

        cameraPanel.appendChild(
            controls
        );

        // EWOD V4.8 ITO DIAGNOSTICS EXTENSION — start
        // Optional read-only diagnostics. This panel does NOT actuate electrodes.
        const ewodDiagnosticsPanel=document.createElement('details');
        ewodDiagnosticsPanel.id='ewod-v48-diagnostics';
        ewodDiagnosticsPanel.style.cssText='margin:10px 0;padding:10px;border:1px solid #94a3b8;border-radius:8px;background:#fff;';
        ewodDiagnosticsPanel.innerHTML=`
          <summary style="cursor:pointer;font-weight:600;">Detection Debug — Empty / Live / Difference / Candidate Mask (V4.8)</summary>
          <p style="font-size:12px;margin:7px 0;">Read-only images at the analysis resolution. The candidate mask shows the existing heuristic, not ground truth.</p>
          <label style="font-size:12px;display:block;margin:8px 0;">
            <input id="ewod-v48-edge-guard" type="checkbox">
            Experimental long-edge suppression (preview only, OFF by default)
          </label>
          <div id="ewod-v48-debug-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;">
            <div><strong style="font-size:12px;">Saved empty reference</strong><canvas id="ewod-v48-debug-empty" style="width:100%;display:block;border:1px solid #bbb;"></canvas></div>
            <div><strong style="font-size:12px;">Live frame</strong><canvas id="ewod-v48-debug-live" style="width:100%;display:block;border:1px solid #bbb;"></canvas></div>
            <div><strong style="font-size:12px;">Difference (enhanced contrast)</strong><canvas id="ewod-v48-debug-diff" style="width:100%;display:block;border:1px solid #bbb;"></canvas></div>
            <div><strong style="font-size:12px;">Foreground / filtered candidates</strong><canvas id="ewod-v48-debug-mask" style="width:100%;display:block;border:1px solid #bbb;"></canvas></div>
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button type="button" id="ewod-v48-save-diagnostics">Save Four-Panel Snapshot</button>
            <span id="ewod-v48-debug-status" role="status" style="font-size:12px;">Open the panel, then start Preview Detection.</span>
          </div>`;
        cameraPanel.appendChild(ewodDiagnosticsPanel);
        // EWOD V4.8 ITO DIAGNOSTICS EXTENSION — end UI

        // EWOD V4.9 FOOTPRINT PREVIEW — installed: read-only experimental controls
        const ewodV49Label=document.createElement('label');
        ewodV49Label.style.cssText='display:block;font-size:12px;margin:9px 0;padding:7px;background:#f1f5f9;border-radius:5px;';
        ewodV49Label.innerHTML='<input type="checkbox" id="ewod-v49-enable"> Experimental V4.9 footprint + channel stability (read-only; OFF by default)';
        ewodDiagnosticsPanel.insertBefore(ewodV49Label,document.getElementById('ewod-v48-debug-grid'));
        const ewodV49FootprintPanel=document.createElement('div');
        ewodV49FootprintPanel.innerHTML='<strong style="font-size:12px;">V4.9 reconstructed footprint (experimental estimate)</strong><canvas id="ewod-v48-debug-footprint" style="width:100%;display:block;border:1px solid #bbb;"></canvas><small id="ewod-v49-status" style="font-size:11px;">Off — legacy V4.7 detection is unchanged.</small>';
        document.getElementById('ewod-v48-debug-grid').appendChild(ewodV49FootprintPanel);
        const ewodV49Toggle=document.getElementById('ewod-v49-enable');
        const ewodV49Status=document.getElementById('ewod-v49-status');
        ewodV49Toggle.addEventListener('change',()=>{
            ewodV49Tracks=[];previewTracks=[];previewFramesAnalyzed=0;
            ewodV49Status.textContent=ewodV49Toggle.checked
                ?'ON: testing filled-footprint estimates; no electrical actuation.'
                :'OFF: original V4.7 detection resumed.';
            occupancyReadout.textContent='ANALYZING — collecting new frames after processing-mode change.';
            document.getElementById('ewod-v48-save-diagnostics').textContent=
                ewodV49Toggle.checked?'Save Five-Panel Snapshot':'Save Four-Panel Snapshot';
        });




        // =====================================================
        // VIDEO OVERLAY
        // =====================================================

        const oldParent =
            video.parentElement;

        const stage =
            document.createElement(
                "div"
            );

        stage.className =
            "vision-stage";

        oldParent.insertBefore(
            stage,
            video
        );

        stage.appendChild(
            video
        );

        const overlay =
            document.createElement(
                "canvas"
            );

        overlay.className =
            "vision-overlay";

        stage.appendChild(
            overlay
        );

        const overlayContext =
            overlay.getContext(
                "2d"
            );


        // =====================================================
        // ANALYSIS CANVAS
        // =====================================================

        const analysisCanvas =
            document.createElement(
                "canvas"
            );

        const analysisContext =
            analysisCanvas.getContext(
                "2d",
                {
                    willReadFrequently: true
                }
            );

        const PROCESS_WIDTH = 320;

        const FRAME_INTERVAL = 100;

        // EWOD V4.8 ITO DIAGNOSTICS EXTENSION — start engine
        const ewodDebugOpen=()=>ewodDiagnosticsPanel.open;
        const ewodDebugStatus=document.getElementById('ewod-v48-debug-status');
        const ewodEdgeGuard=document.getElementById('ewod-v48-edge-guard');
        const ewodDebugCanvas=(name)=>document.getElementById('ewod-v48-debug-'+name);
        let ewodLastDebugAt=0;
        const ewodDebugSet=(name,imgData)=>{
            const c=ewodDebugCanvas(name);
            if(!c||!imgData)return;
            c.width=imgData.width;c.height=imgData.height;
            c.getContext('2d').putImageData(imgData,0,0);
        };
        const ewodDebugGrayMap=(buffer,w,h,mode)=>{
            const rgba=new Uint8ClampedArray(w*h*4);
            for(let k=0;k<w*h;k++){
                const p=k*4;
                if(mode==='diff'){
                    // The multiplier is visualization-only; detection uses original threshold.
                    const v=Math.max(0,Math.min(255,Math.round(buffer[k]*4)));
                    rgba[p]=v;rgba[p+1]=v;rgba[p+2]=v;
                }else{
                    // 0=background, 90=raw change, 255=accepted component
                    const v=buffer[k]||0;
                    rgba[p]=v;rgba[p+1]=v;rgba[p+2]=v;
                }
                rgba[p+3]=255;
            }
            return new ImageData(rgba,w,h);
        };
        const ewodDebugReference=()=>{
            if(!ewodDebugOpen())return;
            if(backgroundImage)ewodDebugSet('empty',backgroundImage);
        };
        // Conservative and OPTIONAL preview-only attempt to reject long straight
        // borders already present in the empty reference. Disable if it hides
        // any real droplet. This is NOT a trained droplet classifier.
        const ewodSuppressLongReferenceEdges=(source,bg,live,w,h,roi,alignment)=>{
            const output=new Uint8Array(source);
            let suppressed=0;
            const grayX=(a,i)=>Math.abs(a[i+1]-a[i-1]);
            const grayY=(a,i)=>Math.abs(a[i+w]-a[i-w]);
            for(let y=Math.max(roi.top+4,4);y<Math.min(roi.bottom-4,h-4);y++){
              for(let x=Math.max(roi.left+4,4);x<Math.min(roi.right-4,w-4);x++){
                const i=y*w+x;if(!source[i])continue;
                const xx=x+alignment.dx, yy=y+alignment.dy;
                if(xx<4||xx>=w-4||yy<4||yy>=h-4)continue;
                const j=yy*w+xx;
                const bx=grayX(bg,i),by=grayY(bg,i),lx=grayX(live,j),ly=grayY(live,j);
                let straight=false;
                if(bx>38&&lx>32){
                  let count=0;
                  for(let dy=-4;dy<=4;dy++){
                    if(grayX(bg,i+dy*w)>33)count++;
                  }
                  straight=count>=7 && Math.abs(bx-lx)<42;
                }
                if(!straight && by>38 && ly>32){
                  let count=0;
                  for(let dx=-4;dx<=4;dx++){
                    if(grayY(bg,i+dx)>33)count++;
                  }
                  straight=count>=7 && Math.abs(by-ly)<42;
                }
                if(straight){output[i]=0;suppressed++;}
              }
            }
            return {mask:output,suppressed};
        };
        const ewodRefreshDebug=(currentImage,differenceMap,rawMask,activeMask,w,h,roi,alignment,suppressed)=>{
            if(!ewodDebugOpen())return;
            const now=performance.now();if(now-ewodLastDebugAt<350)return;
            ewodLastDebugAt=now;
            ewodDebugReference();
            ewodDebugSet('live',currentImage);
            ewodDebugSet('diff',ewodDebugGrayMap(differenceMap,w,h,'diff'));
            const cleaned=cleanDropletForeground(activeMask,w,h,roi);
            const {labels}=connectedPreviewRegions(cleaned,w,h,roi);
            const accepted=plausibleDropletRegions(rankPreviewCoverage(cleaned,w,h,roi),roi);
            const selected=new Set(accepted.map(r=>r.id));
            const debugMask=new Uint8Array(w*h);
            let allChanged=0;
            for(let i=0;i<debugMask.length;i++){
                if(rawMask[i]){debugMask[i]=90;allChanged++;}
                if(labels[i]>=0 && selected.has(labels[i]))debugMask[i]=255;
            }
            ewodDebugSet('mask',ewodDebugGrayMap(debugMask,w,h,'mask'));
            ewodDebugStatus.textContent=
              `ROI ${roi.right-roi.left}×${roi.bottom-roi.top}px; raw changed: ${allChanged}px; candidate regions: ${accepted.length}; `+
              `edge guard ${ewodEdgeGuard.checked?'ON':'OFF'}; pixels suppressed: ${suppressed}; `+
              `alignment (${alignment.dx},${alignment.dy}). White=accepted region; gray=raw change. Not validated.`;
        };
        ewodEdgeGuard.addEventListener('change',()=>{
            // Avoid showing stale tracks from a different filtering mode.
            previewTracks=[];previewFramesAnalyzed=0;
            ewodDebugStatus.textContent='Filtering mode changed. Collecting fresh preview frames.';
        });
        document.getElementById('ewod-v48-save-diagnostics')?.addEventListener('click',()=>{
            const names=ewodV49Toggle.checked?['empty','live','diff','mask','footprint']:['empty','live','diff','mask'];
            const canvases=names.map(ewodDebugCanvas);
            if(canvases.some(c=>!c?.width||!c?.height)){
                ewodDebugStatus.textContent='Start Preview Detection with a valid empty reference before saving the snapshot.';return;
            }
            const w=canvases[0].width,h=canvases[0].height;
            const montage=document.createElement('canvas');
            montage.width=w*(ewodV49Toggle.checked?3:2);montage.height=(h+24)*2;
            const ctx=montage.getContext('2d');
            ctx.fillStyle='#fff';ctx.fillRect(0,0,montage.width,montage.height);
            names.forEach((name,k)=>{
                const cols=ewodV49Toggle.checked?3:2,x=(k%cols)*w,y=Math.floor(k/cols)*(h+24);
                ctx.fillStyle='#111';ctx.font='14px sans-serif';ctx.fillText(name.toUpperCase(),x+6,y+17);
                ctx.drawImage(canvases[k],x,y+24,w,h);
            });
            const a=document.createElement('a');
            a.download=(ewodV49Toggle.checked?'ewod-v49-footprint-':'ewod-v48-diagnostics-')+new Date().toISOString().replace(/[:.]/g,'-')+'.png';
            a.href=montage.toDataURL('image/png');a.click();
        });
        ewodDiagnosticsPanel.addEventListener('toggle',()=>{if(ewodDebugOpen())ewodDebugReference();});
        // EWOD V4.8 ITO DIAGNOSTICS EXTENSION — end engine


        /*
        Region of interest.

        This intentionally ignores much of the outside
        PCB and the large upper/lower copper areas.
        */

        // ROI is in displayed-camera coordinates (0..1), independent of the
        // PCB copper power strips. It is not used to define electrode geometry.
        const ROI_STORAGE_KEY = "ewod.vision.roi.v2";
        const DEFAULT_ROI = {left:0.17, right:0.75, top:0.17, bottom:0.84};
        const cloneROI = r => ({left:r.left, right:r.right, top:r.top, bottom:r.bottom});
        const clampROI = r => {
            const left=Math.max(0,Math.min(0.94,Number(r.left)));
            const right=Math.max(left+0.05,Math.min(1,Number(r.right)));
            const top=Math.max(0,Math.min(0.94,Number(r.top)));
            const bottom=Math.max(top+0.05,Math.min(1,Number(r.bottom)));
            return {left,right,top,bottom};
        };
        let savedROI=cloneROI(DEFAULT_ROI);
        let roiDraft=null;
        let roiEditMode=false;
        let roiSavedSignature=null;
        try {
            const obj=JSON.parse(localStorage.getItem(ROI_STORAGE_KEY)||"null");
            if(obj?.roi && [obj.roi.left,obj.roi.right,obj.roi.top,obj.roi.bottom].every(Number.isFinite)) {
                const r=clampROI(obj.roi);
                if(r.right-r.left>=0.05 && r.bottom-r.top>=0.05) savedROI=r;
                roiSavedSignature=obj.signature||null;
            }
        } catch(error) {console.warn("ROI restore skipped",error);}
        const cameraViewSignature=()=>{
            const origin=getComputedStyle(video).transformOrigin.split(/\s+/);
            const w=video.clientWidth||1, h=video.clientHeight||1;
            return {width:video.videoWidth,height:video.videoHeight,
                zoom:Number(document.getElementById("camera-zoom")?.value||1),
                originX:parseFloat(origin[0])/w,originY:parseFloat(origin[1])/h};
        };
        const viewMatches=(a,b)=>!!a&&!!b&&a.width===b.width&&a.height===b.height&&
            Math.abs(a.zoom-b.zoom)<0.005&&Math.abs(a.originX-b.originX)<0.006&&
            Math.abs(a.originY-b.originY)<0.006;


        let backgroundImage = null;

        let backgroundGray = null;
        let backgroundViewSignature=null;
        // The analysis frame is intentionally small (PROCESS_WIDTH=320).
        // A PNG of it fits comfortably in the current browser's local storage.
        // Do not persist the raw high-resolution camera stream or any user video.
        const EMPTY_REF_STORAGE_KEY = "ewod.vision.empty-background.v1";
        const roiEquals = (a,b) => !!a&&!!b&&
            ["left","right","top","bottom"].every(k => Math.abs(a[k]-b[k])<0.00001);


        let visionEnabled = false;
        let visionPreviewMode = false;
        let previewButton = null;

        let previousBlob = null;

        let lastProcessTime = 0;
        // Four-point camera calibration
       let calibrationMode = false;
       let calibrationPoints = [];

       const calibrationButton =
           document.getElementById("calibrate-four-points");

if (calibrationButton) {
    calibrationButton.addEventListener("click", () => {
        calibrationMode = !calibrationMode;
        calibrationPoints = [];

        overlay.classList.toggle("calibrating", calibrationMode);

        calibrationButton.textContent =
            calibrationMode ? "Cancel Calibration" : "Calibrate 4 Points";

        drawOverlay(null, 0);
    });
}

overlay.addEventListener("click", (event) => {
    if (!calibrationMode || calibrationPoints.length >= 4) return;

    const rect = overlay.getBoundingClientRect();

    const x = (event.clientX - rect.left) * overlay.width / rect.width;
    const y = (event.clientY - rect.top) * overlay.height / rect.height;

    calibrationPoints.push({ x, y });

    drawOverlay(null, 0);

    if (calibrationPoints.length === 4) {
        calibrationMode = false;
        overlay.classList.remove("calibrating");
        calibrationButton.textContent = "Calibrate 4 Points";
        console.log("Camera calibration points:", calibrationPoints);

        // Enable SVG landmark selection after camera selection.
        window.ewodSvgCalibrationPoints = [];
        window.ewodCalibrationMode = true;

        window.ewodCameraCalibrationPoints =
            calibrationPoints.map(point => ({ ...point }));

        statusDisplay.textContent =
            "Camera points saved. Select 4 matching SVG points.";
    }
});

        // Vision V3 persistence state
        let persistenceCandidate = null;
        let persistenceFrames = 0;
        const REQUIRED_PERSISTENCE_FRAMES = 3;
        const MAX_PERSISTENCE_DISTANCE = 25;


        // =====================================================
        // UI REFERENCES
        // =====================================================

        const captureButton =
            document.getElementById(
                "capture-vision-background"
            );

        const toggleButton =
            document.getElementById(
                "toggle-vision"
            );

        const thresholdInput =
            document.getElementById(
                "vision-threshold"
            );

        const thresholdValue =
            document.getElementById(
                "vision-threshold-value"
            );

        const detectedDisplay =
            document.getElementById(
                "vision-detected"
            );

        const xDisplay =
            document.getElementById(
                "vision-x"
            );

        const yDisplay =
            document.getElementById(
                "vision-y"
            );

        const areaDisplay =
            document.getElementById(
                "vision-area"
            );

        const confidenceDisplay =
            document.getElementById(
                "vision-confidence"
            );

        const alignmentDisplay =
            document.getElementById(
                "vision-alignment"
            );

        const statusDisplay =
            document.getElementById(
                "vision-status"
            );
        // Read-only per-region channel occupancy. This is a diagnostic display,
        // not a hardware command or an accepted closed-loop localization.
        const occupancyReadout=document.createElement("div");
        occupancyReadout.id="ewod-channel-occupancy";
        occupancyReadout.setAttribute("role","status");
        occupancyReadout.style.cssText="margin-top:6px;padding:8px;border:1px solid #9ca3af;border-radius:6px;font-size:12px;line-height:1.5;white-space:normal;";
        occupancyReadout.textContent="Multi-electrode preview: inactive. Use Preview Detection (No Actuation).";
        controls.appendChild(occupancyReadout);
        let previewTracks=[];
        let nextPreviewTrackId=1;
        let previewFramesAnalyzed=0;

        // Simplify calibration controls without deleting saved geometry.
        // calibration.js loads after this script, so a CSS rule also covers
        // the button when that script creates it.
        const compactCalibrationStyle=document.createElement("style");
        compactCalibrationStyle.textContent="#ewod-restore-magenta { display:none !important; }";
        document.head.appendChild(compactCalibrationStyle);

        // V2.4: keep calibration appearance separate from actual mapping.
        // Hide ALL projected-magenta preview canvases, including canvases created
        // later by Restore Saved Magenta. Detection polygons are NOT changed.
        const MAGENTA_VISIBILITY_KEY="ewod.vision.magenta.hidden.v1";
        const magentaVisibilityStyle=document.createElement("style");
        magentaVisibilityStyle.textContent=`
            body.ewod-magenta-hidden #ewod-auto-calibration-preview,
            body.ewod-magenta-hidden #ewod-calibration-preview,
            body.ewod-magenta-hidden #calibration-preview {
                visibility: hidden !important;
            }`;
        document.head.appendChild(magentaVisibilityStyle);
        let magentaHidden=localStorage.getItem(MAGENTA_VISIBILITY_KEY)==="1";
        const magentaToggle=document.createElement("button");
        magentaToggle.type="button";
        magentaToggle.id="ewod-toggle-magenta";
        magentaToggle.title="Only change magenta visibility; do not alter calibration coordinates or the detector.";
        magentaToggle.style.cssText="margin:6px 8px 6px 0;";
        const syncMagentaVisibility=()=>{
            document.body.classList.toggle("ewod-magenta-hidden",magentaHidden);
            magentaToggle.textContent=magentaHidden?"Show Magenta":"Hide Magenta";
            magentaToggle.setAttribute("aria-pressed",String(magentaHidden));
        };
        magentaToggle.addEventListener("click",()=>{
            magentaHidden=!magentaHidden;
            localStorage.setItem(MAGENTA_VISIBILITY_KEY,magentaHidden?"1":"0");
            syncMagentaVisibility();
        });
        syncMagentaVisibility();
        controls.appendChild(magentaToggle);

        // The droplet preview analyzes all calibrated electrodes internally.
        // There is no separate manual Analyze Again control.

// ===== ROI editor: move/resize the yellow analysis region =====
// Interactive handles are in the displayed camera coordinate system.
const roiToolbar=document.createElement("div");
roiToolbar.className="ewod-roi-toolbar";
roiToolbar.innerHTML=`
  <button type="button" id="ewod-edit-roi">Adjust Yellow ROI</button>
  <button type="button" id="ewod-save-roi" disabled>Save ROI</button>
  <button type="button" id="ewod-cancel-roi" disabled>Cancel ROI</button>
  <button type="button" id="ewod-reset-roi">Reset ROI</button>
  <small id="ewod-roi-message" role="status" aria-live="polite">ROI can be moved and resized separately from electrode alignment.</small>`;
controls.insertBefore(roiToolbar, controls.querySelector(".vision-readout"));
const editROIButton=roiToolbar.querySelector("#ewod-edit-roi");
const saveROIButton=roiToolbar.querySelector("#ewod-save-roi");
const cancelROIButton=roiToolbar.querySelector("#ewod-cancel-roi");
const resetROIButton=roiToolbar.querySelector("#ewod-reset-roi");
const roiMessage=roiToolbar.querySelector("#ewod-roi-message");
const roiEditor=document.createElement("div");
roiEditor.className="ewod-roi-editor";
roiEditor.hidden=true;
const roiFrame=document.createElement("div");
roiFrame.className="ewod-roi-edit-frame";
roiEditor.appendChild(roiFrame);
for(const corner of ["nw","ne","se","sw"]) {
    const handle=document.createElement("div");
    handle.className="ewod-roi-handle ewod-roi-"+corner;
    handle.dataset.corner=corner;
    handle.title="Drag to resize ROI";
    roiFrame.appendChild(handle);
}
stage.appendChild(roiEditor);
const currentROI=()=>roiDraft || savedROI;
function updateROIEditor() {
    const r=currentROI();
    roiFrame.style.left=`${r.left*100}%`;
    roiFrame.style.top=`${r.top*100}%`;
    roiFrame.style.width=`${(r.right-r.left)*100}%`;
    roiFrame.style.height=`${(r.bottom-r.top)*100}%`;
    drawOverlay(null,0);
}
function resetDetectionForROI(message, options={}) {
    // The stored reference is an entire analysis FRAME, not an ROI crop.
    // A ROI-only adjustment can restart detection without discarding pixels.
    const keepBackground = Boolean(options.keepBackground) &&
        Boolean(backgroundImage && backgroundGray && backgroundViewSignature) &&
        viewMatches(backgroundViewSignature,cameraViewSignature());
    if(!keepBackground) {
        backgroundImage=null;
        backgroundGray=null;
        backgroundViewSignature=null;
    }
    previousBlob=null;
    persistenceCandidate=null;
    persistenceFrames=0;
    visionEnabled=false;
    visionPreviewMode=false;
    toggleButton.disabled=false;
    if(previewButton) previewButton.textContent="Preview Detection (No Actuation)";
    toggleButton.textContent="Vision ON";
    window.ewodVisionPreviewResult=null;
    detectedDisplay.textContent="NO";
    xDisplay.textContent=yDisplay.textContent=areaDisplay.textContent=confidenceDisplay.textContent="--";
    window.ewodVisionState={detected:false,reason:"ROI or camera view changed"};
    statusDisplay.textContent=message;
    drawOverlay(null,0);
}
function closeROIEdit() {
    roiEditMode=false;
    roiDraft=null;
    roiEditor.hidden=true;
    editROIButton.disabled=false;
    saveROIButton.disabled=cancelROIButton.disabled=true;
    updateROIEditor();
}
editROIButton.addEventListener("click",()=>{
    if(!video.videoWidth) {roiMessage.textContent="Start the camera first.";return;}
    if(document.querySelector("#ewod-eight-point-picker")||calibrationMode||window.ewodCalibrationMode||
        document.getElementById("ewod-cancel-adjust")?.disabled===false) {
        roiMessage.textContent="Finish electrode calibration or overlay adjustment first.";return;
    }
    if(visionEnabled) {
        roiMessage.textContent="Turn Vision OFF before adjusting ROI.";return;
    }
    roiEditMode=true;
    roiDraft=cloneROI(savedROI);
    roiEditor.hidden=false;
    editROIButton.disabled=true;
    saveROIButton.disabled=cancelROIButton.disabled=false;
    roiMessage.textContent="Drag inside the yellow box to move; drag any corner to resize.";
    updateROIEditor();
});
cancelROIButton.addEventListener("click",()=>{
    closeROIEdit();
    roiMessage.textContent="ROI changes cancelled.";
});
saveROIButton.addEventListener("click",()=>{
    const oldROI=cloneROI(savedROI);
    savedROI=clampROI(roiDraft);
    roiSavedSignature=cameraViewSignature();
    localStorage.setItem(ROI_STORAGE_KEY,JSON.stringify({roi:savedROI,signature:roiSavedSignature}));
    closeROIEdit();
    // An empty-chip capture contains the entire camera analysis frame,
    // NOT just the yellow ROI. ROI-only edits must not destroy it.
    const canReuseBackground=Boolean(backgroundImage && backgroundGray &&
        viewMatches(backgroundViewSignature,cameraViewSignature()));
    const unchanged=roiEquals(oldROI,savedROI);
    if(canReuseBackground) {
        resetDetectionForROI(unchanged
            ? "ROI confirmed; existing full-frame empty background retained."
            : "ROI updated; full-frame empty background retained. Restart Preview Detection.",
            {keepBackground:true});
        roiMessage.textContent="Empty reference retained. No recapture needed when only ROI changes.";
    } else {
        resetDetectionForROI("ROI saved. Load the matching empty reference, or capture a new empty chip once.");
        roiMessage.textContent="ROI saved. Load your saved background for this view, or capture an empty chip once.";
    }
});
resetROIButton.addEventListener("click",()=>{
    savedROI=cloneROI(DEFAULT_ROI);
    roiSavedSignature=cameraViewSignature();
    localStorage.setItem(ROI_STORAGE_KEY,JSON.stringify({roi:savedROI,signature:roiSavedSignature}));
    closeROIEdit();
    const canReuseBackground=Boolean(backgroundImage && backgroundGray &&
        viewMatches(backgroundViewSignature,cameraViewSignature()));
    resetDetectionForROI(canReuseBackground
        ? "ROI reset; full-frame empty reference retained. Restart Preview Detection."
        : "ROI reset. Load a saved background for the same camera view or capture while empty.",
        {keepBackground:canReuseBackground});
    roiMessage.textContent=canReuseBackground
        ? "ROI reset; existing empty reference retained."
        : "ROI reset; load the matching empty reference.";
});
let roiDrag=null;
roiEditor.addEventListener("pointerdown",event=>{
    if(!roiEditMode||!roiDraft||!roiFrame.contains(event.target))return;
    if(event.button!==0 && event.pointerType!=="touch")return;
    event.preventDefault();
    const rect=stage.getBoundingClientRect();
    roiDrag={id:event.pointerId,x:event.clientX,y:event.clientY,w:rect.width,h:rect.height,
        rect:cloneROI(roiDraft),corner:event.target.dataset.corner||"move"};
    roiEditor.setPointerCapture(event.pointerId);
});
roiEditor.addEventListener("pointermove",event=>{
    if(!roiDrag||!roiDraft||roiDrag.id!==event.pointerId)return;
    const dx=(event.clientX-roiDrag.x)/roiDrag.w;
    const dy=(event.clientY-roiDrag.y)/roiDrag.h;
    const r=roiDrag.rect;
    if(roiDrag.corner==="move") {
        const w=r.right-r.left,h=r.bottom-r.top;
        const left=Math.max(0,Math.min(1-w,r.left+dx));
        const top=Math.max(0,Math.min(1-h,r.top+dy));
        roiDraft={left,right:left+w,top,bottom:top+h};
    } else {
        const minGap=0.06;
        roiDraft={...r};
        if(roiDrag.corner.includes("w"))roiDraft.left=Math.max(0,Math.min(r.right-minGap,r.left+dx));
        if(roiDrag.corner.includes("e"))roiDraft.right=Math.min(1,Math.max(r.left+minGap,r.right+dx));
        if(roiDrag.corner.includes("n"))roiDraft.top=Math.max(0,Math.min(r.bottom-minGap,r.top+dy));
        if(roiDrag.corner.includes("s"))roiDraft.bottom=Math.min(1,Math.max(r.top+minGap,r.bottom+dy));
    }
    updateROIEditor();
});
const endROIEvent=event=>{
    if(roiDrag?.id===event.pointerId)roiDrag=null;
};
roiEditor.addEventListener("pointerup",endROIEvent);
roiEditor.addEventListener("pointercancel",endROIEvent);
// Existing raw-camera background must not survive zoom/pan or camera mode changes.
const invalidateView=()=>{
    if(roiEditMode)closeROIEdit();
    if(backgroundImage)resetDetectionForROI("Camera view changed. Capture Empty Chip again.");
    if(roiSavedSignature&&!viewMatches(roiSavedSignature,cameraViewSignature()))
        roiMessage.textContent="ROI is from another camera view; check its position before tracking.";
};
document.getElementById("camera-zoom")?.addEventListener("input",invalidateView);
document.querySelectorAll(".camera-pan-controls button").forEach(b=>b.addEventListener("click",invalidateView));
video.addEventListener("loadedmetadata",invalidateView);
video.addEventListener("playing",invalidateView);

        thresholdInput.addEventListener(
            "input",
            () => {

                thresholdValue.textContent =
                    thresholdInput.value;

                previousBlob = null;
            }
        );


        // =====================================================
        // PREPARE FRAME
        // =====================================================

        function prepareCanvas() {

            if (
                !video.videoWidth ||
                !video.videoHeight
            ) {
                return false;
            }

            const ratio =
                video.videoHeight /
                video.videoWidth;

            analysisCanvas.width =
                PROCESS_WIDTH;

            analysisCanvas.height =
                Math.round(
                    PROCESS_WIDTH *
                    ratio
                );

            overlay.width =
                video.videoWidth;

            overlay.height =
                video.videoHeight;

            return true;
        }


        // =====================================================

        // Initialize the calibration overlay when video starts.
        video.addEventListener("loadedmetadata", () => {
            if (prepareCanvas()) {
                drawOverlay(null, 0);
                console.log(
                    "Overlay initialized:",
                    overlay.width,
                    overlay.height
                );
            }
        });

        // RGB -> GRAY
        // =====================================================

        function drawDisplayedFrame() {
            const style=getComputedStyle(video);
            const origin=style.transformOrigin.split(/\s+/);
            const clientW=video.clientWidth||1,clientH=video.clientHeight||1;
            const ox=Number.parseFloat(origin[0])/clientW;
            const oy=Number.parseFloat(origin[1])/clientH;
            const z=Number(document.getElementById("camera-zoom")?.value||1);
            const w=analysisCanvas.width,h=analysisCanvas.height;
            analysisContext.clearRect(0,0,w,h);
            analysisContext.drawImage(video,(1-z)*(Number.isFinite(ox)?ox:0.5)*w,
                (1-z)*(Number.isFinite(oy)?oy:0.5)*h,w*z,h*z);
        }

        function makeGray(
            imageData
        ) {

            const count =
                imageData.width *
                imageData.height;

            const gray =
                new Uint8Array(
                    count
                );

            for (
                let i = 0;
                i < count;
                i++
            ) {

                const p = i * 4;

                gray[i] =
                    Math.round(
                        0.299 *
                            imageData.data[p] +
                        0.587 *
                            imageData.data[p + 1] +
                        0.114 *
                            imageData.data[p + 2]
                    );
            }

            return gray;
        }


        // =====================================================
        // PERSISTENT EMPTY-CHIP REFERENCE (V2.1)
        // =====================================================
        // Save a PNG of the *already captured* background, not a live frame.
        // Reuse only for the same camera/device, resolution, zoom/pan and ROI.
        // A physical movement/lighting change cannot be reliably detected in
        // software: the experimenter must verify those conditions before load.
        const loadEmptyReferenceButton = document.getElementById("ewod-load-empty-reference");
        const emptyReferenceMessage = document.getElementById("ewod-empty-reference-message");
        const cameraIdentityForRef=()=>{
            try {
                return video.srcObject?.getVideoTracks()?.[0]?.getSettings()?.deviceId ||
                    document.getElementById("camera-select")?.value || "";
            } catch(error) {return document.getElementById("camera-select")?.value || "";}
        };
        const reportEmptyReference=(message)=>{
            if(emptyReferenceMessage)emptyReferenceMessage.textContent=message;
            statusDisplay.textContent=message;
        };
        try {
            const stored=JSON.parse(localStorage.getItem(EMPTY_REF_STORAGE_KEY)||"null");
            if(stored?.version===1 && typeof stored.png==="string") {
                emptyReferenceMessage.textContent=
                    "Saved empty background available. Click Load Empty Reference after verifying camera/chip have not moved.";
            }
        } catch(error) {console.warn("Saved empty reference metadata invalid",error);}

        function persistCapturedEmptyReference(){
            if(!backgroundImage || !backgroundViewSignature) {
                return false;
            }
            if(!viewMatches(backgroundViewSignature,cameraViewSignature())) {
                return false;
            }
            try {
                const imageCanvas=document.createElement("canvas");
                imageCanvas.width=backgroundImage.width;
                imageCanvas.height=backgroundImage.height;
                imageCanvas.getContext("2d").putImageData(backgroundImage,0,0);
                const payload={version:1,png:imageCanvas.toDataURL("image/png"),
                    width:backgroundImage.width,height:backgroundImage.height,
                    signature:{...backgroundViewSignature},roi:cloneROI(savedROI),
                    camera:cameraIdentityForRef(),capturedAt:new Date().toISOString()};
                localStorage.setItem(EMPTY_REF_STORAGE_KEY,JSON.stringify(payload));
                if(emptyReferenceMessage)emptyReferenceMessage.textContent="Empty-chip background saved automatically. Load it after a refresh if the physical setup is unchanged.";
                return true;
            } catch(error) {
                console.warn("Automatic empty-chip background save failed:",error);
                if(emptyReferenceMessage)emptyReferenceMessage.textContent="Background captured in memory, but automatic save failed: "+error.message;
                return false;
            }
        }

        loadEmptyReferenceButton?.addEventListener("click",async()=>{
            let stored;
            try {stored=JSON.parse(localStorage.getItem(EMPTY_REF_STORAGE_KEY)||"null");}
            catch(error){reportEmptyReference("Saved background is invalid: "+error.message);return;}
            if(!stored || stored.version!==1 || typeof stored.png!=="string") {
                reportEmptyReference("No saved background yet. Click Capture Empty Chip once while the chip is empty; it will save automatically.");
                return;
            }
            if(!prepareCanvas()) {
                reportEmptyReference("Start the camera before loading its saved reference.");return;
            }
            if(!viewMatches(stored.signature,cameraViewSignature())) {
                reportEmptyReference("Saved background does not match this resolution/zoom/pan. Restore the original view or capture a new empty reference.");
                return;
            }
            const cameraId=cameraIdentityForRef();
            if(stored.camera && cameraId && stored.camera!==cameraId) {
                reportEmptyReference("Saved background belongs to a different camera. Capture a new empty reference.");return;
            }
            // ROI geometry may differ: the PNG covers the entire displayed
            // analysis frame. Only camera identity/zoom/pan/resolution and
            // physical setup must be unchanged. ROI is a selection inside it.
            if(roiSavedSignature && !viewMatches(roiSavedSignature,cameraViewSignature())) {
                reportEmptyReference("ROI is linked to a different view. Confirm the unchanged ROI using Adjust Yellow ROI / Save ROI, then load again.");
                return;
            }
            if(stored.width!==analysisCanvas.width || stored.height!==analysisCanvas.height) {
                reportEmptyReference("Saved background dimensions don't match camera analysis frame.");return;
            }
            loadEmptyReferenceButton.disabled=true;
            try {
                const image=await new Promise((resolve,reject)=>{
                    const i=new Image();i.onload=()=>resolve(i);
                    i.onerror=()=>reject(new Error("Saved image could not be decoded"));
                    i.src=stored.png;
                });
                if(!viewMatches(stored.signature,cameraViewSignature())) {
                    throw new Error("Camera view changed during loading");
                }
                const temp=document.createElement("canvas");
                temp.width=stored.width;temp.height=stored.height;
                const ctx=temp.getContext("2d",{willReadFrequently:true});
                ctx.drawImage(image,0,0);
                backgroundImage=ctx.getImageData(0,0,stored.width,stored.height);
                backgroundGray=makeGray(backgroundImage);
                backgroundViewSignature={...stored.signature};
                ewodDebugReference(); // EWOD V4.8 refresh restored reference image

                previousBlob=null;
                persistenceCandidate=null;
                persistenceFrames=0;
                window.ewodVisionPreviewResult=null;
                detectedDisplay.textContent="NO";
                xDisplay.textContent=yDisplay.textContent=areaDisplay.textContent=confidenceDisplay.textContent="--";
                drawOverlay(null,0);
                reportEmptyReference("Saved full-frame empty reference LOADED for this camera view and current ROI. Use only if chip/camera/ITO/lighting are unchanged.");
            } catch(error) {
                reportEmptyReference("Could not load reference: "+error.message);
            } finally {loadEmptyReferenceButton.disabled=false;}
        });

        // =====================================================
        // ROI BOUNDS
        // =====================================================

        function getROI() {
            const w=analysisCanvas.width, h=analysisCanvas.height;
            const r=currentROI();
            return {left:Math.round(w*r.left),right:Math.round(w*r.right),
                    top:Math.round(h*r.top),bottom:Math.round(h*r.bottom)};
        }


        // =====================================================
        // SMALL TRANSLATION ALIGNMENT
        // =====================================================

        function estimateAlignment(
            currentGray
        ) {

            if (!backgroundGray) {

                return {
                    dx: 0,
                    dy: 0
                };
            }

            const width =
                analysisCanvas.width;

            const height =
                analysisCanvas.height;

            const roi =
                getROI();

            let bestScore =
                Infinity;

            let bestDX = 0;
            let bestDY = 0;

            /*
            Search +/- 5 analysis pixels.

            At 320 px processing width this handles
            small camera/chip shifts without expensive
            full image registration.
            */

            for (
                let dy = -5;
                dy <= 5;
                dy++
            ) {

                for (
                    let dx = -5;
                    dx <= 5;
                    dx++
                ) {

                    let score = 0;
                    let samples = 0;

                    /*
                    Sparse sampling makes alignment fast.
                    */

                    for (
                        let y = roi.top;
                        y < roi.bottom;
                        y += 4
                    ) {

                        const cy =
                            y + dy;

                        if (
                            cy < 0 ||
                            cy >= height
                        ) {
                            continue;
                        }

                        for (
                            let x = roi.left;
                            x < roi.right;
                            x += 4
                        ) {

                            const cx =
                                x + dx;

                            if (
                                cx < 0 ||
                                cx >= width
                            ) {
                                continue;
                            }

                            const backgroundIndex =
                                y *
                                width +
                                x;

                            const currentIndex =
                                cy *
                                width +
                                cx;

                            score +=
                                Math.abs(
                                    backgroundGray[
                                        backgroundIndex
                                    ] -
                                    currentGray[
                                        currentIndex
                                    ]
                                );

                            samples++;
                        }
                    }

                    if (samples > 0) {

                        score /= samples;
                    }

                    if (
                        score <
                        bestScore
                    ) {

                        bestScore =
                            score;

                        bestDX = dx;
                        bestDY = dy;
                    }
                }
            }

            return {
                dx: bestDX,
                dy: bestDY
            };
        }


        // =====================================================
        // MORPHOLOGICAL NOISE CLEANUP
        // =====================================================

        function cleanMask(
            source,
            width,
            height
        ) {

            const cleaned =
                new Uint8Array(
                    source.length
                );

            /*
            Remove isolated pixels:
            keep a pixel only if at least two of its
            8 neighbors are also active.
            */

            for (
                let y = 1;
                y < height - 1;
                y++
            ) {

                for (
                    let x = 1;
                    x < width - 1;
                    x++
                ) {

                    const index =
                        y * width + x;

                    if (!source[index]) {
                        continue;
                    }

                    let neighbors = 0;

                    for (
                        let oy = -1;
                        oy <= 1;
                        oy++
                    ) {

                        for (
                            let ox = -1;
                            ox <= 1;
                            ox++
                        ) {

                            if (
                                ox === 0 &&
                                oy === 0
                            ) {
                                continue;
                            }

                            if (
                                source[
                                    (
                                        y + oy
                                    ) *
                                    width +
                                    (
                                        x + ox
                                    )
                                ]
                            ) {
                                neighbors++;
                            }
                        }
                    }

                    if (
                        neighbors >= 2
                    ) {
                        cleaned[index] = 1;
                    }
                }
            }

            return cleaned;
        }


        // =====================================================
        // EXTRACT CONNECTED COMPONENTS
        // =====================================================

        function findBlobs(
            mask,
            width,
            height
        ) {

            const roi =
                getROI();

            const visited =
                new Uint8Array(
                    mask.length
                );

            const queue =
                new Int32Array(
                    mask.length
                );

            const blobs = [];


            for (
                let y = roi.top;
                y < roi.bottom;
                y++
            ) {

                for (
                    let x = roi.left;
                    x < roi.right;
                    x++
                ) {

                    const start =
                        y *
                        width +
                        x;

                    if (
                        !mask[start] ||
                        visited[start]
                    ) {
                        continue;
                    }

                    let head = 0;
                    let tail = 0;

                    queue[tail++] =
                        start;

                    visited[start] = 1;

                    let count = 0;

                    let sumX = 0;
                    let sumY = 0;

                    let minX = x;
                    let maxX = x;

                    let minY = y;
                    let maxY = y;


                    while (
                        head < tail
                    ) {

                        const index =
                            queue[head++];

                        const px =
                            index %
                            width;

                        const py =
                            Math.floor(
                                index /
                                width
                            );

                        count++;

                        sumX += px;
                        sumY += py;

                        minX =
                            Math.min(
                                minX,
                                px
                            );

                        maxX =
                            Math.max(
                                maxX,
                                px
                            );

                        minY =
                            Math.min(
                                minY,
                                py
                            );

                        maxY =
                            Math.max(
                                maxY,
                                py
                            );


                        const neighbors = [
                            index - 1,
                            index + 1,
                            index - width,
                            index + width
                        ];


                        for (
                            const neighbor
                            of neighbors
                        ) {

                            if (
                                neighbor < 0 ||
                                neighbor >=
                                    mask.length
                            ) {
                                continue;
                            }

                            if (
                                mask[neighbor] &&
                                !visited[neighbor]
                            ) {

                                visited[neighbor] =
                                    1;

                                queue[tail++] =
                                    neighbor;
                            }
                        }
                    }


                    if (
                        count < 8
                    ) {
                        continue;
                    }


                    const boxWidth =
                        maxX -
                        minX +
                        1;

                    const boxHeight =
                        maxY -
                        minY +
                        1;

                    const boxArea =
                        boxWidth *
                        boxHeight;

                    const density =
                        count /
                        boxArea;


                    blobs.push({
                        count,

                        centerX:
                            sumX /
                            count,

                        centerY:
                            sumY /
                            count,

                        minX,
                        maxX,
                        minY,
                        maxY,

                        boxWidth,
                        boxHeight,

                        density
                    });
                }
            }

            return blobs;
        }


        // =====================================================
        // SCORE CANDIDATES
        // =====================================================

        function scoreBlob(
            blob
        ) {

            /*
            Reject things clearly inconsistent with
            a small droplet candidate.
            */

            if (
                blob.count < 40 ||
                blob.count > 3500
            ) {
                return -Infinity;
            }

            /*
            Large thin electrode edges tend to have
            low density. Compact droplets score higher.
            */

            let score =
                blob.count *
                (
                    0.35 +
                    blob.density
                );


            /*
            Temporal continuity:
            prefer candidates near the droplet location
            found in the previous frame.
            */

            if (previousBlob) {

                const dx =
                    blob.centerX -
                    previousBlob.centerX;

                const dy =
                    blob.centerY -
                    previousBlob.centerY;

                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );

                score *=
                    1 /
                    (
                        1 +
                        distance /
                        30
                    );
            }

            return score;
        }


        function chooseBlob(
            blobs
        ) {

            let best = null;
            let bestScore =
                -Infinity;

            for (
                const blob
                of blobs
            ) {

                const score =
                    scoreBlob(
                        blob
                    );

                if (
                    score >
                    bestScore
                ) {

                    bestScore =
                        score;

                    best = blob;
                }
            }

            if (!best) {

                return {
                    blob: null,
                    confidence: 0
                };
            }


            /*
            Simple interpretable confidence for V2.

            Later this will be replaced by calibrated
            probability / segmentation confidence.
            */

            const densityConfidence =
                Math.min(
                    1,
                    best.density *
                    2
                );

            const areaConfidence =
                Math.min(
                    1,
                    best.count /
                    120
                );

            let confidence =
                (
                    densityConfidence +
                    areaConfidence
                ) / 2;


            if (previousBlob) {

                const dx =
                    best.centerX -
                    previousBlob.centerX;

                const dy =
                    best.centerY -
                    previousBlob.centerY;

                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );

                const continuity =
                    Math.max(
                        0,
                        1 -
                        distance /
                        80
                    );

                confidence =
                    (
                        confidence *
                        0.7 +
                        continuity *
                        0.3
                    );
            }


            return {
                blob: best,
                confidence:
                    Math.max(
                        0,
                        Math.min(
                            1,
                            confidence
                        )
                    )
            };
        }


        // =====================================================
        // DRAW ROI + DETECTION
        // =====================================================

        function drawOverlay(
            blob,
            confidence
        ) {

            overlayContext.clearRect(
                0,
                0,
                overlay.width,
                overlay.height
            );


            const scaleX =
                overlay.width /
                analysisCanvas.width;

            const scaleY =
                overlay.height /
                analysisCanvas.height;


            /*
            Draw ROI in yellow.
            */

            const roi =
                getROI();

            overlayContext.strokeStyle =
                "rgba(255, 196, 0, 0.9)";

            overlayContext.lineWidth =
                3;

            overlayContext.setLineDash(
                [10, 7]
            );
            overlayContext.strokeRect(
                roi.left *
                    scaleX,

                roi.top *
                    scaleY,

                (
                    roi.right -
                    roi.left
                ) *
                    scaleX,

                (
                    roi.bottom -
                    roi.top
                ) *
                    scaleY
            );

            overlayContext.setLineDash(
                []
            );

            // Display selected calibration points
            calibrationPoints.forEach((point, index) => {
                overlayContext.beginPath();
                overlayContext.arc(point.x, point.y, 18, 0, Math.PI * 2);

                overlayContext.fillStyle = "#00ff66";
                overlayContext.fill();

                overlayContext.strokeStyle = "#000000";
                overlayContext.lineWidth = 2;
                overlayContext.stroke();

                overlayContext.fillStyle = "#000000";
                overlayContext.font = "bold 24px Arial";
                overlayContext.textAlign = "center";
                overlayContext.textBaseline = "middle";

                overlayContext.fillText(
                    String(index + 1),
                    point.x,
                    point.y
                );
            });

            if (!blob) {
                return;
            }


            const left =
                blob.minX *
                scaleX;

            const top =
                blob.minY *
                scaleY;

            const width =
                (
                    blob.maxX -
                    blob.minX +
                    1
                ) *
                scaleX;

            const height =
                (
                    blob.maxY -
                    blob.minY +
                    1
                ) *
                scaleY;


            const centerX =
                blob.centerX *
                scaleX;

            const centerY =
                blob.centerY *
                scaleY;


            overlayContext.strokeStyle =
                "#ff3b30";

            overlayContext.fillStyle =
                "#ff3b30";

            overlayContext.lineWidth =
                4;


            overlayContext.strokeRect(
                left,
                top,
                width,
                height
            );


            overlayContext.beginPath();

            overlayContext.arc(
                centerX,
                centerY,
                8,
                0,
                Math.PI * 2
            );

            overlayContext.fill();


            overlayContext.beginPath();

            overlayContext.moveTo(
                centerX - 20,
                centerY
            );

            overlayContext.lineTo(
                centerX + 20,
                centerY
            );

            overlayContext.moveTo(
                centerX,
                centerY - 20
            );

            overlayContext.lineTo(
                centerX,
                centerY + 20
            );

            overlayContext.stroke();


            overlayContext.font =
                "bold 24px Arial";

            overlayContext.fillText(
                Math.round(
                    confidence *
                    100
                ) +
                "%",
                left,
                Math.max(
                    28,
                    top - 10
                )
            );
        }


        // =====================================================
        // BACKGROUND CAPTURE
        // =====================================================

        captureButton.addEventListener(
            "click",
            () => {

                if (!prepareCanvas()) {

                    statusDisplay.textContent =
                        "Start camera first";

                    return;
                }


                drawDisplayedFrame();


                backgroundImage =
                    analysisContext.getImageData(
                        0,
                        0,
                        analysisCanvas.width,
                        analysisCanvas.height
                    );


                backgroundGray =
                    makeGray(
                        backgroundImage
                    );
                backgroundViewSignature=cameraViewSignature();


                previousBlob = null;
                previewTracks=[];
                previewFramesAnalyzed=0;
                occupancyReadout.textContent="Empty background captured. Start preview to test droplets.";

                statusDisplay.textContent =
                    "Background captured";


                detectedDisplay.textContent =
                    "NO";

                xDisplay.textContent =
                    "--";

                yDisplay.textContent =
                    "--";

                areaDisplay.textContent =
                    "--";

                confidenceDisplay.textContent =
                    "--";


                drawOverlay(
                    null,
                    0
                );

                ewodDebugReference(); // EWOD V4.8 refresh saved reference image
                const savedAutomatically=persistCapturedEmptyReference();
                statusDisplay.textContent=savedAutomatically
                    ? "Background captured and saved automatically"
                    : "Background captured in memory (automatic save unavailable)";
            }
        );


        // =====================================================
        // VISION TOGGLE
        // =====================================================

        toggleButton.addEventListener(
            "click",
            () => {

                if (!backgroundImage) {
                    statusDisplay.textContent="Capture empty chip first";
                    return;
                }
                if(!window.ewodCalibrationReady || typeof window.ewodProject!=="function") {
                    statusDisplay.textContent="Complete 8-point calibration and pass Precision Align + Check first.";
                    return;
                }
                if(roiEditMode) {statusDisplay.textContent="Save or cancel ROI edit first.";return;}

                visionEnabled =
                    !visionEnabled;


                toggleButton.textContent =
                    visionEnabled
                        ? "Vision OFF"
                        : "Vision ON";


                statusDisplay.textContent =
                    visionEnabled
                        ? "Tracking droplet"
                        : "Vision paused";


                if (!visionEnabled) {

                    previousBlob = null;

                    drawOverlay(
                        null,
                        0
                    );
                }
            }
        );


        // =====================================================

        // Read-only preview does not change ewodCalibrationReady and never
        // exposes a positive detection through the automation-facing state.
        previewButton = document.getElementById("ewod-preview-vision");
        previewButton?.addEventListener("click", () => {
            if(visionPreviewMode) {
                visionPreviewMode=false;
                visionEnabled=false;
                previewButton.textContent="Preview Detection (No Actuation)";
                toggleButton.disabled=false;
                previousBlob=null;
                window.ewodVisionPreviewResult=null;
                window.ewodVisionState={detected:false,previewOnly:true,reason:"Read-only preview stopped"};
                drawOverlay(null,0);
                statusDisplay.textContent="Preview stopped. Precision check is still required for verified tracking.";
                return;
            }
            if(visionEnabled) {
                statusDisplay.textContent="Turn Vision OFF before starting the read-only preview.";
                return;
            }
            if(roiEditMode) {
                statusDisplay.textContent="Save or cancel ROI adjustment first.";
                return;
            }
            if(!backgroundImage || !backgroundViewSignature ||
               !viewMatches(backgroundViewSignature,cameraViewSignature())) {
                statusDisplay.textContent="Capture an EMPTY chip reference for this exact camera view first.";
                return;
            }
            if(roiSavedSignature && !viewMatches(roiSavedSignature,cameraViewSignature())) {
                roiMessage.textContent="ROI view differs: select Adjust Yellow ROI, then Save ROI.";
                statusDisplay.textContent="Save the ROI for this camera view and capture the empty chip again.";
                return;
            }
            if(typeof window.ewodProject!=="function" || !Array.isArray(window.ewodHomography)) {
                statusDisplay.textContent="Restore the saved magenta overlay before starting preview.";
                return;
            }
            visionPreviewMode=true;
            visionEnabled=true;
            previousBlob=null;
            previewTracks=[];
            ewodV49Tracks=[];
            previewFramesAnalyzed=0;
            occupancyReadout.textContent="ANALYZING — scanning all electrodes and checking potential droplet shapes over 18 processed frames. Red markers will appear only for stable, plausible regions.";
            toggleButton.disabled=true;
            previewButton.textContent="Stop Preview";
            window.ewodVisionState={detected:false,previewOnly:true,reason:"Unverified read-only preview"};
            statusDisplay.textContent="UNVERIFIED PREVIEW (NO ACTUATION): empty chip should show Droplet NO.";
        });

        // =====================================================
        // VISION V4: ELECTRODE-AWARE SCORING
        // =====================================================


// V4.2: score actual electrode interior pixels using the VERIFIED
// homography. The ROI limits search; it never defines electrode geometry.
let scoreMaskCache=null;
function insidePolygon(x,y,poly) {
    let inside=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
        const a=poly[i],b=poly[j];
        if(((a.y>y)!==(b.y>y)) &&
            (x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x))inside=!inside;
    }
    return inside;
}
function scoreElectrodesV4(differenceMap,width,height,roi,threshold) {
    const paths=window.ewodElectrodePaths;
    const project=window.ewodProject;
    const H=window.ewodHomography;
    if((!window.ewodCalibrationReady && !visionPreviewMode) || !paths?.size ||
        typeof project!=="function" || !Array.isArray(H))return {best:null,second:null};
    const key=JSON.stringify({H,localVersion:window.ewodLocalAlignmentVersion||0,roi,width,height,rawW:video.videoWidth,rawH:video.videoHeight});
    if(scoreMaskCache?.key!==key) {
        const electrodes=[];
        const sx=width/video.videoWidth,sy=height/video.videoHeight;
        for(const [electrodeId,path] of paths.entries()) {
            if(typeof path.getTotalLength!=="function")continue;
            let len=0;
            try {len=path.getTotalLength();} catch(error) {continue;}
            if(!(len>0))continue;
            const samples=Math.max(30,Math.min(140,Math.ceil(len*4)));
            const poly=[];
            for(let i=0;i<samples;i++) {
                const p=path.getPointAtLength(len*i/samples);
                const q=typeof window.ewodProjectElectrode==="function" ? window.ewodProjectElectrode(electrodeId,p.x,p.y) : project(p.x,p.y);
                if(q)poly.push({x:q.x*sx,y:q.y*sy});
            }
            if(poly.length<3)continue;
            const minX=Math.max(roi.left,Math.floor(Math.min(...poly.map(p=>p.x))));
            const maxX=Math.min(roi.right-1,Math.ceil(Math.max(...poly.map(p=>p.x))));
            const minY=Math.max(roi.top,Math.floor(Math.min(...poly.map(p=>p.y))));
            const maxY=Math.min(roi.bottom-1,Math.ceil(Math.max(...poly.map(p=>p.y))));
            if(minX>=maxX || minY>=maxY)continue;
            const pixels=[];
            for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++) {
                if(insidePolygon(x+0.5,y+0.5,poly))pixels.push(y*width+x);
            }
            if(pixels.length<2)continue;
            electrodes.push({electrodeId,channel:path.getAttribute("data-channels")||"",
                pixels,minX,maxX,minY,maxY,centerX:(minX+maxX)/2,centerY:(minY+maxY)/2});
        }
        scoreMaskCache={key,electrodes};
    }
    const candidates=[];
    for(const e of scoreMaskCache.electrodes) {
        let sum=0,changed=0;
        for(const index of e.pixels) {
            const v=differenceMap[index];
            sum+=v;
            if(v>threshold)changed++;
        }
        const count=e.pixels.length;
        const meanDifference=sum/count;
        const changedFraction=changed/count;
        const score=0.60*Math.min(1,meanDifference/45)+
                    0.40*Math.min(1,changedFraction/0.35);
        candidates.push({...e,score,meanDifference,changedFraction,changedCount:changed,
            pixelCount:count,boxWidth:e.maxX-e.minX+1,boxHeight:e.maxY-e.minY+1,
            count:changed,density:changedFraction});
    }
    candidates.sort((a,b)=>b.score-a.score);
    return {best:candidates[0]||null,second:candidates[1]||null};
}

// V4.3 READ-ONLY DIAGNOSTIC: thresholded background differences form
// connected regions. Rank the electrodes by the NUMBER of changed pixels
// covered by each region, not by mean brightness or a centroid alone.
// This is exploratory segmentation; it is not a trained model and the
// detected 'regions' are not yet validated as independent physical droplets.
function connectedPreviewRegions(mask,width,height,roi) {
    const labels=new Int32Array(mask.length);
    labels.fill(-1);
    const regions=[];
    const queue=new Int32Array(mask.length);
    for(let y=roi.top;y<roi.bottom;y++) for(let x=roi.left;x<roi.right;x++) {
        const start=y*width+x;
        if(!mask[start] || labels[start]>=0)continue;
        const id=regions.length;
        let head=0,tail=1;
        queue[0]=start;labels[start]=id;
        let area=0,sumX=0,sumY=0,minX=x,maxX=x,minY=y,maxY=y;
        while(head<tail) {
            const p=queue[head++],py=Math.floor(p/width),px=p-py*width;
            area++;sumX+=px;sumY+=py;
            minX=Math.min(minX,px);maxX=Math.max(maxX,px);
            minY=Math.min(minY,py);maxY=Math.max(maxY,py);
            for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
                if(!dx&&!dy)continue;
                const xx=px+dx,yy=py+dy;
                if(xx<roi.left||xx>=roi.right||yy<roi.top||yy>=roi.bottom)continue;
                const q=yy*width+xx;
                if(mask[q] && labels[q]<0) {labels[q]=id;queue[tail++]=q;}
            }
        }
        regions.push({id,area,centerX:sumX/area,centerY:sumY/area,minX,minY,maxX,maxY});
    }
    return {labels,regions};
}
function rankPreviewCoverage(mask,width,height,roi) {
    const {labels,regions}=connectedPreviewRegions(mask,width,height,roi);
    const valid=new Map(regions.filter(r=>r.area>=4).map(r=>[r.id,{...r,electrodes:[]}]));
    for(const electrode of scoreMaskCache?.electrodes||[]) {
        const counts=new Map();
        for(const idx of electrode.pixels) {
            const cid=labels[idx];
            if(cid>=0&&valid.has(cid))counts.set(cid,(counts.get(cid)||0)+1);
        }
        for(const [cid,count] of counts) {
            if(count<2)continue;
            valid.get(cid).electrodes.push({electrodeId:electrode.electrodeId,
                channel:electrode.channel||"?",pixels:count,
                dropletShare:count/valid.get(cid).area,
                electrodeCoverage:count/electrode.pixels.length});
        }
    }
    return [...valid.values()].filter(r=>r.electrodes.length).map(r=>{
        r.electrodes.sort((a,b)=>b.pixels-a.pixels);
        return r;
    }).sort((a,b)=>b.area-a.area).slice(0,8);
}
// V4.5 read-only candidate filtering. Background differences alone are NOT
// droplets. First remove isolated hot pixels, then reject disconnected changes
// that are line-like, mostly outside electrode masks, or too weak.
// These geometric priors are provisional until validated using known droplets
// and empty-chip negative controls under the same lighting and ITO stack.
function cleanDropletForeground(mask,width,height,roi) {
    const out=new Uint8Array(mask.length);
    for(let y=roi.top+1;y<roi.bottom-1;y++)for(let x=roi.left+1;x<roi.right-1;x++) {
        const i=y*width+x;
        if(!mask[i])continue;
        let adjacent=0;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
            if(dx||dy)adjacent+=mask[i+dy*width+dx]?1:0;
        }
        if(adjacent>=2)out[i]=1;
    }
    return out;
}
function plausibleDropletRegions(regions,roi) {
    const roiW=roi.right-roi.left,roiH=roi.bottom-roi.top;
    return regions.filter(r=>{
        const w=r.maxX-r.minX+1,h=r.maxY-r.minY+1;
        const aspect=Math.max(w/h,h/w);
        const fill=r.area/(w*h);
        const electrodePixels=r.electrodes.reduce((sum,e)=>sum+e.pixels,0);
        // Avoid multi-reservoir lighting bands and long glass reflections.
        // A real droplet that is too small/elongated to pass stays UNCERTAIN.
        return r.area>=PREVIEW_MIN_REGION_PIXELS &&
            w>=3 && h>=3 && aspect<=3.4 && fill>=0.27 &&
            w<roiW*0.42 && h<roiH*0.42 &&
            electrodePixels>=Math.max(6,Math.ceil(r.area*0.50));
    });
}
// Stable read-only localization: a physical droplet is a foreground region,
// which may overlap MULTIPLE channels. Channels are not counted as droplets.
// We average the relative pixel overlap over ~1 second (10 processed frames)
// and suppress weak/transient secondary-channel labels.

// V4.9 experimental footprint estimator. Pure image-array operations, no hardware access.
// This reconstructs possible filled droplets from thresholded *changes*; it is NOT a validated physical mask.
function ewodV49CandidateFootprints(diff,w,h,roi,threshold,electrodes,guardedMask=null) {
    const n=w*h, eligible=new Uint8Array(n), initial=new Uint8Array(n);
    const l=Math.max(1,roi.left),r=Math.min(w-1,roi.right),t=Math.max(1,roi.top),b=Math.min(h-1,roi.bottom);
    // Calibrated polygons give us a small search neighborhood around all mapped electrodes.
    for(const e of electrodes||[])for(const at of e.pixels){
        const y=Math.floor(at/w),x=at-y*w;
        for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
            const xx=x+dx,yy=y+dy;
            if(xx>=l&&xx<r&&yy>=t&&yy<b)eligible[yy*w+xx]=1;
        }
    }
    const edgeThreshold=Math.max(16,Math.round(threshold*0.65));
    for(let y=t;y<b;y++)for(let x=l;x<r;x++){
        const i=y*w+x;
        if(!eligible[i]||diff[i]<edgeThreshold)continue;
        // If optional v4.8 long-edge suppression rejected a strong change, respect it.
        if(guardedMask && diff[i]>threshold && !guardedMask[i])continue;
        initial[i]=1;
    }
    // Suppress isolated pixels, keeping thin droplet rims that have >=2 neighbors.
    const clustered=new Uint8Array(n);
    for(let y=t+1;y<b-1;y++)for(let x=l+1;x<r-1;x++){
        const i=y*w+x;if(!initial[i])continue;
        let near=0;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
            if(!dy&&!dx)continue;
            if(initial[i+dy*w+dx])near++;
        }
        if(near>=2)clustered[i]=1;
    }
    // A 3x3 morphological CLOSE joins fragmented curved rims; interior holes are filled below.
    const dilated=new Uint8Array(n),closed=new Uint8Array(n);
    for(let y=t+1;y<b-1;y++)for(let x=l+1;x<r-1;x++){
        let any=false;
        for(let dy=-1;dy<=1&&!any;dy++)for(let dx=-1;dx<=1;dx++){
            if(clustered[(y+dy)*w+x+dx]){any=true;break;}
        }
        if(any)dilated[y*w+x]=1;
    }
    for(let y=t+2;y<b-2;y++)for(let x=l+2;x<r-2;x++){
        let all=true;
        for(let dy=-1;dy<=1&&all;dy++)for(let dx=-1;dx<=1;dx++){
            if(!dilated[(y+dy)*w+x+dx]){all=false;break;}
        }
        if(all)closed[y*w+x]=1;
    }
    // Fill holes enclosed by changed-pixel rims, but only inside each small connected component.
    const {regions:rough}=connectedPreviewRegions(closed,w,h,roi);
    const filled=new Uint8Array(closed);
    for(const shape of rough){
        if(shape.area<4)continue;
        const x0=Math.max(l,shape.minX-1),x1=Math.min(r-1,shape.maxX+1);
        const y0=Math.max(t,shape.minY-1),y1=Math.min(b-1,shape.maxY+1);
        if((x1-x0+1)*(y1-y0+1)>Math.floor((r-l)*(b-t)*0.15))continue;
        const outside=new Uint8Array((x1-x0+1)*(y1-y0+1));
        const bw=x1-x0+1,queue=new Int32Array(bw*(y1-y0+1));let head=0,tail=0;
        const add=(xx,yy)=>{
            const j=(yy-y0)*bw+(xx-x0),i=yy*w+xx;
            if(!outside[j]&&!closed[i]){outside[j]=1;queue[tail++]=i;}
        };
        for(let xx=x0;xx<=x1;xx++){add(xx,y0);add(xx,y1);}
        for(let yy=y0;yy<=y1;yy++){add(x0,yy);add(x1,yy);}
        while(head<tail){
            const i=queue[head++],yy=Math.floor(i/w),xx=i-yy*w;
            if(xx>x0)add(xx-1,yy);if(xx<x1)add(xx+1,yy);
            if(yy>y0)add(xx,yy-1);if(yy<y1)add(xx,yy+1);
        }
        for(let yy=shape.minY;yy<=shape.maxY;yy++)for(let xx=shape.minX;xx<=shape.maxX;xx++){
            const i=yy*w+xx,j=(yy-y0)*bw+(xx-x0);
            if(!outside[j])filled[i]=1;
        }
    }
    const {labels,regions:all}=connectedPreviewRegions(filled,w,h,roi);
    const possible=all.filter(q=>{
        const ww=q.maxX-q.minX+1,hh=q.maxY-q.minY+1;
        return q.area>=9&&ww>=3&&hh>=3&&Math.max(ww/hh,hh/ww)<=3.5&&
            q.area/(ww*hh)>=0.30&&q.area<Math.max(20,(r-l)*(b-t)*0.12);
    }).map(q=>({...q,electrodes:[],strongPixels:0}));
    const byId=new Map(possible.map(q=>[q.id,q]));
    for(let y=t;y<b;y++)for(let x=l;x<r;x++){
        const i=y*w+x,region=byId.get(labels[i]);
        if(region&&diff[i]>=threshold)region.strongPixels++;
    }
    for(const e of electrodes||[]){
        const counts=new Map();
        for(const i of e.pixels){
            const k=labels[i];if(k>=0&&byId.has(k))counts.set(k,(counts.get(k)||0)+1);
        }
        for(const [k,count] of counts){
            if(count<2)continue;
            byId.get(k).electrodes.push({electrodeId:e.electrodeId,channel:e.channel||'?',pixels:count,
                electrodeCoverage:count/e.pixels.length});
        }
    }
    const accepted=possible.filter(q=>{
        const coverage=q.electrodes.reduce((sum,e)=>sum+e.pixels,0);
        return q.strongPixels>=2 && coverage>=Math.max(4,Math.ceil(q.area*0.35));
    }).map(q=>{
        const total=q.electrodes.reduce((sum,e)=>sum+e.pixels,0);
        q.electrodes=q.electrodes.map(e=>({...e,dropletShare:e.pixels/total}))
            .sort((a,b)=>b.pixels-a.pixels);
        return q;
    }).sort((a,b)=>b.area-a.area).slice(0,8);
    const chosen=new Set(accepted.map(q=>q.id));
    const mask=new Uint8Array(n);
    for(let i=0;i<n;i++)if(chosen.has(labels[i]))mask[i]=255;
    return {regions:accepted,mask,edgeThreshold,threshold};
}

// V4.9 — keep a tentative observation for up to three missed processed frames.
// Tracking and channel hysteresis stay read-only. No DropBot commands are generated.
let ewodV49Tracks=[];
function ewodV49UpdateTracks(regions){
    const remaining=new Set(ewodV49Tracks),out=[];
    for(const region of regions){
        const px=new Map();
        for(const e of region.electrodes){
            if(e.channel==null||e.channel==='?')continue;
            const ch=String(e.channel);px.set(ch,(px.get(ch)||0)+e.pixels);
        }
        const sum=[...px.values()].reduce((a,b)=>a+b,0);
        if(sum<=0)continue;
        const sample=[...px].map(([channel,pixels])=>({channel,fraction:pixels/sum}));
        let prev=null,best=Infinity;
        for(const track of remaining){
            const d=Math.hypot(region.centerX-track.centerX,region.centerY-track.centerY);
            if(d<14&&d<best){prev=track;best=d;}
        }
        if(prev)remaining.delete(prev);
        const first=sample.reduce((a,b)=>a.fraction>=b.fraction?a:b);
        const track=prev||{id:nextPreviewTrackId++,frames:0,missed:0,channel:first.channel,
            pending:null,pendingFrames:0,history:[]};
        track.frames++;track.missed=0;
        track.centerX=prev?0.65*track.centerX+0.35*region.centerX:region.centerX;
        track.centerY=prev?0.65*track.centerY+0.35*region.centerY:region.centerY;
        track.region={...region,centerX:track.centerX,centerY:track.centerY};
        track.history.push(sample);
        if(track.history.length>12)track.history.shift();
        const ranked=stableChannelVotes(track);
        const preferred=ranked[0];
        const current=ranked.find(e=>e.channel===track.channel);
        if(preferred && preferred.channel!==track.channel &&
           (!current||preferred.share>current.share*1.20)){
            track.pendingFrames=track.pending===preferred.channel?track.pendingFrames+1:1;
            track.pending=preferred.channel;
            if(track.pendingFrames>=3){track.channel=preferred.channel;track.pendingFrames=0;track.pending=null;}
        }else{track.pending=null;track.pendingFrames=0;}
        track.rankedChannels=ranked;
        out.push(track);
    }
    for(const old of remaining){
        old.missed=(old.missed||0)+1;
        if(old.missed<=3)out.push(old);
    }
    ewodV49Tracks=out;
    return out;
}


const PREVIEW_SETTLE_FRAMES=18; // require repeated evidence before showing markers
const PREVIEW_HISTORY_FRAMES=12;
const PREVIEW_MIN_REGION_PIXELS=12;
const PREVIEW_MIN_CHANNEL_SHARE=0.18;  // of pixels overlapping mapped electrodes
const PREVIEW_CHANNEL_SUPPORT=0.5;    // fraction of recent frames with the channel

function stableChannelVotes(track) {
    const weights=new Map(),supports=new Map();
    const n=track.history.length;
    for(const sample of track.history) {
        for(const e of sample) {
            weights.set(e.channel,(weights.get(e.channel)||0)+e.fraction);
            supports.set(e.channel,(supports.get(e.channel)||0)+1);
        }
    }
    return [...weights].map(([channel,sum])=>({
        channel,share:sum/n,support:(supports.get(channel)||0)/n
    })).sort((a,b)=>b.share-a.share);
}
function updatePreviewTracks(regions) {
    const unused=new Set(previewTracks),updated=[];
    for(const region of regions) {
        // A four-pixel optical artifact is not sufficient evidence of a droplet.
        // These are conservative provisional pixel thresholds, not a validated
        // minimum physical droplet volume.
        if(region.area<PREVIEW_MIN_REGION_PIXELS)continue;
        const channelPixels=new Map();
        for(const e of region.electrodes) {
            if(e.channel==="?" || e.channel==null)continue;
            const channel=String(e.channel);
            channelPixels.set(channel,(channelPixels.get(channel)||0)+e.pixels);
        }
        const total=[...channelPixels.values()].reduce((a,b)=>a+b,0);
        if(total<Math.max(4,Math.ceil(region.area*0.22)))continue;
        let previous=null,bestDist=Infinity;
        for(const track of unused) {
            const d=Math.hypot(region.centerX-track.centerX,region.centerY-track.centerY);
            if(d<18&&d<bestDist){previous=track;bestDist=d;}
        }
        if(previous)unused.delete(previous);
        const sample=[...channelPixels].map(([channel,pixels])=>({channel,fraction:pixels/total}));
        const top=sample.reduce((a,b)=>a.fraction>=b.fraction?a:b);
        const track=previous||{id:nextPreviewTrackId++,frames:0,
            channel:top.channel,pending:null,pendingFrames:0,history:[]};
        track.frames++;
        track.history.push(sample);
        if(track.history.length>PREVIEW_HISTORY_FRAMES)track.history.shift();
        const ranked=stableChannelVotes(track);
        const preferred=ranked[0];
        const existing=ranked.find(e=>e.channel===track.channel);
        // Change the primary label only after a sustained 15% improvement.
        if(preferred&&preferred.channel!==track.channel) {
            const clearlyBetter=!existing||preferred.share>existing.share*1.15;
            if(clearlyBetter) {
                track.pendingFrames=track.pending===preferred.channel?track.pendingFrames+1:1;
                track.pending=preferred.channel;
                if(track.pendingFrames>=3) {
                    track.channel=preferred.channel;track.pending=null;track.pendingFrames=0;
                }
            } else {track.pending=null;track.pendingFrames=0;}
        } else {track.pending=null;track.pendingFrames=0;}
        track.rankedChannels=ranked;
        track.centerX=region.centerX;track.centerY=region.centerY;
        track.region=region;
        updated.push(track);
    }
    previewTracks=updated;
    return updated;
}
function channelsForStableTrack(track) {
    const ranked=track.rankedChannels||[];
    const primary=ranked.find(e=>e.channel===track.channel)||ranked[0];
    if(!primary)return [];
    const secondary=ranked.filter(e=>e.channel!==primary.channel&&
        e.share>=PREVIEW_MIN_CHANNEL_SHARE&&e.support>=PREVIEW_CHANNEL_SUPPORT);
    return [primary,...secondary];
}
function renderReadOnlyOccupancy(mask,width,height,roi,alignment,differenceMap,threshold) {
    previewFramesAnalyzed++;
    const useFootprints=Boolean(ewodV49Toggle.checked&&differenceMap&&scoreMaskCache?.electrodes?.length);
    const v49=useFootprints?ewodV49CandidateFootprints(
        differenceMap,width,height,roi,threshold,scoreMaskCache.electrodes,
        ewodEdgeGuard.checked?mask:null):null;
    const cleaned=useFootprints?null:cleanDropletForeground(mask,width,height,roi);
    const regions=useFootprints?v49.regions:
        plausibleDropletRegions(rankPreviewCoverage(cleaned,width,height,roi),roi);
    if(ewodDebugOpen()){
        if(v49){
            ewodDebugSet('footprint',ewodDebugGrayMap(v49.mask,width,height,'mask'));
            ewodV49Status.textContent=`Footprint regions: ${v49.regions.length}; low-contrast rim threshold ${v49.edgeThreshold}; primary/secondary based on estimated filled area. Unverified.`;
        }else if(!ewodV49Toggle.checked){
            ewodV49Status.textContent='OFF: original V4.7 droplet detection is unchanged.';
        }
    }
    const allTracks=useFootprints?ewodV49UpdateTracks(regions):updatePreviewTracks(regions);
    const stableTracks=allTracks.filter(t=>t.frames>=(useFootprints?6:PREVIEW_SETTLE_FRAMES) && (!useFootprints||t.missed<=3));
    // Draw ROI every frame, but red markers only after analysis is complete.
    drawOverlay(null,0);
    window.ewodVisionState={detected:false,previewOnly:true,
        reason:"Unverified read-only droplet analysis",timestamp:performance.now()};
    const frames=Math.min(previewFramesAnalyzed,PREVIEW_SETTLE_FRAMES);
    if(previewFramesAnalyzed<PREVIEW_SETTLE_FRAMES) {
        detectedDisplay.textContent="ANALYZING";
        xDisplay.textContent=yDisplay.textContent=areaDisplay.textContent=confidenceDisplay.textContent="--";
        occupancyReadout.textContent=`ANALYZING ${frames}/${PREVIEW_SETTLE_FRAMES} frames — checking all calibrated electrodes and filtering image changes. No markers until analysis completes.`;
        statusDisplay.textContent="UNVERIFIED PREVIEW (NO ACTUATION): analyzing…";
        window.ewodVisionPreviewResult={detected:false,analyzing:true,regions:[],readOnly:true,unverified:true};
        return;
    }
    if(!stableTracks.length) {
        detectedDisplay.textContent="NO";
        xDisplay.textContent=yDisplay.textContent=areaDisplay.textContent=confidenceDisplay.textContent="--";
        occupancyReadout.textContent="Analysis complete: no sufficiently stable, droplet-shaped region was recognized. Try improved droplet contrast or investigate reflections; do not treat this as proof of an empty chip.";
        statusDisplay.textContent="UNVERIFIED PREVIEW (NO ACTUATION): no reliable droplet candidate; no red marker shown.";
        window.ewodVisionPreviewResult={detected:false,analyzing:false,regions:[],readOnly:true,unverified:true};
        return;
    }
    // Each coherent foreground region is ONE tentative droplet, even if its
    // overlap covers several calibrated channels. A red mark is placed ONCE.
    stableTracks.sort((a,b)=>b.region.area-a.region.area);
    const main=stableTracks[0].region;
    const sx=video.videoWidth/width,sy=video.videoHeight/height;
    detectedDisplay.textContent="YES";
    xDisplay.textContent=Math.round(main.centerX*sx);
    yDisplay.textContent=Math.round(main.centerY*sy);
    areaDisplay.textContent=String(main.area);
    confidenceDisplay.textContent="--"; // No statistically calibrated droplet confidence.
    const output=[],reported=[];
    const scaleX=overlay.width/width,scaleY=overlay.height/height;
    overlayContext.save();
    overlayContext.strokeStyle="#ff2d2d";
    overlayContext.fillStyle="#ff2d2d";
    overlayContext.lineWidth=3;
    stableTracks.forEach((track,i)=>{
        const r=track.region;
        const channels=channelsForStableTrack(track);
        if(!channels.length)return;
        const primary=channels[0];
        const secondary=channels.slice(1);
        const title=secondary.length
            ? `Droplet ${i+1}: primary channel ${primary.channel}; also ${secondary.map(e=>e.channel).join(", ")}`
            : `Droplet ${i+1}: channel ${primary.channel}`;
        const shares=channels.map(c=>`ch ${c.channel} ${Math.round(100*c.share)}%`).join(" · ");
        const electrodeCoverages=channels.map(c=>{
            const electrode=r.electrodes.find(e=>String(e.channel)===c.channel);
            return `ch ${c.channel} ${electrode?Math.round(100*electrode.electrodeCoverage):'?'}%`;
        }).join(' · ');
        output.push(useFootprints?
            `${title} | estimated droplet-footprint distribution: ${shares} | electrode occupancy: ${electrodeCoverages} | footprint ${r.area} px (UNVERIFIED)`:
            `${title} | estimated changed-pixel overlap: ${shares} | region ${r.area} px`);
        reported.push({trackId:track.id,channel:primary.channel,
            channels:channels.map(c=>({channel:c.channel,estimatedShare:c.share})),
            x:Math.round(r.centerX*sx),y:Math.round(r.centerY*sy),areaPixels:r.area});
        const x=r.centerX*scaleX,y=r.centerY*scaleY;
        // One unmistakable RED target per stable, plausible foreground region.
        overlayContext.beginPath();
        overlayContext.arc(x,y,10,0,2*Math.PI);
        overlayContext.stroke();
        overlayContext.beginPath();
        overlayContext.arc(x,y,3,0,2*Math.PI);
        overlayContext.fill();
        overlayContext.beginPath();
        overlayContext.moveTo(x-15,y);overlayContext.lineTo(x-6,y);
        overlayContext.moveTo(x+6,y);overlayContext.lineTo(x+15,y);
        overlayContext.moveTo(x,y-15);overlayContext.lineTo(x,y-6);
        overlayContext.moveTo(x,y+6);overlayContext.lineTo(x,y+15);
        overlayContext.stroke();
        // Draw the DropBot channel number next to each target, not internal SVG
        // electrode IDs. Include secondary channels only if their estimated
        // overlap is meaningful and stable (channelsForStableTrack above).
        const channelLabel=secondary.length
            ? `ch ${primary.channel} + ${secondary.map(c=>c.channel).join(',')}`
            : `ch ${primary.channel}`;
        overlayContext.font='bold 17px sans-serif';
        overlayContext.textAlign='left';
        overlayContext.textBaseline='middle';
        const textWidth=overlayContext.measureText(channelLabel).width;
        const labelX=Math.max(2,Math.min(overlay.width-textWidth-12,x+18));
        const labelY=Math.max(14,Math.min(overlay.height-14,y-22));
        overlayContext.fillStyle='rgba(20,20,20,0.85)';
        overlayContext.fillRect(labelX-4,labelY-12,textWidth+8,24);
        overlayContext.fillStyle='#ffffff';
        overlayContext.fillText(channelLabel,labelX,labelY);
        overlayContext.fillStyle='#ff2d2d';
    });
    overlayContext.restore();
    statusDisplay.textContent=`UNVERIFIED PREVIEW (NO ACTUATION): analysis complete; ${reported.length} probable droplet candidate(s) marked in red.`;
    occupancyReadout.textContent=output.join(" | ")+
        (useFootprints?" — V4.9 area estimates are reconstructed image pixels, NOT measured volume or validated droplet shapes; no actuation.":
        " — Red marks are heuristic candidates, not validated droplet identities. Test against known occupied and empty positions; changed-pixel overlap is not volume.");
    window.ewodVisionPreviewResult={detected:reported.length>0,
        unverified:true,readOnly:true,regions:reported,alignment,
        timestamp:performance.now()};
}

        // PROCESS FRAME
        // =====================================================

        function processFrame(
            timestamp
        ) {

            requestAnimationFrame(
                processFrame
            );


            if (
                !visionEnabled ||
                !backgroundImage
            ) {
                return;
            }
            if(!viewMatches(backgroundViewSignature,cameraViewSignature()) ||
               (!window.ewodCalibrationReady && !visionPreviewMode) || typeof window.ewodProject!=="function") {
                resetDetectionForROI("Camera or alignment changed. Recapture empty chip after verifying calibration.");
                return;
            }


            if (
                timestamp -
                lastProcessTime <
                FRAME_INTERVAL
            ) {
                return;
            }


            lastProcessTime =
                timestamp;


            if (
                video.readyState < 2
            ) {
                return;
            }


            drawDisplayedFrame();


            const currentImage =
                analysisContext.getImageData(
                    0,
                    0,
                    analysisCanvas.width,
                    analysisCanvas.height
                );


            const currentGray =
                makeGray(
                    currentImage
                );


            const alignment =
                estimateAlignment(
                    currentGray
                );


            alignmentDisplay.textContent =
                alignment.dx +
                ", " +
                alignment.dy;


            const width =
                analysisCanvas.width;

            const height =
                analysisCanvas.height;

            const roi =
                getROI();


            const threshold =
                Number(
                    thresholdInput.value
                );


            /*
            Vision V3:
            estimate global illumination difference between
            the empty-chip reference and the current frame.

            The current frame is scaled before pixel-wise
            background subtraction. This reduces false
            detections caused by exposure or brightness drift.
            */

            let backgroundSum = 0;
            let currentSum = 0;
            let illuminationSamples = 0;

            for (
                let y = roi.top;
                y < roi.bottom;
                y += 3
            ) {

                const cy =
                    y +
                    alignment.dy;

                if (
                    cy < 0 ||
                    cy >= height
                ) {
                    continue;
                }

                for (
                    let x = roi.left;
                    x < roi.right;
                    x += 3
                ) {

                    const cx =
                        x +
                        alignment.dx;

                    if (
                        cx < 0 ||
                        cx >= width
                    ) {
                        continue;
                    }

                    const backgroundIndex =
                        y * width + x;

                    const currentIndex =
                        cy * width + cx;

                    backgroundSum +=
                        backgroundGray[
                            backgroundIndex
                        ];

                    currentSum +=
                        currentGray[
                            currentIndex
                        ];

                    illuminationSamples++;
                }
            }

            const backgroundMean =
                illuminationSamples
                    ? backgroundSum /
                      illuminationSamples
                    : 1;

            const currentMean =
                illuminationSamples
                    ? currentSum /
                      illuminationSamples
                    : 1;

            let illuminationGain =
                currentMean > 1
                    ? backgroundMean /
                      currentMean
                    : 1;

            illuminationGain =
                Math.max(
                    0.70,
                    Math.min(
                        1.30,
                        illuminationGain
                    )
                );


            const mask =
                new Uint8Array(
                    width *
                    height
                );

            // V4 keeps the actual normalized difference
            // value for every analysis pixel.
            const differenceMap =
                new Float32Array(
                    width *
                    height
                );


            /*
            Compare aligned live frame against
            empty-chip reference.
            */

            for (
                let y = roi.top;
                y < roi.bottom;
                y++
            ) {

                const cy =
                    y +
                    alignment.dy;


                if (
                    cy < 0 ||
                    cy >= height
                ) {
                    continue;
                }


                for (
                    let x = roi.left;
                    x < roi.right;
                    x++
                ) {

                    const cx =
                        x +
                        alignment.dx;


                    if (
                        cx < 0 ||
                        cx >= width
                    ) {
                        continue;
                    }


                    const backgroundIndex =
                        y *
                        width +
                        x;


                    const currentIndex =
                        cy *
                        width +
                        cx;


                    const normalizedCurrent =
                        Math.max(
                            0,
                            Math.min(
                                255,
                                currentGray[
                                    currentIndex
                                ] *
                                illuminationGain
                            )
                        );

                    const difference =
                        Math.abs(
                            backgroundGray[
                                backgroundIndex
                            ] -
                            normalizedCurrent
                        );


                    differenceMap[
                        backgroundIndex
                    ] = difference;

                    if (
                        difference >
                        threshold
                    ) {

                        mask[
                            backgroundIndex
                        ] = 1;
                    }
                }
            }


            /*
            Vision V4 no longer chooses an arbitrary
            connected-component blob.

            It scores every known EWOD electrode.
            */

            const electrodeResult =
                scoreElectrodesV4(
                    differenceMap,
                    width,
                    height,
                    roi,
                    threshold
                );

            const blob =
                electrodeResult.best;

            const secondElectrode =
                electrodeResult.second;
            // EWOD V4.8 ITO DIAGNOSTICS EXTENSION — start preview hook
            // Keep V4.7's original mask and scores as the baseline.
            // The optional guard affects read-only preview only.
            if(visionPreviewMode){
                const rawMask=new Uint8Array(mask);
                let suppressed=0;
                if(ewodEdgeGuard.checked){
                    const guarded=ewodSuppressLongReferenceEdges(mask,backgroundGray,currentGray,
                        width,height,roi,alignment);
                    mask.set(guarded.mask);suppressed=guarded.suppressed;
                }
                ewodRefreshDebug(currentImage,differenceMap,rawMask,mask,width,height,roi,alignment,suppressed);
            }
            // EWOD V4.8 ITO DIAGNOSTICS EXTENSION — end preview hook


            // Multi-region / multi-electrode diagnostic is deliberately
            // preview-only. Verified tracking and actuation are untouched.
            if(visionPreviewMode) {
                renderReadOnlyOccupancy(mask,width,height,roi,alignment,differenceMap,threshold);
                return;
            }

            /*
            Confidence combines absolute electrode score
            and separation from the second-best electrode.
            */

            let confidence = 0;

            if (blob) {

                const separation =
                    secondElectrode
                        ? Math.max(
                            0,
                            blob.score -
                            secondElectrode.score
                        )
                        : blob.score;

                confidence =
                    Math.min(
                        1,
                        blob.score *
                            0.75 +
                        separation *
                            1.5
                    );
            }


            /*
            Vision V3 temporal persistence.

            A candidate must appear in approximately the
            same position for several consecutive frames.
            This rejects short-lived reflections and noise.
            */

            if (
                blob &&
                confidence >= 0.35
            ) {

                if (persistenceCandidate) {

                    /*
                    V4 persistence is based primarily on
                    electrode identity rather than arbitrary
                    centroid distance.
                    */

                    if (
                        persistenceCandidate.electrodeId ===
                        blob.electrodeId
                    ) {
                        persistenceFrames++;
                    } else {
                        persistenceFrames = 1;
                    }

                } else {

                    persistenceFrames = 1;
                }

                persistenceCandidate = {
                    centerX:
                        blob.centerX,

                    centerY:
                        blob.centerY,

                    electrodeId:
                        blob.electrodeId
                };

            } else {

                persistenceCandidate = null;
                persistenceFrames = 0;
            }


            const persistentDetection =
                blob &&
                confidence >= 0.30 &&
                blob.score >= 0.15 &&
                persistenceFrames >=
                    REQUIRED_PERSISTENCE_FRAMES;


            /*
            Require both confidence and temporal persistence.
            */

            if (
                persistentDetection
            ) {

                /*
                Smooth the centroid slightly so the
                marker does not jitter.
                */

                if (previousBlob) {

                    const alpha =
                        0.35;

                    blob.centerX =
                        previousBlob.centerX *
                            (
                                1 -
                                alpha
                            ) +
                        blob.centerX *
                            alpha;

                    blob.centerY =
                        previousBlob.centerY *
                            (
                                1 -
                                alpha
                            ) +
                        blob.centerY *
                            alpha;
                }


                previousBlob =
                    blob;


                const normalizedX =
                    blob.centerX /
                    width;

                const normalizedY =
                    blob.centerY /
                    height;


                const sourceX =
                    Math.round(
                        normalizedX *
                        video.videoWidth
                    );

                const sourceY =
                    Math.round(
                        normalizedY *
                        video.videoHeight
                    );


                detectedDisplay.textContent =
                    "YES";

                xDisplay.textContent =
                    sourceX;

                yDisplay.textContent =
                    sourceY;

                areaDisplay.textContent =
                    blob.count;

                confidenceDisplay.textContent =
                    Math.round(
                        confidence *
                        100
                    ) +
                    "%";

                const secondaryText =
                    secondElectrode
                        ? " | secondary " +
                          secondElectrode.electrodeId +
                          " / ch " +
                          secondElectrode.channel +
                          " / " +
                          Math.round(
                              secondElectrode.score *
                              100
                          ) +
                          "%"
                        : "";

                const closeScores =
                    secondElectrode &&
                    secondElectrode.score >=
                        blob.score * 0.70;

                statusDisplay.textContent =
                    (
                        closeScores
                            ? "BETWEEN | primary "
                            : "Primary "
                    ) +
                    blob.electrodeId +
                    " / ch " +
                    blob.channel +
                    " / " +
                    Math.round(
                        blob.score *
                        100
                    ) +
                    "%" +
                    secondaryText;


                drawOverlay(
                    blob,
                    confidence
                );


                window.ewodVisionState = {
                    detected: true,

                    x:
                        sourceX,

                    y:
                        sourceY,

                    normalizedX,

                    normalizedY,

                    area:
                        blob.count,

                    confidence,

                    electrodeId:
                        blob.electrodeId,

                    channel:
                        blob.channel,

                    electrodeScore:
                        blob.score,

                    secondaryElectrodeId:
                        secondElectrode
                            ? secondElectrode.electrodeId
                            : null,

                    secondaryChannel:
                        secondElectrode
                            ? secondElectrode.channel
                            : null,

                    secondaryScore:
                        secondElectrode
                            ? secondElectrode.score
                            : null,

                    betweenElectrodes:
                        Boolean(
                            secondElectrode &&
                            secondElectrode.score >=
                                blob.score * 0.70
                        ),

                    meanDifference:
                        blob.meanDifference,

                    changedFraction:
                        blob.changedFraction,

                    alignment,

                    timestamp:
                        performance.now()
                };

            } else {

                detectedDisplay.textContent =
                    "NO";

                xDisplay.textContent =
                    "--";

                yDisplay.textContent =
                    "--";

                areaDisplay.textContent =
                    "--";

                confidenceDisplay.textContent =
                    "--";

                if (
                    blob &&
                    confidence >= 0.35 &&
                    persistenceFrames > 0
                ) {

                    const secondaryText =
                        secondElectrode
                            ? " | second " +
                              secondElectrode.electrodeId +
                              " / ch " +
                              secondElectrode.channel +
                              " / " +
                              Math.round(
                                  secondElectrode.score *
                                  100
                              ) +
                              "%"
                            : "";

                    statusDisplay.textContent =
                        blob.electrodeId +
                        " / ch " +
                        blob.channel +
                        " / " +
                        Math.round(
                            blob.score *
                            100
                        ) +
                        "%" +
                        secondaryText +
                        " | stabilizing " +
                        persistenceFrames +
                        "/" +
                        REQUIRED_PERSISTENCE_FRAMES;

                } else {

                    statusDisplay.textContent =
                        "No confident droplet candidate";
                }


                /*
                We deliberately keep previousBlob for
                a short-term tracking prior.
                */

                drawOverlay(
                    null,
                    0
                );


                window.ewodVisionState = {
                    detected: false,

                    x: null,
                    y: null,

                    normalizedX: null,
                    normalizedY: null,

                    area: 0,

                    confidence: 0,

                    alignment,

                    timestamp:
                        performance.now()
                };
            }

            // Never allow unverified candidates into the normal shared state.
            // The preview result is diagnostic and must not drive actuation.
            if(visionPreviewMode) {
                const tentative=window.ewodVisionState || {detected:false};
                window.ewodVisionPreviewResult={...tentative,unverified:true,readOnly:true};
                window.ewodVisionState={detected:false,previewOnly:true,
                    reason:"Precision check not passed; preview is read-only",
                    timestamp:performance.now()};
                statusDisplay.textContent="UNVERIFIED PREVIEW (NO ACTUATION): "+statusDisplay.textContent;
            }
        }


        requestAnimationFrame(
            processFrame
        );
    }
);


// =========================================================
// DROPBOT CAPACITANCE MEASUREMENT V1
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const hardwarePanel =
            document.querySelector(
                ".hardware-panel"
            );

        if (
            !hardwarePanel ||
            document.getElementById(
                "measure-capacitance"
            )
        ) {
            return;
        }


        const box =
            document.createElement(
                "div"
            );

        box.className =
            "capacitance-panel";

        box.innerHTML = `
            <div class="capacitance-title">
                Capacitance Sensing
            </div>

            <div class="capacitance-description">
                Measures the currently selected
                EWOD electrode channel(s).
            </div>

            <button
                id="measure-capacitance"
                type="button">
                Measure Passive
            </button>

            <button
                id="measure-capacitance-active"
                type="button">
                Measure During Actuation
            </button>

            <div
                id="capacitance-status"
                class="capacitance-status">
                Select an electrode to measure.
            </div>

            <div
                id="capacitance-results">
            </div>
        `;

        hardwarePanel.appendChild(
            box
        );


        const measureButton =
            document.getElementById(
                "measure-capacitance"
            );

        const activeMeasureButton =
            document.getElementById(
                "measure-capacitance-active"
            );

        const status =
            document.getElementById(
                "capacitance-status"
            );

        const results =
            document.getElementById(
                "capacitance-results"
            );


        function getSelectedChannels() {

            const channels =
                new Set();

            document
                .querySelectorAll(
                    `.svg-wrapper svg
                     path[id^="electrode"].selected`
                )
                .forEach(
                    (path) => {

                        const text =
                            path.getAttribute(
                                "data-channels"
                            );

                        if (!text) {
                            return;
                        }

                        text
                            .split(/[,\s]+/)
                            .filter(Boolean)
                            .forEach(
                                (value) => {

                                    const channel =
                                        Number(value);

                                    if (
                                        Number.isInteger(
                                            channel
                                        )
                                    ) {
                                        channels.add(
                                            channel
                                        );
                                    }
                                }
                            );
                    }
                );

            return Array.from(
                channels
            ).sort(
                (a, b) => a - b
            );
        }


        async function measureCapacitance(
            mode
        ) {

                const realtimeMode =
                    document.getElementById(
                        "realtime-mode"
                    );

                if (
                    realtimeMode &&
                    realtimeMode.checked
                ) {
                    status.textContent =
                        "Turn Realtime Mode OFF before measuring capacitance.";

                    return;
                }


                const channels =
                    getSelectedChannels();


                if (!channels.length) {

                    status.textContent =
                        "Select at least one EWOD electrode.";

                    results.innerHTML =
                        "";

                    return;
                }


                measureButton.disabled =
                    true;

                activeMeasureButton.disabled =
                    true;

                status.textContent =
                    "Measuring channel(s): " +
                    channels.join(", ");

                results.innerHTML =
                    "";


                try {

                    const response =
                        await fetch(
                            "/api/dropbot/capacitance",
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        {
                                            channels,
                                            mode,

                                            voltage:
                                                Number(
                                                    document.getElementById(
                                                        "step-voltage"
                                                    ).value
                                                ),

                                            frequency:
                                                Number(
                                                    document.getElementById(
                                                        "step-frequency"
                                                    ).value
                                                )
                                        }
                                    )
                            }
                        );


                    const data =
                        await response.json();


                    if (
                        !response.ok ||
                        !data.ok
                    ) {
                        throw new Error(
                            data.error ||
                            "Measurement failed."
                        );
                    }


                    const rows =
                        data.measurements
                            .map(
                                (item) => `
                                    <tr>
                                        <td>
                                            ${item.channel}
                                        </td>

                                        <td>
                                            ${item.capacitance_pf.toFixed(3)}
                                        </td>

                                        <td>
                                            ${item.capacitance_f.toExponential(4)}
                                        </td>
                                    </tr>
                                `
                            )
                            .join("");


                    results.innerHTML = `
                        <table
                            class="capacitance-table">

                            <thead>
                                <tr>
                                    <th>
                                        Channel
                                    </th>

                                    <th>
                                        Capacitance (pF)
                                    </th>

                                    <th>
                                        Capacitance (F)
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                ${rows}
                            </tbody>

                        </table>
                    `;


                    status.textContent =
                        mode === "active"
                            ? "Active measurement complete. Electrode is OFF."
                            : "Passive measurement complete.";

                } catch (error) {

                    console.error(
                        "Capacitance measurement:",
                        error
                    );

                    status.textContent =
                        "Error: " +
                        error.message;

                } finally {

                    measureButton.disabled =
                        false;

                    activeMeasureButton.disabled =
                        false;
                }
            }


        measureButton.addEventListener(
            "click",
            () => measureCapacitance(
                "passive"
            )
        );


        activeMeasureButton.addEventListener(
            "click",
            () => measureCapacitance(
                "active"
            )
        );
    }
);



// ===============================================================
// MOUSE-ONLY DASHBOARD LAYOUT V4.9 (presentation only)
// Drag the center divider to resize columns. Drag the lower-right
// corner of any panel to resize its width / height inside its column.
// Does not change camera pixels, zoom, ROI, H, SVG, or DropBot commands.
// ===============================================================
document.addEventListener("DOMContentLoaded", () => {
    const main = document.querySelector(".main-layout");
    const left = document.querySelector(".left-column");
    const right = document.querySelector(".right-column");
    if (!main || !left || !right) return;

    const KEY = "ewod.browser.panel-layout.v1";
    const sections = [
        ["DropBot", ".hardware-panel"],
        ["Camera", ".camera-panel"],
        ["Chip", ".chip-panel"],
        ["Protocol", ".protocol-panel"],
        ["Measurements", ".measurements-panel"],
        ["Graph", ".graph-panel"]
    ];
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
    catch (_) { /* Invalid old settings should not break the controller. */ }
    const cameraLeft = saved.cameraLeft === true;
    let leftWidth = Number.isFinite(saved.leftWidth)
        ? Math.max(30, Math.min(70, saved.leftWidth)) : 50;
    const panelHeights = saved.panelHeights && typeof saved.panelHeights === "object"
        ? {...saved.panelHeights} : {};
    const panelWidths = saved.panelWidths && typeof saved.panelWidths === "object"
        ? {...saved.panelWidths} : {};

    // Remove an older toolbar if this script was reinjected without a reload.
    document.querySelectorAll(".ewod-layout-toolbar").forEach(el => el.remove());
    const oldStyle = document.getElementById("ewod-browser-layout-styles");
    if (oldStyle) oldStyle.remove();
    const style = document.createElement("style");
    style.id = "ewod-browser-layout-styles";
    style.textContent = `
        .main-layout.ewod-mouse-layout {
            display:grid!important;
            grid-template-columns:minmax(0,var(--ewod-left-width,50%)) 12px minmax(0,1fr)!important;
            gap:0!important;align-items:start!important;
        }
        .main-layout.ewod-mouse-layout .left-column,
        .main-layout.ewod-mouse-layout .right-column {
            display:flex!important;flex-direction:column;min-width:0;gap:16px;
            grid-row:1;align-items:stretch;
        }
        .main-layout.ewod-mouse-layout .left-column {padding-right:8px;}
        .main-layout.ewod-mouse-layout .right-column {padding-left:8px;}
        .main-layout.ewod-mouse-layout:not(.ewod-camera-on-left) .left-column {grid-column:1;}
        .main-layout.ewod-mouse-layout:not(.ewod-camera-on-left) .right-column {grid-column:3;}
        .main-layout.ewod-mouse-layout.ewod-camera-on-left .right-column {grid-column:1;}
        .main-layout.ewod-mouse-layout.ewod-camera-on-left .left-column {grid-column:3;}
        .main-layout.ewod-mouse-layout #ewod-column-divider {
            grid-column:2;grid-row:1;align-self:stretch;
            position:relative;min-height:250px;cursor:col-resize;
            touch-action:none;user-select:none;border-radius:6px;
            background:transparent;z-index:3;
        }
        .main-layout.ewod-mouse-layout #ewod-column-divider::after {
            content:"";position:absolute;inset:0 5px;
            background:#d0d7e2;border-radius:4px;
        }
        .main-layout.ewod-mouse-layout #ewod-column-divider:hover::after,
        .main-layout.ewod-mouse-layout #ewod-column-divider:focus-visible::after,
        body.ewod-dragging-columns #ewod-column-divider::after {background:#6478ad;}
        body.ewod-dragging-columns {cursor:col-resize!important;user-select:none!important;}
        .main-layout.ewod-mouse-layout .card {
            grid-area:auto!important;grid-column:auto!important;grid-row:auto!important;
            box-sizing:border-box;width:100%;max-width:100%;min-width:0;
            resize:both;overflow:auto;min-height:145px;
        }
        .main-layout.ewod-mouse-layout .camera-panel,
        .main-layout.ewod-mouse-layout .chip-panel {min-height:300px;}
        .main-layout.ewod-mouse-layout .camera-panel .vision-stage,
        .main-layout.ewod-mouse-layout .camera-panel video {max-width:100%;}
        @media(max-width:900px) {
            .main-layout.ewod-mouse-layout {grid-template-columns:minmax(0,1fr)!important;}
            .main-layout.ewod-mouse-layout #ewod-column-divider {display:none;}
            .main-layout.ewod-mouse-layout .left-column,
            .main-layout.ewod-mouse-layout .right-column {
                grid-column:1!important;grid-row:auto!important;padding:0;
            }
            .main-layout.ewod-mouse-layout:not(.ewod-camera-on-left) .left-column {grid-row:1!important;}
            .main-layout.ewod-mouse-layout:not(.ewod-camera-on-left) .right-column {grid-row:2!important;}
            .main-layout.ewod-mouse-layout.ewod-camera-on-left .right-column {grid-row:1!important;}
            .main-layout.ewod-mouse-layout.ewod-camera-on-left .left-column {grid-row:2!important;}
        }
    `;
    document.head.appendChild(style);
    main.classList.remove("ewod-layout-active");
    main.classList.add("ewod-mouse-layout");
    main.classList.toggle("ewod-camera-on-left",cameraLeft);
    main.style.setProperty("--ewod-left-width", `${leftWidth}%`);

    let divider = document.getElementById("ewod-column-divider");
    if (!divider) {
        divider = document.createElement("div");
        divider.id = "ewod-column-divider";
        divider.setAttribute("role", "separator");
        divider.setAttribute("tabindex", "0");
        divider.setAttribute("aria-label", "Drag sideways to resize the two dashboard columns");
        divider.setAttribute("aria-orientation", "vertical");
        main.appendChild(divider);
    }
    const panelNodes = [];
    function persist(){
        try {
            localStorage.setItem(KEY, JSON.stringify({cameraLeft,leftWidth,panelHeights,panelWidths}));
        } catch (err) { console.warn("Could not save panel layout",err); }
    }
    function setColumnWidth(pct){
        leftWidth = Math.max(30, Math.min(70, Math.round(pct)));
        main.style.setProperty("--ewod-left-width", `${leftWidth}%`);
        divider.setAttribute("aria-valuenow", String(leftWidth));
        persist();
    }
    divider.setAttribute("aria-valuemin","30");
    divider.setAttribute("aria-valuemax","70");
    setColumnWidth(leftWidth);
    divider.addEventListener("pointerdown", event => {
        if (event.button !== 0 || window.matchMedia("(max-width:900px)").matches) return;
        event.preventDefault();
        divider.setPointerCapture(event.pointerId);
        document.body.classList.add("ewod-dragging-columns");
    });
    divider.addEventListener("pointermove", event => {
        if (!divider.hasPointerCapture(event.pointerId)) return;
        const bounds = main.getBoundingClientRect();
        if (bounds.width > 100) {
            setColumnWidth(100*(event.clientX - bounds.left)/bounds.width);
        }
    });
    function stopDrag(event){
        if (divider.hasPointerCapture(event.pointerId)) divider.releasePointerCapture(event.pointerId);
        document.body.classList.remove("ewod-dragging-columns");
    }
    divider.addEventListener("pointerup", stopDrag);
    divider.addEventListener("pointercancel", stopDrag);
    divider.addEventListener("keydown", event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            setColumnWidth(leftWidth+(event.key==="ArrowRight"?2:-2));
        }
    });

    for (const [key, selector] of sections) {
        const card = document.querySelector(selector);
        if (!card) continue;
        panelNodes.push([key,card]);
        if (Number.isFinite(panelHeights[key])) {
            card.style.height=`${Math.max(145, Math.min(1800,panelHeights[key]))}px`;
        }
        if (Number.isFinite(panelWidths[key])) {
            card.style.width=`${Math.max(35,Math.min(100,panelWidths[key]))}%`;
        }
        // Native browser resize grip (bottom-right). Keep original titles.
    }
    if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(entries => {
            let changed=false;
            for (const entry of entries) {
                const pair = panelNodes.find(([,node]) => node===entry.target);
                if (!pair) continue;
                const [key,card]=pair;
                const rect=card.getBoundingClientRect();
                // Native CSS resize creates inline pixel width and height.
                if (card.style.height) {
                    const h=Math.round(rect.height);
                    if (h>=140 && panelHeights[key]!==h) {
                        panelHeights[key]=h; changed=true;
                    }
                }
                if (card.style.width) {
                    const pw=card.parentElement.getBoundingClientRect().width;
                    if (pw>0) {
                        const pct=Math.max(35,Math.min(100,Math.round(rect.width/pw*100)));
                        if(panelWidths[key]!==pct){panelWidths[key]=pct;changed=true;}
                    }
                }
            }
            if(changed) persist();
        });
        for (const [,card] of panelNodes) observer.observe(card);
    }
});

// ============================================================================
// EWOD V4.10 — ISOLATED HIGH-RESOLUTION ITO DIAGNOSTIC (READ ONLY)
// Added after the unchanged legacy controller. Does NOT change V4.7–V4.9,
// calibration, saved magenta, ROI, localStorage empty-chip reference, or DropBot.
// Every result is tentative and MUST NOT be used to drive hardware.
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  const panel = document.querySelector('.camera-panel');
  const video = document.getElementById('camera-feed');
  if (!panel || !video || document.getElementById('ewod-v410-panel')) return;

  const box = document.createElement('details');
  box.id = 'ewod-v410-panel';
  box.style.cssText = 'margin:10px 0;padding:10px;border:1px solid #818cf8;border-radius:8px;background:#f8fafc;';
  box.innerHTML = `
    <summary style="cursor:pointer;font-weight:700;">Experimental V4.10 — High-resolution ITO detection (NO ACTUATION)</summary>
    <p style="font-size:12px;line-height:1.5;margin:8px 0;">Independent read-only comparison. Your existing empty background, ROI and magenta calibration are not overwritten. The V4.10 reference lives only in this page until refresh. Results are <strong>unverified candidates</strong>.</p>
    <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin:9px 0;">
      <label>Analysis width
        <select id="ewod-v410-width" style="padding:4px;">
          <option value="320">320 × 180 (baseline size)</option>
          <option value="640">640 × 360</option>
          <option value="960">960 × 540</option>
          <option value="1280">1280 × 720</option>
          <option value="1920" selected>1920 × 1080 (native maximum)</option>
        </select>
      </label>
      <label>Pixel difference threshold <input id="ewod-v410-threshold" type="range" min="8" max="80" value="30" step="1"></label>
      <strong id="ewod-v410-threshold-text">30</strong>
      <label><input type="checkbox" id="ewod-v410-rgb" checked> Include RGB contrast</label>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;">
      <button type="button" id="ewod-v410-capture">Capture V4.10 EMPTY with ITO</button>
      <button type="button" id="ewod-v410-start">Start V4.10 Preview</button>
      <button type="button" id="ewod-v410-stop" disabled>Stop V4.10 Preview</button>
      <button type="button" id="ewod-v410-export" disabled>Save V4.10 Diagnostics</button>
    </div>
    <div id="ewod-v410-status" role="status" style="font-size:12px;padding:8px;border-radius:5px;background:#e2e8f0;line-height:1.5;">Stop the old Preview Detection first. Empty and clean the chip with the ITO fixed in place; capture the experimental empty reference.</div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0;">
      <div><strong style="font-size:11px;">V4.10 empty reference</strong><canvas id="ewod-v410-empty" style="width:100%;display:block;border:1px solid #cbd5e1"></canvas></div>
      <div><strong style="font-size:11px;">Current live</strong><canvas id="ewod-v410-live" style="width:100%;display:block;border:1px solid #cbd5e1"></canvas></div>
      <div><strong style="font-size:11px;">Difference (4× for visualization)</strong><canvas id="ewod-v410-diff" style="width:100%;display:block;border:1px solid #cbd5e1"></canvas></div>
      <div><strong style="font-size:11px;">Accepted regions (white); changed pixels (gray)</strong><canvas id="ewod-v410-mask" style="width:100%;display:block;border:1px solid #cbd5e1"></canvas></div>
    </div>
    <small style="display:block;font-size:11px;">The image-processing model is experimental, not trained or validated. V4.10 never writes to the automation-facing vision state and never sends DropBot commands. Moving the ITO/camera or changing lighting invalidates this comparison.</small>`;
  panel.appendChild(box);

  const el = name => box.querySelector('#ewod-v410-' + name);
  const status = el('status');
  const widthSelect = el('width');
  const thresholdSlider = el('threshold');
  const rgbCheck = el('rgb');
  const PROCESS_INTERVAL_MS = 900; // Throttle the native 2MP JavaScript analysis.
  const previewWidth = 320;
  const sourceCanvas = document.createElement('canvas');
  const sourceCtx = sourceCanvas.getContext('2d', {willReadFrequently: true});
  const referenceCanvas = document.createElement('canvas');
  const referenceCtx = referenceCanvas.getContext('2d');
  let reference = null; // In memory ONLY (not localStorage; legacy reference preserved).
  let referenceGray = null;
  let signature = null;
  let running = false;
  let timer = null;
  let lastResult = null;
  let overlay = null;

  const display = message => {status.textContent = message;};
  const getWidth = () => Math.min(Number(widthSelect.value), video.videoWidth || 0);
  const getHeight = w => Math.round(w * video.videoHeight / Math.max(video.videoWidth, 1));
  const getSignature = () => {
    const track = video.srcObject?.getVideoTracks?.()[0];
    const settings = track?.getSettings?.() || {};
    const zoom = Number(document.getElementById('camera-zoom')?.value || 1);
    const roiStr = localStorage.getItem('ewod.vision.roi.v2') || '';
    return JSON.stringify({deviceId:settings.deviceId || '', videoW:video.videoWidth,
      videoH:video.videoHeight, analysisW:getWidth(), zoom, roi:roiStr});
  };
  function roiBounds(w,h) {
    let r={left:0.17,right:0.75,top:0.17,bottom:0.84};
    try {
      const obj=JSON.parse(localStorage.getItem('ewod.vision.roi.v2')||'null');
      if (obj?.roi) r=obj.roi;
    } catch (_) { /* Use fallback ROI. */ }
    return {left:Math.max(1,Math.floor(w*Math.max(0,Number(r.left)))),
      right:Math.min(w-1,Math.ceil(w*Math.min(1,Number(r.right)))),
      top:Math.max(1,Math.floor(h*Math.max(0,Number(r.top)))),
      bottom:Math.min(h-1,Math.ceil(h*Math.min(1,Number(r.bottom))))};
  }
  function prepare() {
    if (!video.videoWidth || video.readyState < 2) {
      display('Start the camera and wait until a live image is visible.');return false;
    }
    const zoom = Number(document.getElementById('camera-zoom')?.value || 1);
    if (Math.abs(zoom-1)>0.005) {
      display('V4.10 requires camera zoom 1.0× to preserve direct pixel coordinates. Stop and return to 1.0×.');return false;
    }
    sourceCanvas.width=getWidth();sourceCanvas.height=getHeight(sourceCanvas.width);
    return true;
  }
  const grab = () => {
    sourceCtx.drawImage(video,0,0,sourceCanvas.width,sourceCanvas.height);
    return sourceCtx.getImageData(0,0,sourceCanvas.width,sourceCanvas.height);
  };
  const grayOf = data => {
    const n=data.length/4, gray=new Uint8Array(n);
    for (let i=0,p=0;i<n;i++,p+=4) gray[i]=Math.round(0.299*data[p]+0.587*data[p+1]+0.114*data[p+2]);
    return gray;
  };
  function drawPreview(name, source) {
    const c=el(name), targetH=Math.round(previewWidth*source.height/source.width);
    c.width=previewWidth;c.height=targetH;
    c.getContext('2d').drawImage(source,0,0,c.width,c.height);
  }
  function debugArray(name, arr, w, h, amplified=false) {
    const c=el(name),ph=Math.round(previewWidth*h/w);
    c.width=previewWidth;c.height=ph;
    const rgba=new Uint8ClampedArray(previewWidth*ph*4);
    for(let y=0;y<ph;y++) for(let x=0;x<previewWidth;x++) {
      const src=Math.min(h-1,Math.floor(y*h/ph))*w+Math.min(w-1,Math.floor(x*w/previewWidth));
      const dst=4*(y*previewWidth+x);
      const val=Math.min(255,amplified?arr[src]*4:arr[src]);
      rgba[dst]=rgba[dst+1]=rgba[dst+2]=val;rgba[dst+3]=255;
    }
    c.getContext('2d').putImageData(new ImageData(rgba,previewWidth,ph),0,0);
  }
  function stop() {
    running=false;if(timer!==null){clearTimeout(timer);timer=null;}
    el('start').disabled=false;el('stop').disabled=true;
    if(overlay) overlay.getContext('2d').clearRect(0,0,overlay.width,overlay.height);
  }
  function ensureOverlay() {
    const stage=video.closest('.vision-stage');
    if(!stage) return null;
    if(!overlay || overlay.parentElement!==stage) {
      overlay=document.createElement('canvas');overlay.id='ewod-v410-overlay';
      overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:70;pointer-events:none;';
      stage.appendChild(overlay);
    }
    overlay.width=video.videoWidth;overlay.height=video.videoHeight;
    return overlay;
  }
  // For read-only channel estimates, use the exact saved homography and SVG paths.
  let projectionCache=null;
  function projectChannels() {
    const calibrationKey=JSON.stringify({H:window.ewodHomography,localVersion:window.ewodLocalAlignmentVersion||0});
    if(projectionCache?.key===calibrationKey)return projectionCache.paths;
    if(typeof window.ewodProject!=='function' || !window.ewodElectrodePaths?.size) return [];
    const result=[];
    for(const [id,path] of window.ewodElectrodePaths.entries()) {
      if(typeof path.getTotalLength!=='function') continue;
      let length;try{length=path.getTotalLength();}catch(_){continue;}
      if(!(length>0))continue;
      const pts=[],n=Math.min(120,Math.max(40,Math.ceil(length*2)));
      for(let j=0;j<n;j++){
        const p=path.getPointAtLength(length*j/n);
        const q=typeof window.ewodProjectElectrode==='function'
          ? window.ewodProjectElectrode(id,p.x,p.y) : window.ewodProject(p.x,p.y);
        if(q && Number.isFinite(q.x) && Number.isFinite(q.y)) pts.push(q);
      }
      if(pts.length<3)continue;
      const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
      result.push({id,channel:path.getAttribute('data-channels')||'?',poly:pts,
        minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)});
    }
    projectionCache={key:calibrationKey,paths:result};
    return result;
  }
  const inside = (x,y,poly) => {
    let result=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
      const a=poly[i],b=poly[j];
      if(((a.y>y)!==(b.y>y)) && x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x) result=!result;
    }
    return result;
  };
  function assignChannels(region, pathPolys, sx, sy, w) {
    const hits=[];
    for(const e of pathPolys){
      if(e.maxX<region.minX*sx || e.minX>region.maxX*sx || e.maxY<region.minY*sy || e.minY>region.maxY*sy)continue;
      let overlap=0;
      const stride=Math.max(1,Math.floor(region.pixels.length/5000));
      for(let j=0;j<region.pixels.length;j+=stride){
        const at=region.pixels[j],y=Math.floor(at/w),x=at-y*w;
        const xx=(x+0.5)*sx,yy=(y+0.5)*sy;
        if(xx>=e.minX&&xx<=e.maxX&&yy>=e.minY&&yy<=e.maxY&&inside(xx,yy,e.poly))overlap++;
      }
      if(overlap)hits.push({channel:e.channel,overlap});
    }
    hits.sort((a,b)=>b.overlap-a.overlap);
    return hits;
  }
  function analyze(img) {
    const w=img.width,h=img.height,n=w*h,roi=roiBounds(w,h), t=Number(thresholdSlider.value);
    const rgba=img.data,bg=reference.data;
    let sumCurrent=0,sumBackground=0,samples=0;
    const stride=Math.max(6,Math.round(w/320)*9);
    for(let y=roi.top;y<roi.bottom;y+=stride) for(let x=roi.left;x<roi.right;x+=stride){
      const i=y*w+x,p=i*4;
      const gray=Math.round(0.299*rgba[p]+0.587*rgba[p+1]+0.114*rgba[p+2]);
      sumCurrent+=gray;sumBackground+=referenceGray[i];samples++;
    }
    const gain=Math.max(0.85,Math.min(1.15,sumCurrent>1?sumBackground/sumCurrent:1));
    const diff=new Uint8Array(n),binary=new Uint8Array(n);
    let changed=0;
    for(let y=roi.top;y<roi.bottom;y++)for(let x=roi.left;x<roi.right;x++){
      const i=y*w+x,p=i*4;
      const currentGray=(0.299*rgba[p]+0.587*rgba[p+1]+0.114*rgba[p+2])*gain;
      const grayDiff=Math.abs(referenceGray[i]-currentGray);
      const rgbDiff=rgbCheck.checked?0.65*Math.max(
        Math.abs(bg[p]-rgba[p]*gain),
        Math.abs(bg[p+1]-rgba[p+1]*gain),
        Math.abs(bg[p+2]-rgba[p+2]*gain)):0;
      const v=Math.min(255,Math.round(Math.max(grayDiff,rgbDiff)));
      diff[i]=v;
      if(v>=t){binary[i]=1;changed++;}
    }
    // Join nearby droplet-edge fragments by a one-pixel dilation. Keep raw
    // threshold support to prevent enlarged noise from counting as a droplet.
    const dilated=new Uint8Array(n);
    for(let y=roi.top+1;y<roi.bottom-1;y++)for(let x=roi.left+1;x<roi.right-1;x++){
      const i=y*w+x;if(!binary[i])continue;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)dilated[i+dy*w+dx]=1;
    }
    const visited=new Uint8Array(n), queue=new Int32Array(n), debug=new Uint8Array(n);
    for(let i=0;i<n;i++)if(binary[i])debug[i]=85;
    const candidates=[], rejected={small:0,line:0,weak:0,large:0};
    const minSupport=Math.max(4,Math.round(4*w/320));
    const maxRegionArea=Math.max(200,(roi.right-roi.left)*(roi.bottom-roi.top)*0.11);
    for(let y=roi.top;y<roi.bottom;y++)for(let x=roi.left;x<roi.right;x++){
      const start=y*w+x;
      if(!dilated[start]||visited[start])continue;
      let head=0,tail=1;queue[0]=start;visited[start]=1;
      let minX=x,maxX=x,minY=y,maxY=y,sumX=0,sumY=0,support=0,sumDiff=0;
      while(head<tail){
        const i=queue[head++],py=Math.floor(i/w),px=i-py*w;
        minX=Math.min(minX,px);maxX=Math.max(maxX,px);
        minY=Math.min(minY,py);maxY=Math.max(maxY,py);
        sumX+=px;sumY+=py;
        if(binary[i]){support++;sumDiff+=diff[i];}
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          if(!dx&&!dy)continue;
          const xx=px+dx,yy=py+dy;
          if(xx<roi.left||xx>=roi.right||yy<roi.top||yy>=roi.bottom)continue;
          const j=yy*w+xx;
          if(dilated[j]&&!visited[j]){visited[j]=1;queue[tail++]=j;}
        }
      }
      if(support<minSupport){rejected.small++;continue;}
      if(tail>maxRegionArea){rejected.large++;continue;}
      const bw=maxX-minX+1,bh=maxY-minY+1;
      const aspect=Math.max(bw/bh,bh/bw),density=tail/(bw*bh);
      if(bw<3||bh<3||aspect>4.0||density<0.18){rejected.line++;continue;}
      if(sumDiff/support<t+1){rejected.weak++;continue;}
      const reg={area:tail,support,minX,maxX,minY,maxY,centerX:sumX/tail,centerY:sumY/tail,
        meanDifference:sumDiff/support,pixels:Array.from(queue.subarray(0,tail))};
      candidates.push(reg);
    }
    candidates.sort((a,b)=>b.support-a.support);
    const shortlist=candidates.slice(0,8);
    const electrodePolys=projectChannels(),sx=video.videoWidth/w,sy=video.videoHeight/h;
    for(const reg of shortlist){
      reg.channels=assignChannels(reg,electrodePolys,sx,sy,w);
      for(const i of reg.pixels) debug[i]=255;
    }
    return {w,h,diff,debug,rawChanged:changed,candidates:shortlist,totalAccepted:candidates.length,
      rejected,gain,threshold:t};
  }
  function annotate(result){
    const canvas=ensureOverlay();if(!canvas)return;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.font='bold 18px sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#ffb800';ctx.fillStyle='#ffb800';
    for(const [k,c] of result.candidates.entries()){
      const sx=canvas.width/result.w,sy=canvas.height/result.h;
      const x=c.centerX*sx,y=c.centerY*sy;
      const label='V4.10? '+(c.channels?.length?'ch '+c.channels[0].channel:'unmapped');
      ctx.setLineDash([7,5]);ctx.strokeRect(c.minX*sx,c.minY*sy,(c.maxX-c.minX+1)*sx,(c.maxY-c.minY+1)*sy);
      ctx.setLineDash([]);ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#111827';ctx.fillRect(x+13,y-21,Math.min(210,ctx.measureText(label).width+12),24);
      ctx.fillStyle='#fff';ctx.fillText(label,x+19,y-4);ctx.fillStyle='#ffb800';
    }
  }
  function refreshDebug(img,result){
    drawPreview('empty',referenceCanvas);
    drawPreview('live',sourceCanvas);
    debugArray('diff',result.diff,result.w,result.h,true);
    debugArray('mask',result.debug,result.w,result.h,false);
  }
  function tick(){
    if(!running)return;
    const now=performance.now();
    try{
      if(!video.srcObject || !prepare() || getSignature()!==signature){
        stop();display('Camera, zoom, ROI, or analysis size changed. Stop and capture a NEW V4.10 empty reference (legacy reference is unchanged).');return;
      }
      const img=grab(),result=analyze(img);lastResult=result;
      annotate(result);refreshDebug(img,result);
      const elapsed=Math.round(performance.now()-now);
      const summary=result.candidates.slice(0,3).map((c,i)=>(i+1)+': '+(c.channels?.length?'ch '+c.channels[0].channel:'unmapped')+' ('+c.support+' raw px)').join(' · ');
      display('V4.10 READ ONLY — '+result.w+'×'+result.h+', '+elapsed+' ms/frame; '+result.rawChanged+' changed px; '+result.totalAccepted+' tentative regions'+
        (summary?'; '+summary:'')+'; rejected: '+JSON.stringify(result.rejected)+'. NEVER use unverified regions for DropBot actuation.');
      el('export').disabled=false;
    }catch(error){stop();display('V4.10 analysis error: '+error.message);console.error(error);return;}
    if(running)timer=setTimeout(tick,PROCESS_INTERVAL_MS);
  }
  function start(){
    if(running)return;
    if(!reference || !signature){display('Capture a V4.10 empty-chip reference before starting.');return;}
    if(!prepare() || getSignature()!==signature){display('V4.10 reference differs from this camera/ROI/resolution. Recapture while EMPTY.');return;}
    // The legacy detector is independent. Avoid running both previews at once.
    if(document.getElementById('ewod-preview-vision')?.textContent?.includes('Stop Preview')){
      display('Click Stop Preview in the V4.7 controls first. This keeps our measurements independent.');return;
    }
    running=true;el('start').disabled=true;el('stop').disabled=false;
    display('V4.10 scanning at '+sourceCanvas.width+' × '+sourceCanvas.height+'; no actuation.');
    tick();
  }
  el('capture').addEventListener('click',()=>{
    if(running){display('Stop V4.10 Preview before capturing a new empty reference.');return;}
    if(!prepare())return;
    const img=grab();
    // Using a separate in-memory reference avoids overwriting saved legacy data.
    reference=new ImageData(new Uint8ClampedArray(img.data),img.width,img.height);
    referenceGray=grayOf(reference.data);
    referenceCanvas.width=img.width;referenceCanvas.height=img.height;
    referenceCtx.putImageData(reference,0,0);
    signature=getSignature();lastResult=null;
    drawPreview('empty',referenceCanvas);
    display('V4.10 empty reference captured in memory at '+img.width+'×'+img.height+'. It is NOT the legacy reference. Add droplet without moving the glass, then click Start V4.10 Preview.');
  });
  el('start').addEventListener('click',start);
  el('stop').addEventListener('click',()=>{stop();display('V4.10 preview stopped. Legacy references unchanged.');});
  widthSelect.addEventListener('change',()=>{
    stop();reference=null;referenceGray=null;signature=null;lastResult=null;
    el('export').disabled=true;
    display('Resolution changed. The V4.10-only reference was cleared. Capture a new EMPTY reference at this resolution. Legacy reference remains saved.');
  });
  thresholdSlider.addEventListener('input',()=>{el('threshold-text').textContent=thresholdSlider.value;});
  video.addEventListener('emptied',()=>{if(running){stop();display('Camera stopped. V4.10 paused.');}});
  el('export').addEventListener('click',()=>{
    if(!lastResult)return;
    const names=['empty','live','diff','mask'];
    const canvases=names.map(n=>el(n));const w=previewWidth,h=canvases[0].height;
    const out=document.createElement('canvas');out.width=w*2;out.height=(h+25)*2;
    const ctx=out.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,out.width,out.height);
    names.forEach((name,i)=>{const x=(i%2)*w,y=Math.floor(i/2)*(h+25);
      ctx.fillStyle='#111827';ctx.font='14px sans-serif';ctx.fillText(name.toUpperCase(),x+5,y+17);
      ctx.drawImage(canvases[i],x,y+25,w,h);});
    const a=document.createElement('a');a.href=out.toDataURL('image/png');
    a.download='ewod-v410-diagnostics-'+new Date().toISOString().replace(/[:.]/g,'-')+'.png';a.click();
  });
});
// =========================== END EWOD V4.10 ================================

/*
 * EWOD V4.11: experimental, electrode-aware, MULTI-EMPTY ITO diagnostic.
 * Read-only extension of V4.10. NEVER uses a DropBot API, actuator, or
 * window.ewodVisionState. Never changes stored calibration or saved refs.
 * The electrode polygons are a spatial prior, NOT proof of a droplet.
 */
document.addEventListener('DOMContentLoaded', () => {
  const base = document.getElementById('ewod-v410-panel');
  const video = document.getElementById('camera-feed');
  if (!base || !video || document.getElementById('ewod-v411-panel')) return;
  const details = document.createElement('details');
  details.id = 'ewod-v411-panel';
  details.style.cssText = 'margin:10px 0;padding:10px;border:1px solid #0d9488;border-radius:8px;background:#f0fdfa;';
  details.innerHTML = `
    <summary style="cursor:pointer;font-weight:700;">Experimental V4.11 — electrode-aware ITO diagnosis (NO ACTUATION)</summary>
    <p style="font-size:12px;line-height:1.5;margin:8px 0;">Uses the saved magenta/SVG geometry <strong>before</strong> segmenting. Searches only near active electrodes (including ch 33). Can compare up to four genuinely EMPTY glass placements. This is a <strong>read-only research test</strong>—the labels are not verified droplet identities.</p>
    <div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:8px 0;">
      <label>Analysis <select id="ewod-v411-width"><option value="960">960 × 540</option><option value="1920" selected>1920 × 1080</option></select></label>
      <label>Threshold <input id="ewod-v411-threshold" type="range" min="10" max="80" step="1" value="30"></label><strong id="ewod-v411-tlabel">30</strong>
      <label><input id="ewod-v411-rgb" type="checkbox" checked> RGB contrast</label>
      <label><input id="ewod-v411-multiref" type="checkbox" checked> Multi-empty comparison</label>
      <label><input id="ewod-v411-roiclip" type="checkbox"> Clip to yellow ROI (normally OFF)</label>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;">
      <button type="button" id="ewod-v411-capture">Add EMPTY ITO reference</button>
      <button type="button" id="ewod-v411-clear">Clear V4.11 references</button>
      <button type="button" id="ewod-v411-start">Start V4.11 Preview</button>
      <button type="button" id="ewod-v411-stop" disabled>Stop V4.11 Preview</button>
      <button type="button" id="ewod-v411-export" disabled>Save V4.11 Diagnostics</button>
    </div>
    <div id="ewod-v411-status" role="status" style="background:#ccfbf1;padding:8px;border-radius:5px;font-size:12px;line-height:1.5">Stop other previews. Ensure saved magenta geometry aligns. Capture one EMPTY ITO reference, optionally additional EMPTY references after repositioning the EMPTY glass. Then add droplets and start preview.</div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:8px;">
      <div><strong style="font-size:11px">First empty reference</strong><canvas id="ewod-v411-empty" style="width:100%;border:1px solid #99f6e4;display:block"></canvas></div>
      <div><strong style="font-size:11px">Live image + electrode search boundaries</strong><canvas id="ewod-v411-live" style="width:100%;border:1px solid #99f6e4;display:block"></canvas></div>
      <div><strong style="font-size:11px">Electrode-aware difference (4× visual gain)</strong><canvas id="ewod-v411-diff" style="width:100%;border:1px solid #99f6e4;display:block"></canvas></div>
      <div><strong style="font-size:11px">Changed pixels (gray) and candidate regions (white)</strong><canvas id="ewod-v411-mask" style="width:100%;border:1px solid #99f6e4;display:block"></canvas></div>
    </div>
    <small style="font-size:11px;display:block;margin-top:7px">A multi-empty minimum suppresses some changes but can also hide real droplet pixels. Near-glass shadows, electrode boundaries, and saturation may still give false positives. Repositioned camera/chip/optics invalidate calibration. V4.11 never sends commands or writes legacy vision state.</small>`;
  base.insertAdjacentElement('afterend', details);
  const el = name => details.querySelector('#ewod-v411-' + name);
  const status = el('status');
  const widthSelect = el('width'), thresholdSlider = el('threshold');
  const previewWidth = 320;
  let references = [], signature = null, geometry = null, running = false;
  let timer = null, overlay = null, previous = [], last = null;
  const srcCanvas = document.createElement('canvas');
  const ctx = srcCanvas.getContext('2d', {willReadFrequently:true});
  const display = s => { status.textContent = s; };
  const clipped = (x,a,b) => Math.max(a, Math.min(b,x));
  const getWidth = () => Math.min(+widthSelect.value, video.videoWidth||0);
  const heightOf = w => Math.round(w*(video.videoHeight||1)/(video.videoWidth||1));
  const calibrationSignature = () => JSON.stringify({H:window.ewodHomography, version:window.ewodLocalAlignmentVersion||0});
  const viewSignature = () => {
    const track=video.srcObject?.getVideoTracks?.()[0], settings=track?.getSettings?.()||{};
    return JSON.stringify({device:settings.deviceId||'', cameraW:video.videoWidth,cameraH:video.videoHeight,
      zoom: +(document.getElementById('camera-zoom')?.value||1),width:getWidth(),calibration:calibrationSignature()});
  };
  const stop = () => {running=false; if(timer!==null)clearTimeout(timer);timer=null;
    el('start').disabled=false; el('stop').disabled=true; previous=[];
    if(overlay)overlay.getContext('2d').clearRect(0,0,overlay.width,overlay.height);
  };
  const prepare = () => {
    if(!video.videoWidth || video.readyState<2){display('Camera not ready.');return false;}
    if(Math.abs(+(document.getElementById('camera-zoom')?.value||1)-1)>0.005){display('Use camera zoom 1.0× for this experiment.');return false;}
    if(typeof window.ewodProject !== 'function' || !window.ewodElectrodePaths?.size || !Array.isArray(window.ewodHomography)) {
      display('No calibrated electrode polygons. Restore your saved magenta reference and check it is aligned before using V4.11.');return false;
    }
    if(!srcCanvas.width || srcCanvas.width!==getWidth() || srcCanvas.height!==heightOf(getWidth())){
      srcCanvas.width=getWidth();srcCanvas.height=heightOf(getWidth()); geometry=null;
    }
    return true;
  };
  const grayOf = rgba => {const g=new Uint8Array(rgba.length/4);
    for(let i=0,p=0;i<g.length;i++,p+=4)g[i]=Math.round(0.299*rgba[p]+0.587*rgba[p+1]+0.114*rgba[p+2]);return g;};
  const grab = () => {ctx.drawImage(video,0,0,srcCanvas.width,srcCanvas.height);return ctx.getImageData(0,0,srcCanvas.width,srcCanvas.height);};
  const previewCanvas = (name,source) => {const c=el(name); c.width=previewWidth; c.height=Math.round(previewWidth*srcCanvas.height/srcCanvas.width);
    c.getContext('2d').drawImage(source,0,0,c.width,c.height);};
  const drawGray = (name, pixels, w,h,mult=1) => {const c=el(name);c.width=previewWidth;c.height=Math.round(previewWidth*h/w);
    const rgba=new Uint8ClampedArray(c.width*c.height*4);
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
      const i=Math.min(h-1,Math.floor(y*h/c.height))*w+Math.min(w-1,Math.floor(x*w/c.width));
      const v=clipped(pixels[i]*mult,0,255),p=(y*c.width+x)*4;
      rgba[p]=rgba[p+1]=rgba[p+2]=v;rgba[p+3]=255;
    }
    c.getContext('2d').putImageData(new ImageData(rgba,c.width,c.height),0,0);
  };
  function pathsForGeometry(w,h) {
    const sx=w/video.videoWidth,sy=h/video.videoHeight,paths=[];
    for(const [id,path] of window.ewodElectrodePaths.entries()){
      if(typeof path.getTotalLength!=='function')continue;
      let len=0;try{len=path.getTotalLength();}catch(_){continue;}
      if(!(len>0))continue;
      const n=clipped(Math.ceil(len*2),35,120),pts=[];
      for(let j=0;j<n;j++){
        const p=path.getPointAtLength(j*len/n),q=typeof window.ewodProjectElectrode==='function'
          ? window.ewodProjectElectrode(id,p.x,p.y):window.ewodProject(p.x,p.y);
        if(q&&Number.isFinite(q.x)&&Number.isFinite(q.y))pts.push({x:q.x*sx,y:q.y*sy});
      }
      if(pts.length>=3)paths.push({id,channel:path.getAttribute('data-channels')||'?',pts});
    }
    return paths;
  }
  function createGeometry() {
    const w=srcCanvas.width,h=srcCanvas.height,n=w*h;
    const polys=pathsForGeometry(w,h);
    if(!polys.length)throw Error('No calibrated electrode polygons could be projected. Verify magenta mapping.');
    const paint=document.createElement('canvas');paint.width=w;paint.height=h;
    const pc=paint.getContext('2d',{willReadFrequently:true});
    const trace=(poly)=>{pc.beginPath(); poly.pts.forEach((p,j)=>j?pc.lineTo(p.x,p.y):pc.moveTo(p.x,p.y));pc.closePath();};
    // Search region: filled electrodes PLUS a short physical-footprint margin.
    pc.fillStyle='#ffffff';pc.strokeStyle='#ffffff';pc.lineWidth=Math.max(4,Math.round(w/1920*12));
    for(const poly of polys){trace(poly);pc.fill();pc.stroke();}
    const image=pc.getImageData(0,0,w,h).data;
    const search=new Uint8Array(n);
    for(let i=0,p=3;i<n;i++,p+=4)if(image[p]>210)search[i]=1;
    pc.clearRect(0,0,w,h);
    // Exact polygon interiors: each ID is encoded into RGB, read back below.
    for(let k=0;k<polys.length;k++){
      const code=k+1;pc.fillStyle=`rgb(${code&255},${(code>>8)&255},${(code>>16)&255})`;
      trace(polys[k]);pc.fill();
    }
    const owner=new Uint16Array(n),color=pc.getImageData(0,0,w,h).data;
    for(let i=0,p=0;i<n;i++,p+=4)if(color[p+3]>248){const code=color[p]+256*color[p+1]+65536*color[p+2];
      if(code>0&&code<=polys.length)owner[i]=code;}
    let maskCount=0,minX=w-1,minY=h-1,maxX=0,maxY=0;
    for(let i=0;i<n;i++)if(search[i]){maskCount++;const y=(i/w)|0,x=i-y*w;
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    if(!maskCount)throw Error('Calibrated polygons do not overlap camera image. Check magenta alignment.');
    return {search,owner,polys,w,h,maskCount,bounds:{left:minX,right:maxX,top:minY,bottom:maxY}};
  }
  function savedROI(){
    try{return JSON.parse(localStorage.getItem('ewod.vision.roi.v2')||'null')?.roi||null;}
    catch(_){return null;}
  }
  function estimateShift(ref,current,geom,w,h) {
    // Robust, small global image translation: anchored by known electrode features.
    // Only samples textured pixels around electrode polygons, not glass perimeter.
    const samples=[],stride=Math.max(6,Math.round(w/200));
    const b=geom.bounds,range=4;
    for(let y=Math.max(range+1,b.top);y<Math.min(h-range-1,b.bottom);y+=stride){
      for(let x=Math.max(range+1,b.left);x<Math.min(w-range-1,b.right);x+=stride){
        const i=y*w+x;if(!geom.search[i])continue;
        const g=ref.gray[i],edge=Math.abs(ref.gray[i+1]-ref.gray[i-1])+Math.abs(ref.gray[i+w]-ref.gray[i-w]);
        if(g<12||g>242||edge<25)continue;
        samples.push(i);if(samples.length>=2500)break;
      }
      if(samples.length>=2500)break;
    }
    if(samples.length<60)return {dx:0,dy:0,score:Infinity,usable:false};
    let best={dx:0,dy:0,score:Infinity,usable:true};
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
      let score=0;for(const i of samples){const j=i+dy*w+dx;
        score+=Math.min(40,Math.abs(ref.gray[i]-current[j]));}
      score/=samples.length;
      if(score<best.score)best={dx,dy,score,usable:true};
    }
    return best;
  }
  function analyze(frame){
    const w=frame.width,h=frame.height,n=w*h,geom=geometry;
    const threshold=+thresholdSlider.value,rgba=frame.data,gcur=grayOf(rgba);
    const refs=el('multiref').checked?references:[references[0]];
    const shifts=refs.map(ref=>estimateShift(ref,gcur,geom,w,h));
    const shiftsText=shifts.map((s,i)=>`ref${i+1} (${s.dx},${s.dy})`).join(', ');
    const diff=new Uint8Array(n),binary=new Uint8Array(n),dbg=new Uint8Array(n);
    const b=geom.bounds,roiClip=el('roiclip').checked,roi=savedROI();
    let changed=0,samples=0,meanBrightness=0;
    // Restrict all pixel tests to the geometry-derived electrode neighborhoods.
    for(let y=b.top;y<=b.bottom;y++)for(let x=b.left;x<=b.right;x++){
      const i=y*w+x;if(!geom.search[i])continue;
      if(roiClip&&roi&&(x<roi.left*w||x>=roi.right*w||y<roi.top*h||y>=roi.bottom*h))continue;
      const p=i*4;let d=255;
      for(let r=0;r<refs.length;r++){
        const ref=refs[r],off=shifts[r],xx=clipped(x+off.dx,0,w-1),yy=clipped(y+off.dy,0,h-1),j=yy*w+xx,q=j*4;
        let v=Math.abs(ref.gray[i]-gcur[j]);
        if(el('rgb').checked)v=Math.max(v,0.65*Math.max(
          Math.abs(ref.pixels[p]-rgba[q]),Math.abs(ref.pixels[p+1]-rgba[q+1]),Math.abs(ref.pixels[p+2]-rgba[q+2])));
        if(v<d)d=v;
      }
      diff[i]=Math.min(255,Math.round(d));samples++;meanBrightness+=gcur[i];
      if(d>=threshold){binary[i]=1;dbg[i]=70;changed++;}
    }
    // Group nearby edge fragments; threshold support remains computed from RAW pixels.
    const dilated=new Uint8Array(n),expand=1;
    for(let y=Math.max(1,b.top);y<Math.min(h-1,b.bottom);y++)for(let x=Math.max(1,b.left);x<Math.min(w-1,b.right);x++){
      const i=y*w+x;if(!binary[i])continue;
      for(let dy=-expand;dy<=expand;dy++)for(let dx=-expand;dx<=expand;dx++){
        const k=i+dy*w+dx;if(geom.search[k])dilated[k]=1;}
    }
    const visited=new Uint8Array(n),queue=new Int32Array(n),accepted=[],rejected={small:0,line:0,outside:0,large:0};
    for(let y=b.top;y<=b.bottom;y++)for(let x=b.left;x<=b.right;x++){
      const start=y*w+x;if(!dilated[start]||visited[start])continue;
      let head=0,tail=1;queue[0]=start;visited[start]=1;
      let minX=x,maxX=x,minY=y,maxY=y,support=0,sumX=0,sumY=0;
      const votes=new Map();let interiorSupport=0;
      while(head<tail){const i=queue[head++],py=(i/w)|0,px=i-py*w;
        if(px<minX)minX=px;if(px>maxX)maxX=px;if(py<minY)minY=py;if(py>maxY)maxY=py;
        if(binary[i]){support++;sumX+=px;sumY+=py;
          const owner=geom.owner[i];if(owner){interiorSupport++;votes.set(owner,(votes.get(owner)||0)+1);}}
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          if(!dx&&!dy)continue;const xx=px+dx,yy=py+dy;
          if(xx<b.left||xx>b.right||yy<b.top||yy>b.bottom)continue;
          const j=yy*w+xx;if(dilated[j]&&!visited[j]){visited[j]=1;queue[tail++]=j;}
        }
      }
      const minSupport=Math.max(10,Math.round(12*w/1920));
      if(support<minSupport){rejected.small++;continue;}
      const bw=maxX-minX+1,bh=maxY-minY+1,aspect=Math.max(bw/bh,bh/bw),density=tail/(bw*bh);
      if(tail>(b.right-b.left+1)*(b.bottom-b.top+1)*0.15){rejected.large++;continue;}
      if(bw<4||bh<4||aspect>4.5||density<0.10){rejected.line++;continue;}
      if(interiorSupport<Math.max(3,0.12*support)||!votes.size){rejected.outside++;continue;}
      const channels=[...votes].sort((a,b)=>b[1]-a[1]).map(([code,pixels])=>({channel:geom.polys[code-1].channel,pixels}));
      for(let j=0;j<tail;j++)dbg[queue[j]]=255;
      accepted.push({centerX:sumX/Math.max(support,1),centerY:sumY/Math.max(support,1),minX,maxX,minY,maxY,
        support,area:tail,interiorSupport,channels});
    }
    accepted.sort((a,b)=>b.support-a.support);
    const shortlist=accepted.slice(0,12);
    // Require stable location and SAME primary channel over consecutive observations.
    const next=[];
    for(const c of shortlist){
      const match=previous.find(p=>p.channels[0]?.channel===c.channels[0]?.channel &&
        Math.hypot(p.centerX-c.centerX,p.centerY-c.centerY)<Math.max(14,24*w/1920));
      c.stableFrames=match?match.stableFrames+1:1;
      next.push(c);
    }
    previous=next;
    return {w,h,diff,dbg,changed,shortlist,accepted:accepted.length,rejected,shiftsText,samples};
  }
  function ensureOverlay(){const stage=video.closest('.vision-stage');if(!stage)return null;
    if(!overlay || overlay.parentElement!==stage){overlay=document.createElement('canvas');overlay.id='ewod-v411-overlay';
      overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:71;pointer-events:none;';stage.appendChild(overlay);}
    overlay.width=video.videoWidth;overlay.height=video.videoHeight;return overlay;
  }
  function annotate(result){const canvas=ensureOverlay();if(!canvas)return;
    const cx=canvas.getContext('2d');cx.clearRect(0,0,canvas.width,canvas.height);
    cx.font='bold 17px sans-serif';cx.lineWidth=3;
    for(const c of result.shortlist){if(c.stableFrames<2)continue;
      const sx=canvas.width/result.w,sy=canvas.height/result.h,x=c.centerX*sx,y=c.centerY*sy;
      const label=`V4.11? ch ${c.channels[0].channel} (${c.stableFrames} frames)`;
      cx.strokeStyle='#0f766e';cx.setLineDash([6,4]);cx.strokeRect(c.minX*sx,c.minY*sy,(c.maxX-c.minX+1)*sx,(c.maxY-c.minY+1)*sy);
      cx.setLineDash([]);cx.beginPath();cx.arc(x,y,8,0,Math.PI*2);cx.stroke();
      const width=clipped(cx.measureText(label).width+12,110,300);
      cx.fillStyle='rgba(15,23,42,.90)';cx.fillRect(x+12,y-23,width,24);
      cx.fillStyle='#fff';cx.fillText(label,x+18,y-5);
    }
  }
  function refreshDebug(result){
    previewCanvas('empty',references[0].canvas);previewCanvas('live',srcCanvas);
    drawGray('diff',result.diff,result.w,result.h,4);drawGray('mask',result.dbg,result.w,result.h,1);
    // Draw actual calibration polygons over the smaller live diagnostic panel.
    const c=el('live'),p=c.getContext('2d');p.save();p.strokeStyle='rgba(15,118,110,.55)';p.lineWidth=.65;
    const sx=c.width/result.w,sy=c.height/result.h;
    for(const poly of geometry.polys){p.beginPath();poly.pts.forEach((pt,j)=>j?p.lineTo(pt.x*sx,pt.y*sy):p.moveTo(pt.x*sx,pt.y*sy));p.closePath();p.stroke();}
    p.restore();
  }
  function tick(){if(!running)return;const now=performance.now();
    try{
      if(!video.srcObject || !prepare() || viewSignature()!==signature){stop();display('Camera or calibration changed. References invalidated. Do NOT capture a new EMPTY image while droplets are present.');return;}
      const current=grab(),res=analyze(current);last=res;annotate(res);refreshDebug(res);
      const shown=res.shortlist.filter(c=>c.stableFrames>=2),latency=Math.round(performance.now()-now);
      const labels=shown.slice(0,5).map(c=>`ch ${c.channels[0].channel} (${c.support}px)`).join('; ');
      display(`V4.11 READ ONLY — ${res.w}×${res.h}; ${latency} ms/frame; empty references: ${references.length}; electrode-neighborhood changed: ${res.changed}px; tentative regions: ${res.accepted}; stable candidates (NOT verified droplets): ${shown.length}${labels?' — '+labels:''}; registration ${res.shiftsText}; rejected ${JSON.stringify(res.rejected)}. NO ACTUATION.`);
      el('export').disabled=false;
    }catch(e){stop();display('V4.11 stopped: '+e.message);console.error('V4.11',e);return;}
    if(running)timer=setTimeout(tick,700);
  }
  function start(){if(running)return;if(!references.length){display('Capture at least one EMPTY ITO reference first.');return;}
    if(!prepare()||viewSignature()!==signature){display('Camera/calibration differs from EMPTY reference. Recapture ONLY with empty chip.');return;}
    if(!geometry)geometry=createGeometry();
    const v410=details.previousElementSibling;
    if(v410?.querySelector('#ewod-v410-stop')?.disabled===false){display('Stop V4.10 Preview before V4.11.');return;}
    if(document.getElementById('ewod-preview-vision')?.textContent?.includes('Stop Preview')){
      display('Stop legacy Preview Detection before V4.11.');return;}
    running=true;el('start').disabled=true;el('stop').disabled=false;tick();
  }
  el('capture').addEventListener('click',()=>{
    if(running){display('Stop V4.11 Preview first.');return;}
    if(!prepare())return;
    if(references.length && viewSignature()!==signature){display('Camera/calibration changed. Clear V4.11 refs and capture empty again.');return;}
    if(references.length>=4){display('Four empty references already captured. Clear refs to start a new controlled session.');return;}
    const frame=grab(),c=document.createElement('canvas');c.width=frame.width;c.height=frame.height;
    c.getContext('2d').putImageData(frame,0,0);
    references.push({pixels:new Uint8ClampedArray(frame.data),gray:grayOf(frame.data),canvas:c});
    signature=viewSignature();if(!geometry)geometry=createGeometry();last=null;previous=[];
    previewCanvas('empty',references[0].canvas);
    display(`EMPTY ITO reference ${references.length}/4 captured in memory. Capture additional references only with NO droplets. This does not change V4.7–V4.10. Analyze droplet after placement.`);
  });
  el('start').addEventListener('click',start);
  el('stop').addEventListener('click',()=>{stop();display(`Preview stopped; ${references.length} V4.11 EMPTY reference(s) remain in page memory.`);});
  el('clear').addEventListener('click',()=>{stop();references=[];geometry=null;signature=null;last=null;
    el('export').disabled=true;display('V4.11 EMPTY reference library cleared. Legacy references/calibration unchanged.');});
  widthSelect.addEventListener('change',()=>{stop();references=[];geometry=null;signature=null;last=null;
    el('export').disabled=true;display('Resolution changed: V4.11-only EMPTY references cleared.');});
  thresholdSlider.addEventListener('input',()=>{el('tlabel').textContent=thresholdSlider.value;previous=[];});
  video.addEventListener('emptied',()=>{if(running)stop();});
  el('export').addEventListener('click',()=>{
    if(!last)return;
    const names=['empty','live','diff','mask'],canvases=names.map(el);
    const w=previewWidth,h=canvases[0].height;
    const out=document.createElement('canvas');out.width=2*w;out.height=2*(h+25);
    const p=out.getContext('2d');p.fillStyle='#fff';p.fillRect(0,0,out.width,out.height);
    names.forEach((name,j)=>{const x=(j%2)*w,y=Math.floor(j/2)*(h+25);
      p.fillStyle='#111827';p.font='14px sans-serif';p.fillText(name.toUpperCase(),x+4,y+17);
      p.drawImage(canvases[j],x,y+25,w,h);});
    const link=document.createElement('a');link.href=out.toDataURL('image/png');
    link.download='ewod-v411-diagnostics-'+new Date().toISOString().replace(/[:.]/g,'-')+'.png';link.click();
    const record={model:'v411-electrode-aware-experimental',timestamp:new Date().toISOString(),read_only:true,
      analysis:{width:last.w,height:last.h,threshold:+thresholdSlider.value,RGB:el('rgb').checked,
      multiEmpty:el('multiref').checked,ROIClip:el('roiclip').checked,emptyRefs:references.length,
      changedPixels:last.changed,accepted:last.accepted,rejected:last.rejected,registration:last.shiftsText},
      tentativeRegions:last.shortlist.map(c=>({channel:c.channels[0]?.channel||null,secondary:c.channels.slice(1,3),
        support:c.support,stableFrames:c.stableFrames,center:[c.centerX,c.centerY]}))};
    const blob=new Blob([JSON.stringify(record,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;
    a.download='ewod-v411-metadata-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  });
});

/*
 * EWOD V4.12: experimental, electrode-aware, SHIFT-GUARDED multi-empty ITO diagnostic.
 * Read-only extension of V4.10. NEVER uses a DropBot API, actuator, or
 * window.ewodVisionState. Never changes stored calibration or saved refs.
 * The electrode polygons are a spatial prior, NOT proof of a droplet.
 */
document.addEventListener('DOMContentLoaded', () => {
  const base = document.getElementById('ewod-v411-panel');
  const video = document.getElementById('camera-feed');
  if (!base || !video || document.getElementById('ewod-v412-panel')) return;
  const details = document.createElement('details');
  details.id = 'ewod-v412-panel';
  details.style.cssText = 'margin:10px 0;padding:10px;border:1px solid #0d9488;border-radius:8px;background:#f0fdfa;';
  details.innerHTML = `
    <summary style="cursor:pointer;font-weight:700;">Experimental V4.12 — electrode-aware + scene-change filter (NO ACTUATION)</summary>
    <p style="font-size:12px;line-height:1.5;margin:8px 0;">Uses the saved magenta/SVG geometry <strong>before</strong> segmenting. Searches only near active electrodes (including ch 33). Can compare up to four genuinely EMPTY glass placements. Warns when many electrode regions change after lifting the glass. This is a <strong>read-only research test</strong>—the labels are not verified droplet identities.</p>
    <div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:8px 0;">
      <label>Analysis <select id="ewod-v412-width"><option value="960">960 × 540</option><option value="1920" selected>1920 × 1080</option></select></label>
      <label>Threshold <input id="ewod-v412-threshold" type="range" min="10" max="80" step="1" value="30"></label><strong id="ewod-v412-tlabel">30</strong>
      <label><input id="ewod-v412-rgb" type="checkbox" checked> RGB contrast</label>
      <label><input id="ewod-v412-multiref" type="checkbox" checked> Multi-empty comparison</label>
      <label><input id="ewod-v412-roiclip" type="checkbox"> Clip to yellow ROI (normally OFF)</label>
      <label><input id="ewod-v412-guard" type="checkbox" checked> Setup-change guard</label>
      <label><input id="ewod-v412-edge" type="checkbox" checked> Reject edge-dominated fragments</label>
      <label>Min changed pixels / region <input id="ewod-v412-minsize" type="number" min="12" max="500" step="5" value="60" style="width:66px"></label>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;">
      <button type="button" id="ewod-v412-capture">Add EMPTY ITO reference</button>
      <button type="button" id="ewod-v412-clear">Clear V4.12 references</button>
      <button type="button" id="ewod-v412-start">Start V4.12 Preview</button>
      <button type="button" id="ewod-v412-stop" disabled>Stop V4.12 Preview</button>
      <button type="button" id="ewod-v412-export" disabled>Save V4.12 Diagnostics</button>
    </div>
    <div id="ewod-v412-status" role="status" style="background:#ccfbf1;padding:8px;border-radius:5px;font-size:12px;line-height:1.5">Stop other previews. Ensure saved magenta geometry aligns. Capture one EMPTY ITO reference, optionally additional EMPTY references after repositioning the EMPTY glass. Then add droplets and start preview.</div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:8px;">
      <div><strong style="font-size:11px">First empty reference</strong><canvas id="ewod-v412-empty" style="width:100%;border:1px solid #99f6e4;display:block"></canvas></div>
      <div><strong style="font-size:11px">Live image + electrode search boundaries</strong><canvas id="ewod-v412-live" style="width:100%;border:1px solid #99f6e4;display:block"></canvas></div>
      <div><strong style="font-size:11px">Electrode-aware difference (4× visual gain)</strong><canvas id="ewod-v412-diff" style="width:100%;border:1px solid #99f6e4;display:block"></canvas></div>
      <div><strong style="font-size:11px">Changed pixels (gray) and candidate regions (white)</strong><canvas id="ewod-v412-mask" style="width:100%;border:1px solid #99f6e4;display:block"></canvas></div>
    </div>
    <small style="font-size:11px;display:block;margin-top:7px">When changes are widespread, the setup-change guard withholds ALL droplet labels rather than inferring droplets. A multi-empty minimum suppresses some changes but can also hide real droplet pixels. Near-glass shadows, electrode boundaries, and saturation may still give false positives. Repositioned camera/chip/optics invalidate calibration. V4.12 never sends commands or writes legacy vision state.</small>`;
  base.insertAdjacentElement('afterend', details);
  const el = name => details.querySelector('#ewod-v412-' + name);
  const status = el('status');
  const widthSelect = el('width'), thresholdSlider = el('threshold');
  const previewWidth = 320;
  let references = [], signature = null, geometry = null, running = false;
  let timer = null, overlay = null, previous = [], last = null;
  const srcCanvas = document.createElement('canvas');
  const ctx = srcCanvas.getContext('2d', {willReadFrequently:true});
  const display = s => { status.textContent = s; };
  const clipped = (x,a,b) => Math.max(a, Math.min(b,x));
  const getWidth = () => Math.min(+widthSelect.value, video.videoWidth||0);
  const heightOf = w => Math.round(w*(video.videoHeight||1)/(video.videoWidth||1));
  const calibrationSignature = () => JSON.stringify({H:window.ewodHomography, version:window.ewodLocalAlignmentVersion||0});
  const viewSignature = () => {
    const track=video.srcObject?.getVideoTracks?.()[0], settings=track?.getSettings?.()||{};
    return JSON.stringify({device:settings.deviceId||'', cameraW:video.videoWidth,cameraH:video.videoHeight,
      zoom: +(document.getElementById('camera-zoom')?.value||1),width:getWidth(),calibration:calibrationSignature()});
  };
  const stop = () => {running=false; if(timer!==null)clearTimeout(timer);timer=null;
    el('start').disabled=false; el('stop').disabled=true; previous=[];
    if(overlay)overlay.getContext('2d').clearRect(0,0,overlay.width,overlay.height);
  };
  const prepare = () => {
    if(!video.videoWidth || video.readyState<2){display('Camera not ready.');return false;}
    if(Math.abs(+(document.getElementById('camera-zoom')?.value||1)-1)>0.005){display('Use camera zoom 1.0× for this experiment.');return false;}
    if(typeof window.ewodProject !== 'function' || !window.ewodElectrodePaths?.size || !Array.isArray(window.ewodHomography)) {
      display('No calibrated electrode polygons. Restore your saved magenta reference and check it is aligned before using V4.12.');return false;
    }
    if(!srcCanvas.width || srcCanvas.width!==getWidth() || srcCanvas.height!==heightOf(getWidth())){
      srcCanvas.width=getWidth();srcCanvas.height=heightOf(getWidth()); geometry=null;
    }
    return true;
  };
  const grayOf = rgba => {const g=new Uint8Array(rgba.length/4);
    for(let i=0,p=0;i<g.length;i++,p+=4)g[i]=Math.round(0.299*rgba[p]+0.587*rgba[p+1]+0.114*rgba[p+2]);return g;};
  const grab = () => {ctx.drawImage(video,0,0,srcCanvas.width,srcCanvas.height);return ctx.getImageData(0,0,srcCanvas.width,srcCanvas.height);};
  const previewCanvas = (name,source) => {const c=el(name); c.width=previewWidth; c.height=Math.round(previewWidth*srcCanvas.height/srcCanvas.width);
    c.getContext('2d').drawImage(source,0,0,c.width,c.height);};
  const drawGray = (name, pixels, w,h,mult=1) => {const c=el(name);c.width=previewWidth;c.height=Math.round(previewWidth*h/w);
    const rgba=new Uint8ClampedArray(c.width*c.height*4);
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
      const i=Math.min(h-1,Math.floor(y*h/c.height))*w+Math.min(w-1,Math.floor(x*w/c.width));
      const v=clipped(pixels[i]*mult,0,255),p=(y*c.width+x)*4;
      rgba[p]=rgba[p+1]=rgba[p+2]=v;rgba[p+3]=255;
    }
    c.getContext('2d').putImageData(new ImageData(rgba,c.width,c.height),0,0);
  };
  function pathsForGeometry(w,h) {
    const sx=w/video.videoWidth,sy=h/video.videoHeight,paths=[];
    for(const [id,path] of window.ewodElectrodePaths.entries()){
      if(typeof path.getTotalLength!=='function')continue;
      let len=0;try{len=path.getTotalLength();}catch(_){continue;}
      if(!(len>0))continue;
      const n=clipped(Math.ceil(len*2),35,120),pts=[];
      for(let j=0;j<n;j++){
        const p=path.getPointAtLength(j*len/n),q=typeof window.ewodProjectElectrode==='function'
          ? window.ewodProjectElectrode(id,p.x,p.y):window.ewodProject(p.x,p.y);
        if(q&&Number.isFinite(q.x)&&Number.isFinite(q.y))pts.push({x:q.x*sx,y:q.y*sy});
      }
      if(pts.length>=3)paths.push({id,channel:path.getAttribute('data-channels')||'?',pts});
    }
    return paths;
  }
  function createGeometry() {
    const w=srcCanvas.width,h=srcCanvas.height,n=w*h;
    const polys=pathsForGeometry(w,h);
    if(!polys.length)throw Error('No calibrated electrode polygons could be projected. Verify magenta mapping.');
    const paint=document.createElement('canvas');paint.width=w;paint.height=h;
    const pc=paint.getContext('2d',{willReadFrequently:true});
    const trace=(poly)=>{pc.beginPath(); poly.pts.forEach((p,j)=>j?pc.lineTo(p.x,p.y):pc.moveTo(p.x,p.y));pc.closePath();};
    // Search region: filled electrodes PLUS a short physical-footprint margin.
    pc.fillStyle='#ffffff';pc.strokeStyle='#ffffff';pc.lineWidth=Math.max(4,Math.round(w/1920*12));
    for(const poly of polys){trace(poly);pc.fill();pc.stroke();}
    const image=pc.getImageData(0,0,w,h).data;
    const search=new Uint8Array(n);
    for(let i=0,p=3;i<n;i++,p+=4)if(image[p]>210)search[i]=1;
    pc.clearRect(0,0,w,h);
    // Exact polygon interiors: each ID is encoded into RGB, read back below.
    for(let k=0;k<polys.length;k++){
      const code=k+1;pc.fillStyle=`rgb(${code&255},${(code>>8)&255},${(code>>16)&255})`;
      trace(polys[k]);pc.fill();
    }
    const owner=new Uint16Array(n),color=pc.getImageData(0,0,w,h).data;
    for(let i=0,p=0;i<n;i++,p+=4)if(color[p+3]>248){const code=color[p]+256*color[p+1]+65536*color[p+2];
      if(code>0&&code<=polys.length)owner[i]=code;}
    let maskCount=0,minX=w-1,minY=h-1,maxX=0,maxY=0;
    for(let i=0;i<n;i++)if(search[i]){maskCount++;const y=(i/w)|0,x=i-y*w;
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    if(!maskCount)throw Error('Calibrated polygons do not overlap camera image. Check magenta alignment.');
    return {search,owner,polys,w,h,maskCount,bounds:{left:minX,right:maxX,top:minY,bottom:maxY}};
  }
  function savedROI(){
    try{return JSON.parse(localStorage.getItem('ewod.vision.roi.v2')||'null')?.roi||null;}
    catch(_){return null;}
  }
  function estimateShift(ref,current,geom,w,h) {
    // Robust, small global image translation: anchored by known electrode features.
    // Only samples textured pixels around electrode polygons, not glass perimeter.
    const samples=[],stride=Math.max(6,Math.round(w/200));
    const b=geom.bounds,range=4;
    for(let y=Math.max(range+1,b.top);y<Math.min(h-range-1,b.bottom);y+=stride){
      for(let x=Math.max(range+1,b.left);x<Math.min(w-range-1,b.right);x+=stride){
        const i=y*w+x;if(!geom.search[i])continue;
        const g=ref.gray[i],edge=Math.abs(ref.gray[i+1]-ref.gray[i-1])+Math.abs(ref.gray[i+w]-ref.gray[i-w]);
        if(g<12||g>242||edge<25)continue;
        samples.push(i);if(samples.length>=2500)break;
      }
      if(samples.length>=2500)break;
    }
    if(samples.length<60)return {dx:0,dy:0,score:Infinity,usable:false};
    let best={dx:0,dy:0,score:Infinity,usable:true};
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
      let score=0;for(const i of samples){const j=i+dy*w+dx;
        score+=Math.min(40,Math.abs(ref.gray[i]-current[j]));}
      score/=samples.length;
      if(score<best.score)best={dx,dy,score,usable:true};
    }
    return best;
  }
  function analyze(frame){
    const w=frame.width,h=frame.height,n=w*h,geom=geometry;
    const threshold=+thresholdSlider.value,rgba=frame.data,gcur=grayOf(rgba);
    const refs=el('multiref').checked?references:[references[0]];
    const shifts=refs.map(ref=>estimateShift(ref,gcur,geom,w,h));
    const shiftsText=shifts.map((s,i)=>`ref${i+1} (${s.dx},${s.dy})`).join(', ');
    const diff=new Uint8Array(n),binary=new Uint8Array(n),dbg=new Uint8Array(n);
    const b=geom.bounds,roiClip=el('roiclip').checked,roi=savedROI();
    let changed=0,samples=0,meanBrightness=0;
    // Restrict all pixel tests to the geometry-derived electrode neighborhoods.
    for(let y=b.top;y<=b.bottom;y++)for(let x=b.left;x<=b.right;x++){
      const i=y*w+x;if(!geom.search[i])continue;
      if(roiClip&&roi&&(x<roi.left*w||x>=roi.right*w||y<roi.top*h||y>=roi.bottom*h))continue;
      const p=i*4;let d=255;
      for(let r=0;r<refs.length;r++){
        const ref=refs[r],off=shifts[r],xx=clipped(x+off.dx,0,w-1),yy=clipped(y+off.dy,0,h-1),j=yy*w+xx,q=j*4;
        let v=Math.abs(ref.gray[i]-gcur[j]);
        if(el('rgb').checked)v=Math.max(v,0.65*Math.max(
          Math.abs(ref.pixels[p]-rgba[q]),Math.abs(ref.pixels[p+1]-rgba[q+1]),Math.abs(ref.pixels[p+2]-rgba[q+2])));
        if(v<d)d=v;
      }
      diff[i]=Math.min(255,Math.round(d));samples++;meanBrightness+=gcur[i];
      if(d>=threshold){binary[i]=1;dbg[i]=70;changed++;}
    }
    // Group nearby edge fragments; threshold support remains computed from RAW pixels.
    const dilated=new Uint8Array(n),expand=1;
    for(let y=Math.max(1,b.top);y<Math.min(h-1,b.bottom);y++)for(let x=Math.max(1,b.left);x<Math.min(w-1,b.right);x++){
      const i=y*w+x;if(!binary[i])continue;
      for(let dy=-expand;dy<=expand;dy++)for(let dx=-expand;dx<=expand;dx++){
        const k=i+dy*w+dx;if(geom.search[k])dilated[k]=1;}
    }
    // Spatial test for changes distributed across many electrode neighborhoods.
    // A single droplet is usually localized; lifted/replaced glass can change many
    // separate electrode features at once. This is an UNCERTAINTY gate, not a
    // classifier and not a guarantee. Test with genuine multi-droplet ground truth.
    const cellCounts=new Uint32Array(48), electrodeCounts=new Uint32Array(geom.polys.length+1);
    const boxW=Math.max(1,b.right-b.left+1), boxH=Math.max(1,b.bottom-b.top+1);
    for(let y=b.top;y<=b.bottom;y++)for(let x=b.left;x<=b.right;x++){
      const i=y*w+x;if(!binary[i])continue;
      const tx=Math.min(7,Math.floor((x-b.left)*8/boxW));
      const ty=Math.min(5,Math.floor((y-b.top)*6/boxH));
      cellCounts[ty*8+tx]++;
      const id=geom.owner[i];if(id)electrodeCounts[id]++;
    }
    const activeCells=Array.from(cellCounts).filter(v=>v>=14).length;
    const activeElectrodes=Array.from(electrodeCounts).filter(v=>v>=14).length;
    const shiftResidual=Math.min(...shifts.map(s=>s.score));
    const sceneChanged=el('guard').checked && changed>=250 &&
      (activeElectrodes>=9 || activeCells>=10 ||
       (activeCells>=6 && Number.isFinite(shiftResidual) && shiftResidual>9));
    const visited=new Uint8Array(n),queue=new Int32Array(n),accepted=[],rejected={small:0,line:0,outside:0,large:0,edge:0};
    const bgGray=references[0].gray;
    for(let y=b.top;y<=b.bottom;y++)for(let x=b.left;x<=b.right;x++){
      const start=y*w+x;if(!dilated[start]||visited[start])continue;
      let head=0,tail=1;queue[0]=start;visited[start]=1;
      let minX=x,maxX=x,minY=y,maxY=y,support=0,sumX=0,sumY=0,edgeSupport=0;
      const votes=new Map();let interiorSupport=0;
      while(head<tail){const i=queue[head++],py=(i/w)|0,px=i-py*w;
        if(px<minX)minX=px;if(px>maxX)maxX=px;if(py<minY)minY=py;if(py>maxY)maxY=py;
        if(binary[i]){support++;sumX+=px;sumY+=py;
          const owner=geom.owner[i];if(owner){interiorSupport++;votes.set(owner,(votes.get(owner)||0)+1);}
          if(px>1 && px<w-2 && py>1 && py<h-2){
            const gradient=Math.abs(bgGray[i+2]-bgGray[i-2])+Math.abs(bgGray[i+2*w]-bgGray[i-2*w]);
            if(gradient>85)edgeSupport++;
          }
        }
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          if(!dx&&!dy)continue;const xx=px+dx,yy=py+dy;
          if(xx<b.left||xx>b.right||yy<b.top||yy>b.bottom)continue;
          const j=yy*w+xx;if(dilated[j]&&!visited[j]){visited[j]=1;queue[tail++]=j;}
        }
      }
      const minSupport=Math.max(12,Math.min(500,+(el('minsize').value||60)))*w/1920;
      if(support<minSupport){rejected.small++;continue;}
      const bw=maxX-minX+1,bh=maxY-minY+1,aspect=Math.max(bw/bh,bh/bw),density=tail/(bw*bh);
      if(tail>(b.right-b.left+1)*(b.bottom-b.top+1)*0.15){rejected.large++;continue;}
      if(bw<4||bh<4||aspect>4.5||density<0.10){rejected.line++;continue;}
      // A compact changed region may still sit on an electrode edge, so only
      // reject when its support is overwhelmingly on the saved static edges
      // AND its filled shape remains weak. Preserve edge-crossing droplets.
      if(el('edge').checked && edgeSupport>0.82*support && density<0.38){rejected.edge++;continue;}
      if(interiorSupport<Math.max(3,0.12*support)||!votes.size){rejected.outside++;continue;}
      const channels=[...votes].sort((a,b)=>b[1]-a[1]).map(([code,pixels])=>({channel:geom.polys[code-1].channel,pixels}));
      for(let j=0;j<tail;j++)dbg[queue[j]]=255;
      accepted.push({centerX:sumX/Math.max(support,1),centerY:sumY/Math.max(support,1),minX,maxX,minY,maxY,
        support,area:tail,interiorSupport,channels});
    }
    accepted.sort((a,b)=>b.support-a.support);
    const shortlist=accepted.slice(0,12);
    // Require stable location and SAME primary channel over consecutive observations.
    const next=[];
    for(const c of shortlist){
      const match=previous.find(p=>p.channels[0]?.channel===c.channels[0]?.channel &&
        Math.hypot(p.centerX-c.centerX,p.centerY-c.centerY)<Math.max(14,24*w/1920));
      c.stableFrames=match?match.stableFrames+1:1;
      next.push(c);
    }
    previous=next;
    return {w,h,diff,dbg,changed,shortlist,accepted:accepted.length,rejected,shiftsText,samples,
      sceneChanged,activeCells,activeElectrodes,shiftResidual};
  }
  function ensureOverlay(){const stage=video.closest('.vision-stage');if(!stage)return null;
    if(!overlay || overlay.parentElement!==stage){overlay=document.createElement('canvas');overlay.id='ewod-v412-overlay';
      overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:71;pointer-events:none;';stage.appendChild(overlay);}
    overlay.width=video.videoWidth;overlay.height=video.videoHeight;return overlay;
  }
  function annotate(result){const canvas=ensureOverlay();if(!canvas)return;
    const cx=canvas.getContext('2d');cx.clearRect(0,0,canvas.width,canvas.height);
    cx.font='bold 17px sans-serif';cx.lineWidth=3;
    for(const c of result.shortlist){if(result.sceneChanged || c.stableFrames<2)continue;
      const sx=canvas.width/result.w,sy=canvas.height/result.h,x=c.centerX*sx,y=c.centerY*sy;
      const label=`V4.12? ch ${c.channels[0].channel} (${c.stableFrames} frames)`;
      cx.strokeStyle='#0f766e';cx.setLineDash([6,4]);cx.strokeRect(c.minX*sx,c.minY*sy,(c.maxX-c.minX+1)*sx,(c.maxY-c.minY+1)*sy);
      cx.setLineDash([]);cx.beginPath();cx.arc(x,y,8,0,Math.PI*2);cx.stroke();
      const width=clipped(cx.measureText(label).width+12,110,300);
      cx.fillStyle='rgba(15,23,42,.90)';cx.fillRect(x+12,y-23,width,24);
      cx.fillStyle='#fff';cx.fillText(label,x+18,y-5);
    }
  }
  function refreshDebug(result){
    previewCanvas('empty',references[0].canvas);previewCanvas('live',srcCanvas);
    drawGray('diff',result.diff,result.w,result.h,4);drawGray('mask',result.dbg,result.w,result.h,1);
    // Draw actual calibration polygons over the smaller live diagnostic panel.
    const c=el('live'),p=c.getContext('2d');p.save();p.strokeStyle='rgba(15,118,110,.55)';p.lineWidth=.65;
    const sx=c.width/result.w,sy=c.height/result.h;
    for(const poly of geometry.polys){p.beginPath();poly.pts.forEach((pt,j)=>j?p.lineTo(pt.x*sx,pt.y*sy):p.moveTo(pt.x*sx,pt.y*sy));p.closePath();p.stroke();}
    p.restore();
  }
  function tick(){if(!running)return;const now=performance.now();
    try{
      if(!video.srcObject || !prepare() || viewSignature()!==signature){stop();display('Camera or calibration changed. References invalidated. Do NOT capture a new EMPTY image while droplets are present.');return;}
      const current=grab(),res=analyze(current);last=res;annotate(res);refreshDebug(res);
      const shown=res.sceneChanged?[]:res.shortlist.filter(c=>c.stableFrames>=2),latency=Math.round(performance.now()-now);
      const labels=shown.slice(0,5).map(c=>`ch ${c.channels[0].channel} (${c.support}px)`).join('; ');
      display(`V4.12 READ ONLY — ${res.sceneChanged?'SETUP CHANGE SUSPECTED; droplet labels WITHHELD. ':''}${res.w}×${res.h}; ${latency} ms/frame; empty references: ${references.length}; electrode-neighborhood changed: ${res.changed}px; tentative regions: ${res.accepted}; shown candidates (NOT verified droplets): ${shown.length}${labels?' — '+labels:''}; spread ${res.activeCells}/48 tiles, ${res.activeElectrodes} electrodes; residual ${Number.isFinite(res.shiftResidual)?res.shiftResidual.toFixed(1):'n/a'}; registration ${res.shiftsText}; rejected ${JSON.stringify(res.rejected)}. NO ACTUATION.`);
      el('export').disabled=false;
    }catch(e){stop();display('V4.12 stopped: '+e.message);console.error('V4.12',e);return;}
    if(running)timer=setTimeout(tick,700);
  }
  function start(){if(running)return;if(!references.length){display('Capture at least one EMPTY ITO reference first.');return;}
    if(!prepare()||viewSignature()!==signature){display('Camera/calibration differs from EMPTY reference. Recapture ONLY with empty chip.');return;}
    if(!geometry)geometry=createGeometry();
    const v411=details.previousElementSibling;
    if(v411?.querySelector('#ewod-v411-stop')?.disabled===false){display('Stop V4.11 Preview before V4.12.');return;}
    if(document.getElementById('ewod-preview-vision')?.textContent?.includes('Stop Preview')){
      display('Stop legacy Preview Detection before V4.12.');return;}
    running=true;el('start').disabled=true;el('stop').disabled=false;tick();
  }
  el('capture').addEventListener('click',()=>{
    if(running){display('Stop V4.12 Preview first.');return;}
    if(!prepare())return;
    if(references.length && viewSignature()!==signature){display('Camera/calibration changed. Clear V4.12 refs and capture empty again.');return;}
    if(references.length>=4){display('Four empty references already captured. Clear refs to start a new controlled session.');return;}
    const frame=grab(),c=document.createElement('canvas');c.width=frame.width;c.height=frame.height;
    c.getContext('2d').putImageData(frame,0,0);
    references.push({pixels:new Uint8ClampedArray(frame.data),gray:grayOf(frame.data),canvas:c});
    signature=viewSignature();if(!geometry)geometry=createGeometry();last=null;previous=[];
    previewCanvas('empty',references[0].canvas);
    display(`EMPTY ITO reference ${references.length}/4 captured in memory. Capture additional references only with NO droplets. This does not change V4.7–V4.10. Analyze droplet after placement.`);
  });
  el('start').addEventListener('click',start);
  el('stop').addEventListener('click',()=>{stop();display(`Preview stopped; ${references.length} V4.12 EMPTY reference(s) remain in page memory.`);});
  el('clear').addEventListener('click',()=>{stop();references=[];geometry=null;signature=null;last=null;
    el('export').disabled=true;display('V4.12 EMPTY reference library cleared. Legacy references/calibration unchanged.');});
  widthSelect.addEventListener('change',()=>{stop();references=[];geometry=null;signature=null;last=null;
    el('export').disabled=true;display('Resolution changed: V4.12-only EMPTY references cleared.');});
  thresholdSlider.addEventListener('input',()=>{el('tlabel').textContent=thresholdSlider.value;previous=[];});
  video.addEventListener('emptied',()=>{if(running)stop();});
  el('export').addEventListener('click',()=>{
    if(!last)return;
    const names=['empty','live','diff','mask'],canvases=names.map(el);
    const w=previewWidth,h=canvases[0].height;
    const out=document.createElement('canvas');out.width=2*w;out.height=2*(h+25);
    const p=out.getContext('2d');p.fillStyle='#fff';p.fillRect(0,0,out.width,out.height);
    names.forEach((name,j)=>{const x=(j%2)*w,y=Math.floor(j/2)*(h+25);
      p.fillStyle='#111827';p.font='14px sans-serif';p.fillText(name.toUpperCase(),x+4,y+17);
      p.drawImage(canvases[j],x,y+25,w,h);});
    const link=document.createElement('a');link.href=out.toDataURL('image/png');
    link.download='ewod-v412-diagnostics-'+new Date().toISOString().replace(/[:.]/g,'-')+'.png';link.click();
    const record={model:'v412-electrode-aware-experimental',timestamp:new Date().toISOString(),read_only:true,
      analysis:{width:last.w,height:last.h,threshold:+thresholdSlider.value,RGB:el('rgb').checked,
      multiEmpty:el('multiref').checked,ROIClip:el('roiclip').checked,emptyRefs:references.length,
      changedPixels:last.changed,accepted:last.accepted,rejected:last.rejected,registration:last.shiftsText,
      sceneChangeSuspected:last.sceneChanged,activeCells:last.activeCells,activeElectrodes:last.activeElectrodes,
      shiftResidual:last.shiftResidual,minimumSupport:+(el('minsize').value||60),edgeFilter:el('edge').checked},
      tentativeRegions:last.shortlist.map(c=>({channel:c.channels[0]?.channel||null,secondary:c.channels.slice(1,3),
        support:c.support,stableFrames:c.stableFrames,center:[c.centerX,c.centerY]}))};
    const blob=new Blob([JSON.stringify(record,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;
    a.download='ewod-v412-metadata-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  });
});
