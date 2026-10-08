from flask import Flask, render_template, request, jsonify
from pathlib import Path
from dropbot import SerialProxy
import time
import numpy as np
app = Flask(__name__)
DROPBOT_PORT = "/dev/cu.usbmodem39414101"
dropbot_proxy = None
@app.route("/")
def index():
    svg_path = Path(app.root_path) / "static" / "chip" / "ewod-chip.svg"
    svg_content = svg_path.read_text(encoding="utf-8")

    return render_template(
        "index.html",
        svg_content=svg_content
    )

@app.post("/api/dropbot/realtime")
def dropbot_realtime():

    global dropbot_proxy

    data = request.get_json(silent=True) or {}

    channels = data.get("channels", [])
    voltage = float(data.get("voltage", 100))
    frequency = float(data.get("frequency", 10000))
    duration = float(data.get("duration", 1))
    realtime_mode = data.get(
        "realtime_mode",
        False
    )

    # Safety: Realtime Mode must be ON.
    if not realtime_mode:
        return jsonify({
            "ok": False,
            "error": "Realtime Mode is OFF"
        }), 400

    # DropBot must be connected.
    if dropbot_proxy is None:
        return jsonify({
            "ok": False,
            "error": "DropBot is not connected"
        }), 400

    # At least one channel must be selected.
    if not channels:
        return jsonify({
            "ok": False,
            "error": "No channels selected"
        }), 400

    try:
        channels = [
            int(channel)
            for channel in channels
        ]

        print()
        print("==============================")
        print("REAL HARDWARE ACTUATION")
        print("==============================")
        print("Channels:", channels)
        print("Voltage:", voltage)
        print("Frequency:", frequency)
        print("Duration:", duration)

        # Make sure all electrodes start OFF.
        dropbot_proxy.turn_off_all_channels()

        # 1 = disabled
        # 0 = enabled
        mask = np.ones(
            dropbot_proxy.number_of_channels,
            dtype=np.uint8
        )

        # Enable only selected channels.
        for channel in channels:
            mask[channel] = 0

        dropbot_proxy.set_disabled_channels_mask(
            mask
        )

        # Set DropBot waveform.
        dropbot_proxy.frequency = frequency
        dropbot_proxy.voltage = voltage

        # Start with every channel OFF.
        states = (
            [0] *
            dropbot_proxy.number_of_channels
        )

        # Turn selected channels ON.
        for channel in channels:
            states[channel] = 1

        dropbot_proxy.set_state_of_channels(
            states,
            append=False,
            verify=True
        )

        # Read the actual states back.
        actual_states = {
            channel: int(
                dropbot_proxy
                .state_of_channels[channel]
            )
            for channel in channels
        }

        print(
            "Actual states:",
            actual_states
        )

        print("ACTUATION ON")

        # Keep electrode ON for requested time.
        time.sleep(duration)

        # Then turn everything OFF.
        dropbot_proxy.turn_off_all_channels()

        print("ALL CHANNELS OFF")
        print("==============================")
        print()

        return jsonify({
            "ok": True,
            "channels": channels,
            "actual_states": actual_states,
            "voltage": voltage,
            "frequency": frequency,
            "duration": duration,
            "hardware_actuation": True
        })

    except Exception as error:

        # Safety shutdown if anything fails.
        try:
            dropbot_proxy.turn_off_all_channels()
        except Exception:
            pass

        print(
            "Hardware actuation error:",
            repr(error)
        )

        return jsonify({
            "ok": False,
            "error": str(error)
        }), 500

@app.post("/api/dropbot/manual")
def dropbot_manual():
    global dropbot_proxy

    data = request.get_json(silent=True) or {}

    channels = data.get("channels", [])
    voltage = float(data.get("voltage", 140))
    frequency = float(data.get("frequency", 10000))
    realtime_mode = data.get(
        "realtime_mode",
        False
    )

    if dropbot_proxy is None:
        return jsonify({
            "ok": False,
            "error": "DropBot is not connected"
        }), 400

    try:
        channels = [
            int(channel)
            for channel in channels
        ]

        # Safety check
        number_of_channels = (
            dropbot_proxy.number_of_channels
        )

        for channel in channels:
            if (
                channel < 0 or
                channel >= number_of_channels
            ):
                raise ValueError(
                    f"Invalid channel: {channel}"
                )

        # Realtime OFF always means
        # physical hardware OFF.
        if not realtime_mode:
            dropbot_proxy.turn_off_all_channels()

            print(
                "MANUAL MODE OFF -> ALL CHANNELS OFF"
            )

            return jsonify({
                "ok": True,
                "channels": [],
                "hardware_actuation": False
            })

        # Realtime ON, but nothing selected.
        # Turn everything OFF.
        if not channels:
            dropbot_proxy.turn_off_all_channels()

            print(
                "MANUAL: no electrodes selected"
            )
            print("ALL CHANNELS OFF")

            return jsonify({
                "ok": True,
                "channels": [],
                "hardware_actuation": True
            })

        # Set waveform.
        dropbot_proxy.frequency = frequency
        dropbot_proxy.voltage = voltage

        # Disable every channel first.
        # 1 = disabled
        # 0 = enabled
        mask = np.ones(
            number_of_channels,
            dtype=np.uint8
        )

        for channel in channels:
            mask[channel] = 0

        dropbot_proxy.set_disabled_channels_mask(
            mask
        )

        # Build complete current hardware state.
        states = [0] * number_of_channels

        for channel in channels:
            states[channel] = 1

        dropbot_proxy.set_state_of_channels(
            states,
            append=False,
            verify=True
        )

        actual_states = {
            channel: int(
                dropbot_proxy
                .state_of_channels[channel]
            )
            for channel in channels
        }

        print()
        print("==============================")
        print("MANUAL REALTIME CONTROL")
        print("==============================")
        print("Channels ON:", channels)
        print("Voltage:", voltage)
        print("Frequency:", frequency)
        print("Actual states:", actual_states)
        print("==============================")
        print()

        return jsonify({
            "ok": True,
            "channels": channels,
            "actual_states": actual_states,
            "voltage": voltage,
            "frequency": frequency,
            "hardware_actuation": True
        })

    except Exception as error:

        try:
            dropbot_proxy.turn_off_all_channels()
        except Exception:
            pass

        print(
            "Manual actuation error:",
            repr(error)
        )

        return jsonify({
            "ok": False,
            "error": str(error)
        }), 500
@app.post("/api/dropbot/connect")
def dropbot_connect():

    global dropbot_proxy

    try:

        if dropbot_proxy is None:

            dropbot_proxy = SerialProxy(
                port=DROPBOT_PORT
            )

        
        display_name_raw = dropbot_proxy.display_name()

        display_name = "".join(
            chr(int(x))
            for x in display_name_raw
            if int(x) != 0
        )

        hardware_version = dropbot_proxy.hardware_version

        if isinstance(hardware_version, bytes):
            hardware_version = hardware_version.decode()

        software_raw = dropbot_proxy.software_version()

        software_version = ".".join(
            str(int(x))
            for x in software_raw
         )

        return jsonify({
            "ok": True,
            "connected": True,
            "display_name": display_name,
            "hardware_version": hardware_version,
            "software_version": software_version
        })


    except Exception as error:

        dropbot_proxy = None

        return jsonify({
            "ok": False,
            "connected": False,
            "error": str(error)
        }), 500







@app.post("/api/dropbot/disconnect")
def dropbot_disconnect():
    global dropbot_proxy

    try:
        if dropbot_proxy is not None:

            print()
            print("==============================")
            print("DROPBOT SAFE DISCONNECT")
            print("==============================")

            # Turn every electrode OFF first.
            try:
                dropbot_proxy.turn_off_all_channels()
                print("All channels OFF")
            except Exception as error:
                print(
                    "Could not turn channels off:",
                    error
                )

            # Disable all switching channels.
            try:
                dropbot_proxy.disable_all_channels()
                print("All channels disabled")
            except Exception as error:
                print(
                    "Could not disable channels:",
                    error
                )

            # Finally close communication.
            dropbot_proxy.terminate()
            dropbot_proxy = None

            print("DropBot disconnected")
            print("==============================")
            print()

        return jsonify({
            "ok": True,
            "connected": False,
            "hardware_channels_off": True
        })

    except Exception as error:

        print(
            "DropBot disconnect error:",
            repr(error)
        )

        dropbot_proxy = None

        return jsonify({
            "ok": False,
            "connected": False,
            "error": str(error)
        }), 500

if __name__ == "__main__":
    app.run(
    debug=True,
    port=5001,
    use_reloader=False
)
