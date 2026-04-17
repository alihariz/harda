"""Quick smoke-test for POST /api/v1/detection/analyse.
Starts the Flask dev server in a subprocess, runs the request, then shuts it down.
"""

import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

from pathlib import Path

BASE_URL = "http://127.0.0.1:5000/api/v1/detection/analyse"
HEALTH_URL = "http://127.0.0.1:5000/api/v1/auth/login"

# Real pothole image downloaded from the model's own validation set
TEST_IMAGE = Path(__file__).parent.parent / "ml" / "test_pothole.jpg"

# ── helpers ──────────────────────────────────────────────────────────────────

def load_test_image() -> bytes:
    with open(TEST_IMAGE, "rb") as f:
        return f.read()


def wait_for_server(retries: int = 20, delay: float = 1.0) -> bool:
    for _ in range(retries):
        try:
            urllib.request.urlopen(HEALTH_URL, timeout=2)
            return True
        except urllib.error.HTTPError:
            return True          # 405 Method Not Allowed = server is alive
        except Exception:
            time.sleep(delay)
    return False


def post_image(image_bytes: bytes) -> dict:
    boundary = "----HardaTestBoundary"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="test.jpg"\r\n'
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode() + image_bytes + f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        BASE_URL,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode())


# ── main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    python = sys.executable
    # FLASK_DEBUG=0 disables the Werkzeug reloader so the subprocess starts a
    # single plain server — no forking, no buffered-output race conditions.
    server = subprocess.Popen(
        [python, "run.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env={**os.environ, "FLASK_ENV": "development", "FLASK_DEBUG": "0"},
    )

    print("Starting Flask server …")
    if not wait_for_server():
        print("ERROR: server did not start in time.")
        server.kill()
        sys.exit(1)

    print(f"Server ready. Sending {TEST_IMAGE.name} …\n")
    try:
        result = post_image(load_test_image())
        print(json.dumps(result, indent=2))
    finally:
        server.kill()
        server.wait()
        print("\nServer stopped.")
