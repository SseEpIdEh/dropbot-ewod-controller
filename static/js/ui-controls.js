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

