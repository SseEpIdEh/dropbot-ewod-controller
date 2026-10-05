from flask import Flask, render_template
from pathlib import Path

app = Flask(__name__)

@app.route("/")
def index():
    svg_path = Path(app.root_path) / "static" / "chip" / "ewod-chip.svg"
    svg_content = svg_path.read_text(encoding="utf-8")

    return render_template(
        "index.html",
        svg_content=svg_content
    )

if __name__ == "__main__":
    app.run(debug=True, port=5001)
