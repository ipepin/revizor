# routers/export_office.py
from fastapi import APIRouter, Response, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from typing import Optional, Any, Dict, List
import os, io, json, tempfile, shutil, subprocess, sys
from datetime import datetime
from docxtpl import DocxTemplate

from database import get_db
from models import Revision  # tvoje SQLA modely

router = APIRouter(prefix="/export", tags=["export"])

TEMPLATE_PATH = os.getenv("REVIZE_DOCX_TEMPLATE", os.path.join("templates", "revizni_zprava_docxtpl.docx"))

def dash(v: Any) -> str:
    s = "" if v is None else str(v)
    return s.strip() if s.strip() else "—"

def _pick(d: dict, keys: List[str], default: str = "") -> str:
    for k in keys:
        v = d.get(k)
        if v not in (None, "", []):
            return str(v)
    return default

def _normalize_components(list_: List[dict]) -> List[dict]:
    """Zjednodušený flatten strom stejně jako ve FE (bez všech variant)."""
    items = list(list_ or [])
    out: List[dict] = []

    # varianta s 'children'
    if any(isinstance(x.get("children"), list) and x["children"] for x in items if isinstance(x, dict)):
        def walk(arr: List[dict], level: int):
            for n in arr:
                n2 = dict(n)
                n2["_level"] = level
                n2.pop("children", None)
                out.append(n2)
                kids = n.get("children") or []
                if isinstance(kids, list) and kids:
                    walk(kids, level + 1)
        walk(items, 0)
        return out

    # fallback: uložená úroveň
    for k in items:
        k2 = dict(k)
        k2["_level"] = int(k2.get("uroven") or k2.get("level") or k2.get("depth") or 0)
        out.append(k2)
    return out

def _depth_prefix(level: int) -> str:
    if level <= 0: return ""
    if level == 1: return "└─ "
    return "│ " * (level - 1) + "└─ "

def _seg(label: str, val: str, unit: str = "") -> str:
    if not val: return ""
    return f"{label}: {val} {unit}".strip()

def _pick_first(c: dict, keys: List[str]) -> str:
    for k in keys:
        v = c.get(k)
        if v not in (None, ""):
            return str(v)
    return ""

def _build_component_line(c: dict) -> str:
    parts: List[str] = []
    parts.append(_seg("typ", _pick_first(c, ["typ", "type", "druh"])))
    parts.append(_seg("póly", _pick_first(c, ["poles", "poly"])))
    parts.append(_seg("dim.", _pick_first(c, ["dimenze", "dim", "prurez"])))
    parts.append(_seg("Riso", _pick_first(c, ["riso", "Riso"]), "MΩ"))
    parts.append(_seg("Zs", _pick_first(c, ["zs", "Zs", "ochrana"]), "Ω"))
    parts.append(_seg("t", _pick_first(c, ["t","time","trip_time","vybavovaci_cas"]), "ms"))
    parts.append(_seg("IΔ", _pick_first(c, ["ifi","i_fi","iDelta","i_delta","i_delta_n","idn","rcd_trip_current","vybavovaci_proud"]), "mA"))
    parts.append(_seg("Uᵢ", _pick_first(c, ["ui","u_i","ut","u_touch","dotykove_napeti"]), "V"))
    parts.append(_seg("Pozn.", _pick_first(c, ["poznamka","pozn","note"])))
    return "   •   ".join([p for p in parts if p])

def _build_docx_context(rev: Revision) -> Dict[str, Any]:
    data = rev.data_json or {}
    # FE „safeForm“ -> tady se snažíme o kompatibilitu
    norms = (data.get("norms") or []) + [x for x in [data.get("customNorm1"), data.get("customNorm2"), data.get("customNorm3")] if x]
    safety = (data.get("conclusion") or {}).get("safety")
    if safety == "able":
        safety_label = "Elektrická instalace je z hlediska bezpečnosti schopna provozu"
    elif safety == "not_able":
        safety_label = "Elektrická instalace není z hlediska bezpečnosti schopna provozu"
    else:
        safety_label = dash(safety)

    # zkoušky – převod na {name, note}
    tests_obj = data.get("tests") or {}
    tests_rows = []
    for k, v in tests_obj.items():
        note = ""
        if isinstance(v, str): note = v
        elif isinstance(v, dict): note = v.get("note") or (v.get("result") or {}).get("note") or v.get("result") or ""
        tests_rows.append({"name": k, "note": str(note or "")})

    # přístroje – vezmeme jen označené (selected=true/checked=true), jinak všechny
    instruments = []
    raw_insts = data.get("instruments") or []
    any_checked = any(bool(i.get("selected") or i.get("checked")) for i in raw_insts if isinstance(i, dict))
    for i in raw_insts:
        if any_checked and not (i.get("selected") or i.get("checked")):
            continue
        instruments.append({
            "name": dash(i.get("name")),
            "serial": dash(i.get("serial") or i.get("serial_no") or i.get("sn")),
            "calibration": dash(i.get("calibration_list") or i.get("calibration")),
        })

    # boards -> flatten komponent
    boards_ctx = []
    for b in data.get("boards") or []:
        flat = _normalize_components(b.get("komponenty") or [])
        comps = []
        for c in flat:
            comps.append({
                "indent": "\t" * max(0, int(c.get("_level") or 0)),
                "treePrefix": _depth_prefix(int(c.get("_level") or 0)),
                "name": dash(c.get("nazev") or c.get("name")),
                "desc": dash(c.get("popis") or c.get("description") or ""),
                "line": _build_component_line(c),
            })
        boards_ctx.append({
            "name": dash(b.get("name")),
            "vyrobce": dash(b.get("vyrobce")),
            "typ": dash(b.get("typ")),
            "umisteni": dash(b.get("umisteni")),
            "vyrobniCislo": dash(b.get("vyrobniCislo")),
            "napeti": dash(b.get("napeti")),
            "odpor": dash(b.get("odpor")),
            "ip": dash(b.get("ip")),
            "components_flat": comps,
        })

    # rooms
    rooms_ctx = []
    for r in data.get("rooms") or []:
        devs = []
        for d in r.get("devices") or []:
            devs.append({
                "typ": dash(d.get("typ")),
                "pocet": dash(d.get("pocet")),
                "dimenze": dash(d.get("dimenze")),
                "riso": dash(d.get("riso")),
                "ochrana": dash(d.get("ochrana")),
                "note": dash(d.get("podrobnosti") or d.get("note")),
            })
        rooms_ctx.append({
            "name": dash(r.get("name")),
            "note": dash(r.get("details")),
            "devices": devs,
        })

    # defects
    defects_ctx = []
    for d in data.get("defects") or []:
        defects_ctx.append({
            "description": dash(d.get("description")),
            "standard": dash(d.get("standard")),
            "article": dash(d.get("article")),
        })

    head = {
        "evidencni_cislo": dash(data.get("evidencni") or rev.number or rev.id),
        "typ_revize": dash(data.get("typRevize") or rev.type),
        "datum_zahajeni": dash(data.get("date_start")),
        "datum_ukonceni": dash(data.get("date_end")),
        "datum_zpravy": dash(data.get("date_created") or (rev.date_done.isoformat() if getattr(rev, "date_done", None) else "")),
        "normy": ", ".join([str(x) for x in norms]) if norms else "",
    }

    rt = {
        "jmeno": dash((data.get("technician") or {}).get("jmeno")),  # pokud ukládáš do formu
        "firma": dash((data.get("technician") or {}).get("firma")),
        "cislo_osvedceni": dash((data.get("technician") or {}).get("cislo_osvedceni")),
        "cislo_opravneni": dash((data.get("technician") or {}).get("cislo_opravneni")),
        "ico": dash((data.get("technician") or {}).get("ico")),
        "dic": dash((data.get("technician") or {}).get("dic")),
        "adresa": dash((data.get("technician") or {}).get("adresa")),
        "phone": dash((data.get("technician") or {}).get("phone")),
        "email": dash((data.get("technician") or {}).get("email")),
    }

    ctx = {
        "head": head,
        "rt": rt,
        "objekt": {
            "adresa": dash(data.get("adresa")),
            "predmet": dash(data.get("objekt")),
            "objednatel": dash(data.get("objednatel")),
        },
        "instruments": instruments,
        "ident": {
            "mont_firma": dash(data.get("montFirma")),
            "mont_firma_opravneni": dash(data.get("montFirmaAuthorization")),
            "zakladni_ochrana": ", ".join(data.get("protection_basic") or []),
            "ochrana_pri_poruse": ", ".join(data.get("protection_fault") or []),
            "doplnkova_ochrana": ", ".join(data.get("protection_additional") or []),
            "popis_objektu": data.get("inspectionDescription") or "",
            "voltage": dash(data.get("voltage")),
            "sit": dash(data.get("sit")),
            "documentation": dash(data.get("documentation")),
            "environment": dash(data.get("environment")),
            "prilohy": dash(data.get("extraNotes")),
        },
        "prohlidka_ukony": [str(x) for x in (data.get("performedTasks") or [])],
        "zkousky": tests_rows,
        "boards": boards_ctx,
        "rooms": rooms_ctx,
        "defects": defects_ctx,
        "zaver": {
            "text": dash((data.get("conclusion") or {}).get("text")),
            "bezpecnost": safety_label,
            "pristi_revize": dash((data.get("conclusion") or {}).get("validUntil")),
        },
    }
    return ctx

def _ensure_template_exists():
    if not os.path.isfile(TEMPLATE_PATH):
        raise HTTPException(status_code=404, detail=f"Šablona DOCX nenalezena: {TEMPLATE_PATH}")

@router.get("/summary-docx")
def export_summary_docx(
    rev_id: int = Query(..., description="ID revize"),
    db: Session = Depends(get_db),
):
    _ensure_template_exists()
    rev = db.query(Revision).filter(Revision.id == rev_id).first()
    if not rev:
        raise HTTPException(status_code=404, detail="Revize nenalezena")

    ctx = _build_docx_context(rev)

    doc = DocxTemplate(TEMPLATE_PATH)
    doc.render(ctx)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)

    file_id = ctx["head"]["evidencni_cislo"] or f"{rev_id}"
    filename = f"revizni_zprava_{file_id}.docx"

    return Response(
        content=buf.read(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

def _find_soffice() -> Optional[str]:
    # pokusíme se najít soffice napříč OS
    candidates = [
        shutil.which("soffice"),
        shutil.which("libreoffice"),
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "/usr/bin/soffice",
        "/usr/local/bin/soffice",
    ]
    for c in candidates:
        if c and os.path.isfile(c):
            return c
    return None

@router.get("/summary-pdf")
def export_summary_pdf_from_docx(
    rev_id: int = Query(..., description="ID revize"),
    db: Session = Depends(get_db),
):
    _ensure_template_exists()
    soffice = _find_soffice()
    if not soffice:
        raise HTTPException(status_code=500, detail="LibreOffice (soffice) nebyl nalezen v PATH. Nainstaluj LibreOffice.")

    rev = db.query(Revision).filter(Revision.id == rev_id).first()
    if not rev:
        raise HTTPException(status_code=404, detail="Revize nenalezena")

    ctx = _build_docx_context(rev)

    with tempfile.TemporaryDirectory() as tmp:
        in_docx = os.path.join(tmp, "report.docx")
        out_pdf = os.path.join(tmp, "report.pdf")

        doc = DocxTemplate(TEMPLATE_PATH)
        doc.render(ctx)
        doc.save(in_docx)

        # konverze do PDF
        cmd = [soffice, "--headless", "--convert-to", "pdf:writer_pdf_Export", "--outdir", tmp, in_docx]
        try:
            subprocess.check_output(cmd, stderr=subprocess.STDOUT)
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"Konverze do PDF selhala: {e.output.decode(errors='ignore')}")

        if not os.path.exists(out_pdf):
            raise HTTPException(status_code=500, detail="PDF nebylo vytvořeno.")

        with open(out_pdf, "rb") as f:
            pdf_bytes = f.read()

    file_id = ctx["head"]["evidencni_cislo"] or f"{rev_id}"
    filename = f"revizni_zprava_{file_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
