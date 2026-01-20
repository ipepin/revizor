"""
Seed default norms for EI scope from a CSV list.

Usage:
    python seed_norms.py
"""

from datetime import datetime
from io import StringIO
import csv

from sqlalchemy.orm import Session

from database import SessionLocal
from models import Norm, NormScope


CSV_DATA = """Platnost,Skupina,Norma,Edice/Rok,Název / oblast,Vydána,Zrušena od,Souběžná platnost do,Nahrazuje,Nahrazena,Účinnost od,Zdroj (URL)
PLATNÁ,Instalace NN (soubor 33 2000),ČSN 33 2000-1,,"Základní hlediska, stanovení základních charakteristik",,,,,,,
PLATNÁ,Instalace NN (soubor 33 2000),ČSN 33 2000-3,,Stanovení všeobecných charakteristik,,,,,,,
PLATNÁ,Instalace NN (soubor 33 2000),ČSN 33 2000-4-41,,Ochrana před úrazem elektrickým proudem,,,,,,,
PLATNÁ,Instalace NN (soubor 33 2000),ČSN 33 2000-4-42,,Ochrana před účinky tepla,,,,,,,
PLATNÁ,Instalace NN (soubor 33 2000),ČSN 33 2000-4-43,,Ochrana proti nadproudům,,,,,,,
PLATNÁ,Instalace NN (soubor 33 2000),ČSN 33 2000-4-44,,Ochrana proti přepětí a elektromagnetickým jevům,,,,,,,
PLATNÁ,Instalace NN (soubor 33 2000),ČSN 33 2000-4-443,ed.3,Ochrana před atmosférickým nebo spínacím přepětím (kdy SPD),,2016-12-01,,,https://www.elektroprumysl.cz/normy-seznam/501145,,
PLATNÁ,Instalace NN (soubor 33 2000),ČSN 33 2000-5-51,,Výběr a stavba EZ – všeobecně,,,,,,,
PLATNÁ,Instalace NN (soubor 33 2000),ČSN 33 2000-5-52,,Vodiče a vedení,,,,,,,
PLATNÁ,Instalace NN (soubor 33 2000),ČSN 33 2000-5-53,ed.3,Spínací a řídicí přístroje (vč. integrace části 534/537),,2022-12-01,,od 2025-05-13 ukončen souběh a nahrazuje i 33 2000-5-534 ed.2 a 33 2000-5-537 ed.2,https://www.tzb-info.cz/normy/csn-33-2000-5-53-ed-3-2022-11 | https://www.eisinspekce.cz/Prezentace%20zm%C4%9Bny%20norem%20v%20%C5%99ad%C4%9B%2033%202000-1%20a%C5%BE%206%20a%208%20-%20J.Sluka.pdf,,
PLATNÁ,Instalace NN (soubor 33 2000),ČSN 33 2000-5-54,ed.3,Uzemnění a ochranné vodiče (pospojování),,,,,https://www.unmz.gov.cz/wp-content/uploads/vestnik-12-24.pdf,,
PLATNÁ,Instalace NN (soubor 33 2000),ČSN 33 2000-5-56,,Zařízení pro bezpečnostní účely (bezpečnostní zdroje),,,,,,,
PLATNÁ,Revize instalací,ČSN 33 2000-6,ed.2,Revize elektrických instalací nn,,,,,,,
PLATNÁ,Zvláštní prostory/instalace,ČSN 33 2000-7-701,,Prostory s vanou nebo sprchou,,,,,,,
PLATNÁ,Zvláštní prostory/instalace,ČSN 33 2000-7-702,,Bazény a fontány,,,,,,,
PLATNÁ,Zvláštní prostory/instalace,ČSN 33 2000-7-704,,Staveniště,,,,,,,
PLATNÁ,Zvláštní prostory/instalace,ČSN 33 2000-7-705,,Zemědělské a zahradnické provozy,,,,,,,
PLATNÁ,Zvláštní prostory/instalace,ČSN 33 2000-7-710,,Zdravotnické prostory,,,,,https://nahledy.normy.biz/n.php?i=91787,,
PLATNÁ,Zvláštní prostory/instalace,ČSN 33 2000-7-712,,Fotovoltaické (PV) systémy,,,,,,,
PLATNÁ,Zvláštní prostory/instalace,ČSN 33 2000-7-722,,Napájení elektrických vozidel (EV),,,,,,,
PLATNÁ,Zvláštní prostory/instalace,ČSN 33 2000-7-708,ed.4,Parkoviště karavanů / kempy,,2018-02-01,,,https://www.technicke-normy-csn.cz/csn-33-2000-7-708-ed-4-332000-180388.html,,
PLATNÁ,Vnitřní rozvody (33 2130),ČSN 33 2130,ed.4 (12/2024),Vnitřní elektrické rozvody (bytová a občanská výstavba),2024-12-01,2025-01-01,,s účinností 2025-01-01 zrušena ed.3,https://www.unmz.gov.cz/wp-content/uploads/vestnik-12-24.pdf,,
PLATNÁ,Revize,ČSN 33 1500,,Revize elektrických zařízení (obecně),,,,,,,
PLATNÁ,Revize spotřebičů,ČSN 33 1600,ed.2,Revize a kontroly elektrických spotřebičů během používání,,,,,,,
PLATNÁ,Revize spotřebičů,ČSN EN 50678,,Ověření spotřebičů po opravě,,,,,,,
PLATNÁ,Revize spotřebičů,ČSN EN 50699,,Opakované zkoušky spotřebičů,,,,,,,
PLATNÁ,Měřicí přístroje (revize),ČSN EN 61557 (soubor),,"Zařízení ke zkoušení, měření a sledování ochranných opatření",,,,,https://csnonlinefirmy.agentura-cas.cz/htmlnahledbeztridy.aspx?k=53537,,
PLATNÁ,Rozvaděče nn (61439),ČSN EN IEC 61439-1,,Rozváděče nn – obecná ustanovení,,,,,https://csnonlinefirmy.agentura-cas.cz/html_nahledy/35/86902/86902_nahled.htm,,
PLATNÁ,Rozvaděče nn (61439),ČSN EN IEC 61439-2,,Rozváděče nn – výkonové rozvaděče,,,,,,,
PLATNÁ,Rozvaděče nn (61439),ČSN EN IEC 61439-3,,Rozvodnice/DBO,,,,,,,
PLATNÁ,Rozvaděče nn (61439),ČSN EN IEC 61439-4,,Rozvaděče pro staveniště,,,,,,,
PLATNÁ,SPD – výrobkové normy,ČSN EN 61643-11,,SPD v sítích nn (AC) – požadavky a zkoušky,,,,,,,
PLATNÁ,SPD – výrobkové normy,ČSN EN 61643-31,,SPD pro fotovoltaické instalace (DC),,,,,,,
PLATNÁ,Další (často v revizích),ČSN EN 50110,,Obsluha a práce na elektrických zařízeních (provoz),,,,,,,
PLATNÁ,Další (často v revizích),ČSN EN 60204-1,,Elektrická zařízení strojů,,,,,,,
PLATNÁ,Další (VN/areály),ČSN EN 50522,,Uzemnění instalací AC nad 1 kV,,,,,,,
PLATNÁ,Další (VN/areály),ČSN EN IEC 61936-1,,Instalace nad 1 kV AC – společná ustanovení,,,,,,,
"""


def build_label(norma: str, edice: str, name: str) -> str:
    parts = [norma.strip()]
    if edice and edice.strip():
        parts.append(edice.strip())
    label = " ".join(parts)
    name = (name or "").strip()
    if name:
        label = f"{label} – {name}"
    return label


def detect_scope(row: dict) -> NormScope | None:
    group = (row.get("Skupina") or "").strip()
    if "LPS" in group or "Hromosvody" in group:
        return NormScope.LPS
    return NormScope.EI


def seed(db: Session) -> None:
    reader = csv.DictReader(StringIO(CSV_DATA))
    added = 0
    updated = 0
    for row in reader:
        scope = detect_scope(row)
        if scope is None:
            continue
        label = build_label(row.get("Norma", ""), row.get("Edice/Rok", ""), row.get("Název / oblast", ""))
        if not label.strip():
            continue
        status = (row.get("Platnost") or "").strip()
        issued_on = (row.get("Vydána") or "").strip() or None
        canceled_on = (row.get("Zrušena od") or "").strip() or None
        exists = (
            db.query(Norm)
            .filter(
                Norm.scope == scope,
                Norm.label == label,
            )
            .first()
        )
        if not exists:
            # fallback: match by prefix (norm code) if label differs
            norma = (row.get("Norma") or "").strip()
            if norma:
                exists = (
                    db.query(Norm)
                    .filter(
                        Norm.scope == scope,
                        Norm.label.ilike(f"{norma}%"),
                    )
                    .first()
                )
        if exists:
            exists.status = status or exists.status
            exists.issued_on = issued_on or exists.issued_on
            exists.canceled_on = canceled_on or exists.canceled_on
            exists.updated_at = datetime.utcnow()
            updated += 1
        else:
            db.add(
                Norm(
                    scope=scope,
                    label=label,
                    status=status or None,
                    issued_on=issued_on,
                    canceled_on=canceled_on,
                    is_default=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
            )
            added += 1
    db.commit()
    return added, updated


if __name__ == "__main__":
    db = SessionLocal()
    try:
        added, updated = seed(db)
        print(f"Seed norms: added {added}, updated {updated}")
    finally:
        db.close()
