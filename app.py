from flask import Flask, render_template_string

app = Flask(__name__)

HTML = """
<!doctype html>
<html>
<head>
    <title>EWOD Controller</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
        }

        .electrode {
            width: 70px;
            height: 70px;
            margin: 5px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 2px solid black;
            cursor: pointer;
            user-select: none;
        }

        .electrode.active {
            background: lightgray;
        }
    </style>
</head>

<body>

<h1>EWOD Controller</h1>

<p>Click an electrode to select it.</p>

<div id="chip">
    <div class="electrode" onclick="toggle(this)">1</div>
    <div class="electrode" onclick="toggle(this)">2</div>
    <div class="electrode" onclick="toggle(this)">3</div>
    <div class="electrode" onclick="toggle(this)">4</div>
    <div class="electrode" onclick="toggle(this)">5</div>
</div>

<h3>Selected electrode:</h3>
<p id="selected">None</p>

<script>
function toggle(el) {
    document.querySelectorAll('.electrode').forEach(e => {
        e.classList.remove('active');
    });

    el.classList.add('active');
    document.getElementById('selected').innerText = el.innerText;
}
</script>

</body>
</html>
"""

@app.route("/")
def index():
    return render_template_string(HTML)

if __name__ == "__main__":
    app.run(debug=True)
