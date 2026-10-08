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
    // VIDEO RECORDING
    // =====================================================

    function startRecording() {

        if (!cameraStream) {

            alert(
                "Start the camera first."
            );

            return;
        }

        recordedChunks = [];

        mediaRecorder =
            new MediaRecorder(
                cameraStream
            );

        mediaRecorder.addEventListener(
            "dataavailable",
            (event) => {

                if (event.data.size > 0) {

                    recordedChunks.push(
                        event.data
                    );
                }
            }
        );

        mediaRecorder.addEventListener(
            "stop",
            () => {

                const blob =
                    new Blob(
                        recordedChunks,
                        {
                            type: "video/webm"
                        }
                    );

                const url =
                    URL.createObjectURL(
                        blob
                    );

                const link =
                    document.createElement(
                        "a"
                    );

                link.href = url;

                link.download =
                    `ewod-experiment-${Date.now()}.webm`;

                link.click();

                URL.revokeObjectURL(
                    url
                );
            }
        );

        mediaRecorder.start();

        startRecordingButton.disabled =
            true;

        stopRecordingButton.disabled =
            false;

        cameraStatus.textContent =
            "Recording";
    }


    function stopRecording() {

        if (
            mediaRecorder &&
            mediaRecorder.state !==
                "inactive"
        ) {

            mediaRecorder.stop();
        }

        startRecordingButton.disabled =
            false;

        stopRecordingButton.disabled =
            true;

        cameraStatus.textContent =
            "Connected";
    }


    if (
        startRecordingButton &&
        stopRecordingButton
    ) {

        startRecordingButton.addEventListener(
            "click",
            startRecording
        );

        stopRecordingButton.addEventListener(
            "click",
            stopRecording
        );
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
                Droplet Vision V2
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

        /*
        Region of interest.

        This intentionally ignores much of the outside
        PCB and the large upper/lower copper areas.
        */

        const ROI_LEFT = 0.16;
        const ROI_RIGHT = 0.84;

        const ROI_TOP = 0.17;
        const ROI_BOTTOM = 0.84;


        let backgroundImage = null;

        let backgroundGray = null;

        let visionEnabled = false;

        let previousBlob = null;

        let lastProcessTime = 0;


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
        // RGB -> GRAY
        // =====================================================

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
        // ROI BOUNDS
        // =====================================================

        function getROI() {

            const w =
                analysisCanvas.width;

            const h =
                analysisCanvas.height;

            return {
                left:
                    Math.round(
                        w * ROI_LEFT
                    ),

                right:
                    Math.round(
                        w * ROI_RIGHT
                    ),

                top:
                    Math.round(
                        h * ROI_TOP
                    ),

                bottom:
                    Math.round(
                        h * ROI_BOTTOM
                    )
            };
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


                analysisContext.drawImage(
                    video,
                    0,
                    0,
                    analysisCanvas.width,
                    analysisCanvas.height
                );


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


                previousBlob = null;


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
            }
        );


        // =====================================================
        // VISION TOGGLE
        // =====================================================

        toggleButton.addEventListener(
            "click",
            () => {

                if (!backgroundImage) {

                    statusDisplay.textContent =
                        "Capture empty chip first";

                    return;
                }


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


            analysisContext.drawImage(
                video,
                0,
                0,
                analysisCanvas.width,
                analysisCanvas.height
            );


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


            const mask =
                new Uint8Array(
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


                    const difference =
                        Math.abs(
                            backgroundGray[
                                backgroundIndex
                            ] -
                            currentGray[
                                currentIndex
                            ]
                        );


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


            const cleanedMask =
                cleanMask(
                    mask,
                    width,
                    height
                );


            const blobs =
                findBlobs(
                    cleanedMask,
                    width,
                    height
                );


            const result =
                chooseBlob(
                    blobs
                );


            const blob =
                result.blob;

            const confidence =
                result.confidence;


            /*
            Require moderate confidence before calling
            it a droplet.
            */

            if (
                blob &&
                confidence >= 0.35
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

                statusDisplay.textContent =
                    "Droplet candidate tracked";


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

                statusDisplay.textContent =
                    "No confident droplet candidate";


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
        }


        requestAnimationFrame(
            processFrame
        );
    }
);
