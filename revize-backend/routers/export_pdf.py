# routers/export_chrome.py
from __future__ import annotations
import os, sys, shutil, tempfile, subprocess
from urllib.parse import urlencode
from fastapi import APIRouter, Request
from fastapi.responses import Response, JSONResponse

router = APIRouter(prefix="/export", tags=["export"])

def _find_browser() -> str | None:
    # 1) env proměnné
    for key in ["BROWSER_EXECUTABLE", "CHROME_PATH", "GOOGLE_CHROME_BIN", "PUPPETEER_EXECUTABLE_PATH", "CHROMIUM_PATH"]:
        p = os.getenv(key)
        if p and os.path.exists(p):
            return p
    # 2) Windows – typické cesty (Edge/Chrome)
    if sys.platform.startswith("win"):
        local = os.getenv("LOCALAPPDATA", "")
        candidates = [
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        ]
        if local:
            candidates += [
                os.path.join(local, r"Microsoft\Edge\Application\msedge.exe"),
                os.path.join(local, r"Google\Chrome\Application\chrome.exe"),
            ]
        for p in candidates:
            if os.path.exists(p):
                return p
    # 3) PATH (Linux/mac)
    for name in ["msedge", "google-chrome-stable", "google-chrome", "chromium", "chromium-browser"]:
        exe = shutil.which(name)
        if exe and os.path.exists(exe):
            return exe
    return None

def _front_base(request: Request, override: str | None) -> str:
    if override:
        return override.rstrip("/")
    # rozumný default pro dev
    return "http://localhost:5173"

@router.get("/summary-chromepdf")
async def summary_chromepdf(
    request: Request,
    rev_id: str,
    file_id: str = "vystup",
    front_base: str | None = None,
    print_token: str | None = None,          # volitelné: když chceš tokenem obejít auth
    selector: str = "#report-content, .a4",  # pro budoucí vylepšení (nevyužito chrome CLI)
):
    browser = _find_browser()
    if not browser:
        return JSONResponse(status_code=500, content={
            "error": "Nenalezen Chrome/Edge. Nastav BROWSER_EXECUTABLE nebo nainstaluj Edge/Chrome."
        })

    base = _front_base(request, front_base)
    # předáme volitelně krátkodobý token FE (FE si ho může v onload uložit do localStorage)
    query = {"print": "1"}
    if print_token:
        query["print_token"] = print_token

    url = f"{base}/revisions/{rev_id}/summary?{urlencode(query)}"

    # vytvoříme dočasný soubor pro výstup
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        out_path = tmp.name
    # spustíme Chrome/Edge v headless režimu
    cmd = [
        browser,
        "--headless=new",              # novější headless (lepší typografie)
        "--disable-gpu",
        "--no-sandbox",
        f'--print-to-pdf={out_path}',
        "--print-to-pdf-no-header",   # bez záhlaví URL/čísla strany
        url,
    ]
    try:
        # Windows: nutné shell=False (až na speciální případy)
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    except Exception as e:
        try:
            os.unlink(out_path)
        except Exception:
            pass
        return JSONResponse(status_code=500, content={"error": f"Chrome spawn failed: {e}"})

    if proc.returncode != 0:
        # log do odpovědi, ať víš proč (stderr bývá užitečný)
        try:
            os.unlink(out_path)
        except Exception:
            pass
        return JSONResponse(status_code=500, content={
            "error": f"Chrome exited with {proc.returncode}",
            "stderr": proc.stderr.decode("utf-8", errors="ignore")[-4000:],
        })

    try:
        with open(out_path, "rb") as f:
            pdf = f.read()
    finally:
        try:
            os.unlink(out_path)
        except Exception:
            pass

    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="revizni_zprava_{file_id}.pdf"'},
    )
