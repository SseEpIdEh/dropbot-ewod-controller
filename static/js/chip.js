document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // EWOD SVG
    // =========================================================

    const svg = document.querySelector(".svg-wrapper svg");

    if (!svg) {
        console.error("EWOD SVG not found.");
        return;
    }


    // =========================================================
    // USER INTERFACE ELEMENTS
    // =========================================================

    const selectedDisplay =
        document.getElementById("selected-electrode");

    const clearElectrodesButton =
        document.getElementById("clear-electrodes");

    const durationInput =
        document.getElementById("step-duration");

    const voltageInput =
        document.getElementById("step-voltage");

    const frequencyInput =
        document.getElementById("step-frequency");

    const labelInput =
        document.getElementById("step-label");

    const addStepButton =
        document.getElementById("add-step");

    const updateStepButton =
        document.getElementById("update-step");

    const deleteStepButton =
        document.getElementById("delete-step");

    const clearProtocolButton =
        document.getElementById("clear-protocol");

    const firstButton =
        document.getElementById("first-step");

    const previousButton =
        document.getElementById("previous-step");

    const playButton =
        document.getElementById("play-protocol");

    const nextButton =
        document.getElementById("next-step");

    const lastButton =
        document.getElementById("last-step");

    const stopButton =
        document.getElementById("stop-protocol");

    const protocolBody =
        document.getElementById("protocol-body");

    const currentStepDisplay =
        document.getElementById("current-step-display");


    // =========================================================
    // ELECTRODE STATE
    // =========================================================

    const savedElectrodes = JSON.parse(
        localStorage.getItem("selectedElectrodes") || "[]"
    );

    const selectedElectrodes =
        new Set(savedElectrodes);

    const electrodePaths =
        new Map();

    let electrodeNumber = 1;


    svg.querySelectorAll("path").forEach((path) => {

        const style =
            path.getAttribute("style") || "";

        if (
            style.includes("fill:#FFFFFF") ||
            style.includes("fill:#ffffff")
        ) {

            const electrodeId =
                "E" +
                String(electrodeNumber).padStart(3, "0");

            path.classList.add("electrode");

            path.dataset.electrode =
                electrodeId;

            electrodePaths.set(
                electrodeId,
                path
            );

            if (
                selectedElectrodes.has(electrodeId)
            ) {
                path.classList.add("selected");
            }

            path.addEventListener(
                "click",
                (event) => {

                    event.stopPropagation();

                    if (protocolRunning) {
                        return;
                    }

                    toggleElectrode(
                        electrodeId
                    );
                }
            );

            electrodeNumber++;
        }
    });


    function toggleElectrode(id) {

        const path =
            electrodePaths.get(id);

        if (!path) {
            return;
        }

        if (
            selectedElectrodes.has(id)
        ) {

            selectedElectrodes.delete(id);

            path.classList.remove(
                "selected"
            );

        } else {

            selectedElectrodes.add(id);

            path.classList.add(
                "selected"
            );
        }

        saveSelectedElectrodes();

        updateSelectedDisplay();
    }


    function setSelectedElectrodes(ids) {

        selectedElectrodes.clear();

        electrodePaths.forEach(
            (path) => {

                path.classList.remove(
                    "selected"
                );
            }
        );

        ids.forEach((id) => {

            const path =
                electrodePaths.get(id);

            if (path) {

                selectedElectrodes.add(id);

                path.classList.add(
                    "selected"
                );
            }
        });

        saveSelectedElectrodes();

        updateSelectedDisplay();
    }


    function showRunningElectrodes(ids) {

        electrodePaths.forEach(
            (path) => {

                path.classList.remove(
                    "active-step"
                );
            }
        );

        ids.forEach((id) => {

            const path =
                electrodePaths.get(id);

            if (path) {

                path.classList.add(
                    "active-step"
                );
            }
        });
    }


    function clearRunningElectrodes() {

        electrodePaths.forEach(
            (path) => {

                path.classList.remove(
                    "active-step"
                );
            }
        );
    }


    function saveSelectedElectrodes() {

        localStorage.setItem(
            "selectedElectrodes",
            JSON.stringify(
                Array.from(
                    selectedElectrodes
                )
            )
        );
    }


    function updateSelectedDisplay() {

        if (
            selectedElectrodes.size === 0
        ) {

            selectedDisplay.textContent =
                "None";

        } else {

            selectedDisplay.textContent =
                Array.from(
                    selectedElectrodes
                ).join(", ");
        }
    }


    // =========================================================
    // PROTOCOL STATE
    // =========================================================

    let protocol = JSON.parse(
        localStorage.getItem("ewodProtocol") || "[]"
    );

    let currentStepIndex = -1;

    let selectedRowIndex = -1;

    let protocolRunning = false;

    let stopRequested = false;


    function saveProtocol() {

        localStorage.setItem(
            "ewodProtocol",
            JSON.stringify(protocol)
        );
    }


    // =========================================================
    // ADD NEW STEP
    // =========================================================

    function addProtocolStep() {

        if (
            selectedElectrodes.size === 0
        ) {

            alert(
                "Select at least one electrode first."
            );

            return;
        }

        const duration =
            Number(durationInput.value);

        const voltage =
            Number(voltageInput.value);

        const frequency =
            Number(frequencyInput.value);

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {

            alert(
                "Duration must be greater than 0."
            );

            return;
        }

        protocol.push({

            duration: duration,

            voltage: voltage,

            frequency: frequency,

            label:
                labelInput.value.trim(),

            electrodes:
                Array.from(
                    selectedElectrodes
                )
        });

        saveProtocol();

        selectedRowIndex =
            protocol.length - 1;

        currentStepIndex =
            selectedRowIndex;

        renderProtocol();
    }


    // =========================================================
    // UPDATE EXISTING STEP
    // =========================================================

    function updateSelectedStep() {

        if (protocolRunning) {
            return;
        }

        if (
            selectedRowIndex < 0 ||
            selectedRowIndex >= protocol.length
        ) {

            alert(
                "Select a protocol step first."
            );

            return;
        }

        if (
            selectedElectrodes.size === 0
        ) {

            alert(
                "Select at least one electrode."
            );

            return;
        }

        const duration =
            Number(durationInput.value);

        const voltage =
            Number(voltageInput.value);

        const frequency =
            Number(frequencyInput.value);

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {

            alert(
                "Duration must be greater than 0."
            );

            return;
        }

        protocol[selectedRowIndex] = {

            duration: duration,

            voltage: voltage,

            frequency: frequency,

            label:
                labelInput.value.trim(),

            electrodes:
                Array.from(
                    selectedElectrodes
                )
        };

        currentStepIndex =
            selectedRowIndex;

        saveProtocol();

        renderProtocol();

        currentStepDisplay.textContent =
            `${selectedRowIndex + 1} / ${protocol.length}`;
    }


    // =========================================================
    // DELETE ONE STEP
    // =========================================================

    function deleteSelectedStep() {

        if (protocolRunning) {
            return;
        }

        if (
            selectedRowIndex < 0 ||
            selectedRowIndex >= protocol.length
        ) {

            alert(
                "Select a protocol step first."
            );

            return;
        }

        protocol.splice(
            selectedRowIndex,
            1
        );

        saveProtocol();


        if (
            protocol.length === 0
        ) {

            selectedRowIndex = -1;

            currentStepIndex = -1;

            currentStepDisplay.textContent =
                "None";

            setSelectedElectrodes([]);

        } else {

            if (
                selectedRowIndex >=
                protocol.length
            ) {

                selectedRowIndex =
                    protocol.length - 1;
            }

            currentStepIndex =
                selectedRowIndex;

            loadStepIntoEditor(
                selectedRowIndex
            );
        }

        renderProtocol();
    }


    // =========================================================
    // LOAD A STEP FOR EDITING
    // =========================================================

    function loadStepIntoEditor(index) {

        if (
            index < 0 ||
            index >= protocol.length
        ) {

            return;
        }

        const step =
            protocol[index];

        durationInput.value =
            step.duration;

        voltageInput.value =
            step.voltage;

        frequencyInput.value =
            step.frequency;

        labelInput.value =
            step.label || "";

        setSelectedElectrodes(
            step.electrodes
        );

        currentStepDisplay.textContent =
            `${index + 1} / ${protocol.length}`;
    }


    // =========================================================
    // DRAW PROTOCOL TABLE
    // =========================================================

    function renderProtocol() {

        protocolBody.innerHTML = "";

        protocol.forEach(
            (step, index) => {

                const row =
                    document.createElement("tr");


                if (
                    index === currentStepIndex
                ) {

                    row.classList.add(
                        "current-protocol-step"
                    );
                }


                if (
                    index === selectedRowIndex
                ) {

                    row.classList.add(
                        "selected-protocol-step"
                    );
                }


                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${step.duration} s</td>
                    <td>${step.voltage} V</td>
                    <td>${step.frequency} Hz</td>
                    <td>${step.label || "-"}</td>
                    <td>${step.electrodes.join(", ")}</td>
                `;


                row.addEventListener(
                    "click",
                    () => {

                        if (
                            protocolRunning
                        ) {

                            return;
                        }

                        selectedRowIndex =
                            index;

                        currentStepIndex =
                            index;

                        clearRunningElectrodes();

                        loadStepIntoEditor(
                            index
                        );

                        renderProtocol();
                    }
                );


                protocolBody.appendChild(
                    row
                );
            }
        );
    }


    // =========================================================
    // MANUAL STEP NAVIGATION
    // =========================================================

    function showProtocolStep(
        index,
        running = false
    ) {

        if (
            index < 0 ||
            index >= protocol.length
        ) {

            return;
        }

        currentStepIndex =
            index;

        const step =
            protocol[index];

        currentStepDisplay.textContent =
            `${index + 1} / ${protocol.length}`;

        durationInput.value =
            step.duration;

        voltageInput.value =
            step.voltage;

        frequencyInput.value =
            step.frequency;

        labelInput.value =
            step.label || "";


        if (running) {

            showRunningElectrodes(
                step.electrodes
            );

        } else {

            clearRunningElectrodes();

            setSelectedElectrodes(
                step.electrodes
            );
        }

        renderProtocol();
    }


    function goToFirstStep() {

        if (
            protocol.length === 0 ||
            protocolRunning
        ) {

            return;
        }

        selectedRowIndex = 0;

        showProtocolStep(0);
    }


    function goToPreviousStep() {

        if (
            protocol.length === 0 ||
            protocolRunning
        ) {

            return;
        }

        if (
            currentStepIndex <= 0
        ) {

            currentStepIndex = 0;

        } else {

            currentStepIndex--;
        }

        selectedRowIndex =
            currentStepIndex;

        showProtocolStep(
            currentStepIndex
        );
    }


    function goToNextStep() {

        if (
            protocol.length === 0 ||
            protocolRunning
        ) {

            return;
        }

        if (
            currentStepIndex <
            protocol.length - 1
        ) {

            currentStepIndex++;
        }

        selectedRowIndex =
            currentStepIndex;

        showProtocolStep(
            currentStepIndex
        );
    }


    function goToLastStep() {

        if (
            protocol.length === 0 ||
            protocolRunning
        ) {

            return;
        }

        currentStepIndex =
            protocol.length - 1;

        selectedRowIndex =
            currentStepIndex;

        showProtocolStep(
            currentStepIndex
        );
    }


    // =========================================================
    // RUN PROTOCOL
    // =========================================================

    function sleep(ms) {

        return new Promise(
            (resolve) =>
                setTimeout(resolve, ms)
        );
    }


    async function runProtocol() {

        if (
            protocol.length === 0 ||
            protocolRunning
        ) {

            return;
        }

        protocolRunning = true;

        stopRequested = false;

        playButton.disabled = true;

        selectedRowIndex = -1;


        for (
            let i = 0;
            i < protocol.length;
            i++
        ) {

            if (stopRequested) {
                break;
            }

            showProtocolStep(
                i,
                true
            );

            const totalMs =
                protocol[i].duration *
                1000;

            const interval = 50;

            let elapsed = 0;


            while (
                elapsed < totalMs
            ) {

                if (stopRequested) {
                    break;
                }

                await sleep(interval);

                elapsed += interval;
            }


            if (stopRequested) {
                break;
            }
        }


        protocolRunning = false;

        playButton.disabled = false;

        clearRunningElectrodes();


        if (stopRequested) {

            currentStepDisplay.textContent =
                "Stopped";

        } else {

            currentStepDisplay.textContent =
                "Finished";
        }

        renderProtocol();
    }


    function stopProtocol() {

        if (protocolRunning) {

            stopRequested = true;
        }

        clearRunningElectrodes();
    }


    // =========================================================
    // CLEAR PROTOCOL
    // =========================================================

    function clearProtocol() {

        if (protocolRunning) {

            stopRequested = true;
        }

        protocol = [];

        currentStepIndex = -1;

        selectedRowIndex = -1;

        saveProtocol();

        clearRunningElectrodes();

        renderProtocol();

        currentStepDisplay.textContent =
            "None";
    }


    // =========================================================
    // BUTTON EVENTS
    // =========================================================

    clearElectrodesButton.addEventListener(
        "click",
        () => {

            if (!protocolRunning) {

                setSelectedElectrodes([]);
            }
        }
    );


    addStepButton.addEventListener(
        "click",
        addProtocolStep
    );


    updateStepButton.addEventListener(
        "click",
        updateSelectedStep
    );


    deleteStepButton.addEventListener(
        "click",
        deleteSelectedStep
    );


    clearProtocolButton.addEventListener(
        "click",
        clearProtocol
    );


    firstButton.addEventListener(
        "click",
        goToFirstStep
    );


    previousButton.addEventListener(
        "click",
        goToPreviousStep
    );


    playButton.addEventListener(
        "click",
        runProtocol
    );


    nextButton.addEventListener(
        "click",
        goToNextStep
    );


    lastButton.addEventListener(
        "click",
        goToLastStep
    );


    stopButton.addEventListener(
        "click",
        stopProtocol
    );


    // =========================================================
    // INITIAL STATE
    // =========================================================

    updateSelectedDisplay();

    renderProtocol();

    console.log(
        `EWOD UI ready. Found ${electrodeNumber - 1} candidate electrodes.`
    );

});
