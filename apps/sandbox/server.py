"""Genyxo code sandbox.

Runs untrusted Python from chat models in a throwaway directory and returns
stdout, errors, charts and files. Safety comes in layers: the container has
no network route out, a read-only filesystem, no root and capped resources;
every run is a separate process with CPU, memory, file-size and process
limits and a wall-clock timeout. Only the backend, holding SANDBOX_TOKEN,
can reach it.
"""

import base64
import hmac
import json
import mimetypes
import os
import re
import resource
import shutil
import subprocess
import sys
import tempfile
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ.get("SANDBOX_TOKEN", "")
PORT = int(os.environ.get("PORT", "8080"))
MAX_BODY = 60 * 1024 * 1024
MAX_INPUT_FILES = 20
MAX_OUTPUT_FILES = 12
MAX_OUTPUT_BYTES = 30 * 1024 * 1024
MAX_STREAM = 20_000
RUNNER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "runner.py")
SLOTS = int(os.environ.get("SANDBOX_CONCURRENCY", "4"))
_busy = [0]


def safe_name(name: str) -> str:
    base = os.path.basename(str(name or "file")).strip().replace("\x00", "")
    base = re.sub(r"[^\w.\- ()\[\]]+", "_", base, flags=re.UNICODE).strip(". ")
    return (base or "file")[:120]


def limits(cpu_seconds: int):
    def apply():
        os.setsid()
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 2))
        memory = 2 * 1024 * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (memory, memory))
        resource.setrlimit(resource.RLIMIT_FSIZE, (50 * 1024 * 1024, 50 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_NPROC, (256, 256))
        resource.setrlimit(resource.RLIMIT_NOFILE, (256, 256))
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))

    return apply


def clip(text: bytes) -> str:
    value = text.decode("utf-8", errors="replace")
    if len(value) > MAX_STREAM:
        half = MAX_STREAM // 2
        value = f"{value[:half]}\n… [{len(value) - MAX_STREAM} characters cut] …\n{value[-half:]}"
    return value


def run(payload: dict) -> dict:
    code = str(payload.get("code") or "")
    if not code.strip():
        return {"ok": False, "error": "No code to run"}
    if len(code) > 200_000:
        return {"ok": False, "error": "The code is too long"}
    timeout = max(5, min(int(payload.get("timeout") or 60), 120))
    work = tempfile.mkdtemp(prefix="run-", dir="/tmp")
    try:
        os.makedirs(os.path.join(work, "input"))
        os.makedirs(os.path.join(work, "output"))
        names = []
        for item in (payload.get("files") or [])[:MAX_INPUT_FILES]:
            name = safe_name(item.get("name"))
            stem, ext = os.path.splitext(name)
            candidate, n = name, 2
            while candidate in names:
                candidate = f"{stem} ({n}){ext}"
                n += 1
            with open(os.path.join(work, "input", candidate), "wb") as handle:
                handle.write(base64.b64decode(item.get("data") or "", validate=False))
            names.append(candidate)
        with open(os.path.join(work, "main.py"), "w", encoding="utf-8") as handle:
            handle.write(code)
        env = {
            "HOME": work,
            "PATH": "/usr/local/bin:/usr/bin:/bin",
            "MPLBACKEND": "Agg",
            # Font cache built into the image; runs only read it.
            "MPLCONFIGDIR": "/opt/mpl",
            "PYTHONDONTWRITEBYTECODE": "1",
            "PYTHONIOENCODING": "utf-8",
            "OPENBLAS_NUM_THREADS": "2",
            "OMP_NUM_THREADS": "2",
        }
        started = time.monotonic()
        timed_out = False
        process = subprocess.Popen(
            [sys.executable, "-I", "-X", "utf8", RUNNER],
            cwd=work,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=limits(timeout),
        )
        try:
            stdout, stderr = process.communicate(timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            os.killpg(process.pid, 9)
            stdout, stderr = process.communicate()
        elapsed = round(time.monotonic() - started, 2)

        outputs, total = [], 0
        out_dir = os.path.join(work, "output")
        for name in sorted(os.listdir(out_dir), key=lambda n: os.path.getmtime(os.path.join(out_dir, n))):
            path = os.path.join(out_dir, name)
            if not os.path.isfile(path) or os.path.islink(path):
                continue
            size = os.path.getsize(path)
            if len(outputs) >= MAX_OUTPUT_FILES or total + size > MAX_OUTPUT_BYTES:
                break
            total += size
            with open(path, "rb") as handle:
                data = handle.read()
            outputs.append(
                {
                    "name": safe_name(name),
                    "mime": mimetypes.guess_type(name)[0] or "application/octet-stream",
                    "size": size,
                    "data": base64.b64encode(data).decode("ascii"),
                }
            )
        error = None
        if timed_out:
            error = f"The code ran longer than {timeout} seconds and was stopped."
        elif process.returncode != 0:
            tail = clip(stderr).strip().splitlines()
            error = tail[-1] if tail else f"The code exited with status {process.returncode}."
            if process.returncode in (-9, 137) and not tail:
                error = "The code used too much memory or CPU time and was stopped."
        return {
            "ok": error is None,
            "stdout": clip(stdout),
            "stderr": clip(stderr),
            "error": error,
            "seconds": elapsed,
            "inputs": names,
            "files": outputs,
        }
    finally:
        shutil.rmtree(work, ignore_errors=True)


class Handler(BaseHTTPRequestHandler):
    server_version = "GenyxoSandbox/1.0"

    def log_message(self, fmt, *args):  # Code and data never reach the logs.
        sys.stderr.write("%s %s\n" % (self.command, self.path))

    def reply(self, status: int, body: dict):
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/health":
            return self.reply(200, {"ok": True, "busy": _busy[0], "slots": SLOTS})
        return self.reply(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/run":
            return self.reply(404, {"error": "Not found"})
        supplied = self.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if not TOKEN or not hmac.compare_digest(supplied, TOKEN):
            return self.reply(401, {"error": "Unauthorized"})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self.reply(413, {"error": "Request too large"})
        if _busy[0] >= SLOTS:
            return self.reply(503, {"error": "The sandbox is busy, try again in a moment"})
        _busy[0] += 1
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
            return self.reply(200, run(payload))
        except Exception as error:  # noqa: BLE001 - report, never crash the server
            return self.reply(500, {"ok": False, "error": f"Sandbox error: {type(error).__name__}"})
        finally:
            _busy[0] -= 1


if __name__ == "__main__":
    if not TOKEN:
        sys.stderr.write("SANDBOX_TOKEN is not set; every request will be refused\n")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
