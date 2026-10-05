document.addEventListener("DOMContentLoaded", () => {

    const svg =
        document.querySelector(".svg-wrapper svg");

    const toggleRoutesButton =
        document.getElementById("toggle-routes");

    if (!svg) {
        console.error("EWOD SVG not found.");
        return;
    }

    if (!toggleRoutesButton) {
        console.error(
            "Show/Hide Routes button not found."
        );
        return;
    }

    let routesVisible = true;

    function setRoutesVisible(visible) {

        routesVisible = visible;

        const routePaths =
            svg.querySelectorAll(
                'path[id^="line"]'
            );

        routePaths.forEach((path) => {

            path.style.display =
                visible ? "" : "none";

        });

        toggleRoutesButton.textContent =
            visible
                ? "Hide Routes"
                : "Show Routes";

        console.log(
            `Routes visible: ${visible}`
        );
    }

    toggleRoutesButton.addEventListener(
        "click",
        () => {

            setRoutesVisible(
                !routesVisible
            );

        }
    );

// =====================================================
// CAMERA CONTROLS
// =====================================================

const cameraFeed =
    document.getElementById("camera-feed");

const cameraSelect =
    document.getElementById("camera-select");

const startCameraButton =
    document.getElementById("start-camera");

const stopCameraButton =
    document.getElementById("stop-camera");

const cameraStatus =
    document.getElementById("camera-status");

let cameraStream = null;


async function updateCameraList() {

    if (!navigator.mediaDevices) {
        console.error("Media devices API unavailable.");
        return;
    }

    const devices =
        await navigator.mediaDevices.enumerateDevices();

    const cameras =
        devices.filter(
            device =>
                device.kind === "videoinput"
        );

    cameraSelect.innerHTML =
        '<option value="">Default Camera</option>';

    cameras.forEach((camera, index) => {

        const option =
            document.createElement("option");

        option.value =
            camera.deviceId;

        option.textContent =
            camera.label ||
            `Camera ${index + 1}`;

        cameraSelect.appendChild(option);
    });
}

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
            document.getElementById(
                "camera-mode"
            ).value;


        let width = 1920;
        let height = 1080;
        let frameRate = 30;


        if (cameraMode === "detail") {

            width = 1920;
            height = 1440;
            frameRate = 30;

        } else if (cameraMode === "speed") {

            width = 1920;
            height = 1080;
            frameRate = 60;
        }


        let videoConstraints = {

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


        cameraStatus.textContent =
            "Connected";


        await updateCameraList();


        const track =
            cameraStream
                .getVideoTracks()[0];

        const settings =
            track.getSettings();


        console.log(
            "Camera mode:",
            cameraMode
        );

        console.log(
            "Actual camera settings:",
            settings
        );


        cameraStatus.textContent =
            `Connected — ${settings.width}×${settings.height} @ ${Math.round(settings.frameRate)} fps`;

    } catch (error) {

        console.error(
            "Camera error:",
            error
        );

        cameraStatus.textContent =
            "Camera Error";
    }
}
       

function stopCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track => track.stop()
            );

        cameraStream = null;
    }

    cameraFeed.srcObject = null;

    cameraStatus.textContent =
        "Off";

    console.log("Camera stopped.");
}


if (
    cameraFeed &&
    cameraSelect &&
    startCameraButton &&
    stopCameraButton
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
const cameraModeSelect =
    document.getElementById(
        "camera-mode"
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

} else {

    console.error(
        "One or more camera controls were not found."
    );
}

// =====================================================
// CAMERA ZOOM
// =====================================================

const cameraZoom =
    document.getElementById("camera-zoom");

const cameraZoomValue =
    document.getElementById("camera-zoom-value");

if (cameraZoom && cameraZoomValue && cameraFeed) {

    cameraZoom.addEventListener(
        "input",
        () => {

            const zoom =
                parseFloat(cameraZoom.value);

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

const startRecordingButton =
    document.getElementById("start-recording");

const stopRecordingButton =
    document.getElementById("stop-recording");

let mediaRecorder = null;
let recordedChunks = [];


function startRecording() {

    if (!cameraStream) {

        alert("Start the camera first.");
        return;
    }

    recordedChunks = [];

    mediaRecorder =
        new MediaRecorder(cameraStream);

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
                URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            const now =
                new Date();

            const timestamp =
                now.toISOString()
                    .replaceAll(":", "-")
                    .replace(".", "-");

            link.href = url;

            link.download =
                `ewod-experiment-${timestamp}.webm`;

            link.click();

            URL.revokeObjectURL(url);
        }
    );

    mediaRecorder.start();

    startRecordingButton.disabled =
        true;

    stopRecordingButton.disabled =
        false;

    cameraStatus.textContent =
        "Recording";

    console.log(
        "Video recording started."
    );
}


function stopRecording() {

    if (
        mediaRecorder &&
        mediaRecorder.state !== "inactive"
    ) {

        mediaRecorder.stop();
    }

    startRecordingButton.disabled =
        false;

    stopRecordingButton.disabled =
        true;

    cameraStatus.textContent =
        "Connected";

    console.log(
        "Video recording stopped."
    );
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
// SHOW / HIDE ELECTRODE IDS
// =====================================================

const toggleElectrodeIdsButton =
    document.getElementById("toggle-electrode-ids");

let electrodeIdsVisible = false;

function showElectrodeIds() {

    if (!svg) {
        return;
    }

    const existingLabels =
        svg.querySelectorAll(".electrode-id-label");

    existingLabels.forEach(
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

        text.textContent =
            path.id.replace("electrode",""),10);

        svg.appendChild(text);
    });
}


function hideElectrodeIds() {

    const labels =
        svg.querySelectorAll(
            ".electrode-id-label"
        );

    labels.forEach(
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

});
