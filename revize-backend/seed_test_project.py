from __future__ import annotations

from datetime import date
from uuid import uuid4

from sqlalchemy.orm import Session

from database import SessionLocal
from models import Project, Revision, User, VvDoc, generate_revision_uuid
from routers.projects import _generate_project_number
from routers.revisions import _generate_revision_number
from routers.vv import _generate_vv_number


TARGET_EMAIL = "blazek1.jo@gmail.com"
PROJECT_ADDRESS = "TEST"
PROJECT_CLIENT = "Josef Blažek"


def comp(
    cid: int,
    nazev: str,
    vyrobce: str,
    typ: str,
    poles: str,
    dimenze: str,
    riso: str,
    ochrana: str,
    obvod: str,
    row_id: int,
    parent_id: int | None = None,
    order: int = 0,
    cas: str = "",
    proud: str = "",
    napeti: str = "",
) -> dict:
    return {
        "id": cid,
        "nazevId": "",
        "nazev": nazev,
        "popisId": "",
        "popis": vyrobce,
        "typId": "",
        "typ": typ,
        "poles": poles,
        "dimenze": dimenze,
        "riso": riso,
        "ochrana": ochrana,
        "poznamka": obvod,
        "vybavovaciCasMs": cas,
        "vybavovaciProudmA": proud,
        "dotykoveNapetiV": napeti,
        "parentId": parent_id,
        "rowId": row_id,
        "order": order,
    }


def electro_data(number: str, rev_uuid: str) -> dict:
    return {
        "evidencni": number,
        "uuid": rev_uuid,
        "objekt": "Administrativní a skladový objekt TEST",
        "adresa": "TEST",
        "objednatel": "Josef Blažek",
        "typRevize": "Pravidelná revize elektrické instalace",
        "sit": "TN-C-S",
        "voltage": "3x230/400 V, 50 Hz",
        "date_start": "2026-08-24",
        "date_end": "2026-08-24",
        "date_created": "2026-08-24",
        "documentation": "Projektová dokumentace elektroinstalace, jednopólové schéma rozvaděčů, protokoly o kusové zkoušce rozvaděčů.",
        "environment": "Vnitřní prostory normální, technická místnost bez trvalé obsluhy, sklad se zvýšeným rizikem mechanického poškození.",
        "extraNotes": "Objekt je napájen z distribuční sítě přes elektroměrový rozvaděč. Instalace je provedena převážně kabely CYKY uloženými pod omítkou, v kabelových trasách a v PVC lištách.",
        "inspectionTemplate": "Administrativní a skladový objekt",
        "inspectionDescription": (
            "Revidovaný objekt tvoří administrativní část, technické zázemí a menší sklad. "
            "Elektrická instalace je napájena z hlavního rozvaděče RH, ze kterého jsou napájeny podružné rozvaděče kanceláří a skladu. "
            "Rozvody jsou provedeny kabely CYKY, zásuvkové obvody jsou chráněny proudovými chrániči s vybavovacím proudem 30 mA. "
            "Ochrana před úrazem elektrickým proudem je řešena automatickým odpojením od zdroje a doplňkovým pospojováním."
        ),
        "performedTasks": [
            "Kontrola úplnosti a stavu dokumentace",
            "Prohlídka rozvaděčů a značení obvodů",
            "Měření spojitosti ochranných vodičů",
            "Měření izolačních odporů",
            "Ověření impedance poruchové smyčky",
            "Zkouška proudových chráničů",
        ],
        "norms": ["ČSN 33 1500", "ČSN 33 2000-6 ed. 2", "ČSN 33 2000-4-41 ed. 3", "ČSN 33 2000-5-54 ed. 3"],
        "customNorm1": "",
        "customNorm2": "",
        "customNorm3": "",
        "protection_basic": ["izolací živých částí", "kryty a přepážkami"],
        "protection_fault": ["automatickým odpojením od zdroje", "ochranným pospojováním"],
        "protection_additional": ["proudovým chráničem"],
        "measuringInstruments": [
            {
                "id": "test-mi-1",
                "name": "Eurotest 61557",
                "measurement_text": "měření izolačního odporu, impedance poruchové smyčky a proudových chráničů",
                "calibration_code": "19-I/2025",
                "serial": "11013185",
                "calibration_valid_until": "2026-12-31",
                "note": "testovací záznam",
            }
        ],
        "boards": [
            {
                "id": 1001,
                "name": "RH - hlavní rozvaděč",
                "vyrobce": "Eaton",
                "typ": "BF-U-48",
                "vyrobniCislo": "RH-TEST-001",
                "napeti": "3x230/400 V",
                "proud": "63 A",
                "supplySystem": "TN-C-S",
                "supplyPhase": "3f",
                "ip": "IP40",
                "odpor": "0,08 Ω",
                "umisteni": "Technická místnost 1. NP",
                "poznamkyHtml": "<p>Hlavní rozvaděč je mechanicky nepoškozený, přístroje jsou označeny a kryty živých částí jsou osazeny.</p>",
                "rows": [{"id": 1, "name": "Řada 1"}, {"id": 2, "name": "Řada 2"}],
                "komponenty": [
                    comp(1, "Hlavní vypínač", "ABB", "OT125F3", "3", "CYKY 5x16", "500 MΩ", "0,18 Ω", "Hlavní přívod", 1, None, 1),
                    comp(2, "Proudový chránič", "Eaton", "PF7-40/4/003", "3+N", "CYKY 5x6", "500 MΩ", "0,24 Ω", "Zásuvkové obvody 1. NP", 1, 1, 2, "22", "24", "12"),
                    comp(3, "Jistič", "Eaton", "PL7-B16/3", "3", "CYKY 5x2,5", "500 MΩ", "0,31 Ω", "Sklad - zásuvky 400 V", 1, 2, 3),
                    comp(4, "Jistič", "Eaton", "PL7-B16/1", "1+N", "CYKY 3x2,5", "500 MΩ", "0,42 Ω", "Kanceláře - zásuvky", 2, 2, 4),
                    comp(5, "Jistič", "Eaton", "PL7-B10/1", "1+N", "CYKY 3x1,5", "500 MΩ", "0,54 Ω", "Kanceláře - osvětlení", 2, 1, 5),
                ],
            },
            {
                "id": 1002,
                "name": "RS - sklad",
                "vyrobce": "Hager",
                "typ": "Volta VU36",
                "vyrobniCislo": "RS-TEST-002",
                "napeti": "3x230/400 V",
                "proud": "40 A",
                "supplySystem": "TN-S",
                "supplyPhase": "3f",
                "ip": "IP44",
                "odpor": "0,11 Ω",
                "umisteni": "Sklad",
                "poznamkyHtml": "<p>Podružný rozvaděč skladu je přístupný, označení obvodů odpovídá skutečnému stavu.</p>",
                "rows": [{"id": 1, "name": "Řada 1"}, {"id": 2, "name": "Řada 2"}],
                "komponenty": [
                    comp(11, "Vypínač", "OEZ", "MSO-40-3", "3", "CYKY 5x6", "500 MΩ", "0,27 Ω", "Přívod RS", 1, None, 1),
                    comp(12, "Proudový chránič", "ABB", "F204 A-40/0,03", "3+N", "CYKY 5x4", "500 MΩ", "0,33 Ω", "Zásuvky sklad", 1, 11, 2, "19", "23", "11"),
                    comp(13, "Jistič", "OEZ", "LTE-16B-1", "1+N", "CYKY 3x2,5", "500 MΩ", "0,45 Ω", "Zásuvky regály", 2, 12, 3),
                    comp(14, "Jistič", "OEZ", "LTE-10B-1", "1+N", "CYKY 3x1,5", "500 MΩ", "0,58 Ω", "Osvětlení sklad", 2, 11, 4),
                ],
            },
        ],
        "rooms": [
            {
                "id": 2001,
                "name": "Kancelář 1",
                "details": "Běžný vnitřní prostor, suché prostředí.",
                "devices": [
                    {"id": 1, "pocet": 8, "typ": "Zásuvka 230 V", "dimenze": "CYKY 3x2,5", "ochrana": "0,39 Ω", "riso": "500 MΩ", "podrobnosti": "zásuvkový okruh za proudovým chráničem"},
                    {"id": 2, "pocet": 4, "typ": "Svítidlo LED", "dimenze": "CYKY 3x1,5", "ochrana": "0,51 Ω", "riso": "500 MΩ", "podrobnosti": "stropní svítidla"},
                ],
            },
            {
                "id": 2002,
                "name": "Technická místnost",
                "details": "Prostor s hlavním rozvaděčem a datovým rozvaděčem.",
                "devices": [
                    {"id": 3, "pocet": 3, "typ": "Zásuvka 230 V", "dimenze": "CYKY 3x2,5", "ochrana": "0,35 Ω", "riso": "500 MΩ", "podrobnosti": "servisní zásuvky"},
                    {"id": 4, "pocet": 1, "typ": "Ventilátor", "dimenze": "CYKY 3x1,5", "ochrana": "0,49 Ω", "riso": "500 MΩ", "podrobnosti": "odvětrání místnosti"},
                ],
            },
            {
                "id": 2003,
                "name": "Sklad",
                "details": "Provozní sklad s regálovým systémem.",
                "devices": [
                    {"id": 5, "pocet": 6, "typ": "Zásuvka 230 V", "dimenze": "CYKY 3x2,5", "ochrana": "0,44 Ω", "riso": "500 MΩ", "podrobnosti": "pracovní zásuvky u regálů"},
                    {"id": 6, "pocet": 2, "typ": "Zásuvka 400 V", "dimenze": "CYKY 5x2,5", "ochrana": "0,32 Ω", "riso": "500 MΩ", "podrobnosti": "technologická rezerva"},
                ],
            },
        ],
        "defects": [
            {
                "uid": "def-test-1",
                "kind": "catalog",
                "description": "V rozvaděči RS chybí popis jednoho rezervního jističe.",
                "standard": "ČSN 33 2000-5-51 ed. 3",
                "article": "514.1",
            },
            {
                "uid": "custom-test-1",
                "kind": "custom_text",
                "description": "Doporučuje se doplnit aktualizované jednopólové schéma do vnitřní kapsy rozvaděče RH.",
                "standard": "",
                "article": "",
            },
        ],
        "defectDrafts": [],
        "defectsRichText": "<p>V rozvaděči RS chybí popis jednoho rezervního jističe.</p><p>Doporučuje se doplnit aktualizované jednopólové schéma do rozvaděče RH.</p>",
        "tests": {
            "Spojitost ochranných vodičů": {"checked": True, "note": "Vyhovuje, naměřené hodnoty odpovídají délce a průřezu vodičů."},
            "Izolační odpor": {"checked": True, "note": "Vyhovuje, nejnižší naměřená hodnota 500 MΩ."},
            "Impedance poruchové smyčky": {"checked": True, "note": "Vyhovuje, jištění splňuje podmínky automatického odpojení."},
            "Proudové chrániče": {"checked": True, "note": "Vyhovuje, vybavovací časy a proudy jsou v předepsaných mezích."},
        },
        "conclusion": {
            "text": "Elektrická instalace je po odstranění uvedené administrativní závady schopna bezpečného provozu. Naměřené hodnoty vyhovují požadavkům příslušných norem.",
            "safety": "able",
            "validUntil": "2029-08-24",
        },
    }


def lps_data(number: str, rev_uuid: str) -> dict:
    return {
        "evidencni": number,
        "uuid": rev_uuid,
        "objekt": "Administrativní a skladový objekt TEST",
        "adresa": "TEST",
        "objednatel": "Josef Blažek",
        "typRevize": "Pravidelná revize LPS",
        "date_start": "2026-08-24",
        "date_end": "2026-08-24",
        "date_created": "2026-08-24",
        "measuringInstruments": [
            {
                "id": "test-mi-lps-1",
                "name": "Metrel MI 3155",
                "measurement_text": "měření zemního odporu a spojitosti svodů",
                "calibration_code": "KL-24/2026",
                "serial": "20345678",
                "calibration_valid_until": "2027-03-31",
                "note": "testovací záznam",
            }
        ],
        "defects": [
            {
                "uid": "lps-def-test-1",
                "kind": "catalog",
                "description": "U svodu S3 je poškozený ochranný nátěr zkušební svorky.",
                "standard": "ČSN EN 62305-3 ed. 2",
                "article": "E.7.2.4",
            }
        ],
        "defectDrafts": [],
        "defectsRichText": "<p>U svodu S3 je poškozený ochranný nátěr zkušební svorky.</p>",
        "conclusion": {
            "text": "Systém ochrany před bleskem je funkční. Zjištěná závada nemá bezprostřední vliv na bezpečnost provozu, doporučuje se její odstranění při nejbližší údržbě.",
            "safety": "able",
            "validUntil": "2030-08-24",
        },
        "lps": {
            "standard": "CSN_EN_62305",
            "scopeChecks": ["vnejsi", "vnitrni", "uzemneni", "pospojovani", "spd"],
            "objectType": "administrativní objekt",
            "owner": "Josef Blažek",
            "projectBy": "TEST projekt s.r.o., IČ 12345678",
            "projectNo": "PD-LPS-TEST-2026",
            "documentation": "Projektová dokumentace LPS, situační výkres a protokol o předchozí revizi.",
            "previousRevision": "LPS-2023-TEST-001",
            "assemblyBy": "Montáže elektro TEST s.r.o.",
            "assemblyPermit": "Oprávnění TIČR ev. č. TEST/2026",
            "floorsCount": 2,
            "airTerminationType": "mřížová soustava",
            "earthingType": "základový zemnič doplněný obvodovým zemničem",
            "downConductorsCount": 4,
            "conductorMaterial": "FeZn",
            "roofType": "plochá",
            "roofCover": "folie",
            "downConductorsProtection": "mechanická ochrana do 2 m",
            "spdProtectionUsed": "yes",
            "class": "III",
            "measurementMethod": "měření zemního odporu metodou technickou a měření spojitosti ochranných vodičů",
            "weather": "sucho, teplota 22 °C",
            "soilType": "hlinitá zemina",
            "reportText": "Objekt je chráněn vnějším systémem LPS třídy III. Jímací soustava je provedena jako mřížová soustava na ploché střeše, svody jsou vedeny po fasádě a připojeny na základový zemnič doplněný obvodovým zemničem.",
            "earthResistance": [
                {"id": "e1", "point": "S1", "value": "3,8", "unit": "Ω", "note": "vyhovuje"},
                {"id": "e2", "point": "S2", "value": "4,1", "unit": "Ω", "note": "vyhovuje"},
                {"id": "e3", "point": "S3", "value": "4,5", "unit": "Ω", "note": "vyhovuje"},
                {"id": "e4", "point": "S4", "value": "3,9", "unit": "Ω", "note": "vyhovuje"},
            ],
            "continuity": [
                {"id": "c1", "point": "Jímací vedení - S1", "value": "0,12", "unit": "Ω", "note": "vyhovuje"},
                {"id": "c2", "point": "Jímací vedení - S3", "value": "0,15", "unit": "Ω", "note": "vyhovuje"},
            ],
            "spdTests": [
                {"id": "s1", "location": "RH", "type": "T1+T2", "status": "vyhovuje", "note": "signalizace v pořádku"},
                {"id": "s2", "location": "RS", "type": "T2", "status": "vyhovuje", "note": "signalizace v pořádku"},
            ],
            "visualChecks": [
                {"id": "v1", "text": "Kontrola jímací soustavy", "state": "ok", "note": "bez mechanického poškození"},
                {"id": "v2", "text": "Kontrola svodů a zkušebních svorek", "state": "defect", "note": "poškozený nátěr svorky S3"},
                {"id": "v3", "text": "Kontrola přepěťových ochran", "state": "ok", "note": "signalizace funkční"},
            ],
            "distributionList": "Provozovatel 1x, revizní technik 1x",
            "signatureCity": "Praha",
        },
    }


def vv_data() -> dict:
    return {
        "objectName": "Administrativní a skladový objekt TEST",
        "address": "TEST",
        "preparedBy": "Josef Blažek",
        "date": "2026-08-24",
        "submittedDocs": "Projektová dokumentace elektroinstalace, půdorysy 1. NP a 2. NP, provozní řád skladu.",
        "objectDescription": "Objekt obsahuje administrativní část, technickou místnost a sklad. Prostory jsou posuzovány pro běžný provoz kanceláří a skladování nehořlavého materiálu.",
        "committee": [
            {"role": "Předseda", "name": "Josef Blažek"},
            {"role": "Člen", "name": "Zástupce provozovatele"},
        ],
        "spaces": [
            {
                "id": "vv-space-office",
                "name": "Kanceláře",
                "note": "Běžné vnitřní prostory bez zvláštního působení vnějších vlivů.",
                "selections": {"AA": "AA5", "AB": "AB5", "AC": "AC1", "AD": "AD1", "BA": "BA1", "BC": "BC2"},
                "measures": "Elektrická zařízení v krytí odpovídajícím běžnému vnitřnímu prostředí. Zásuvkové obvody jsou chráněny proudovým chráničem 30 mA.",
                "intervals": "Doporučená lhůta pravidelné revize 5 let, pokud provozovatel nestanoví kratší interval.",
            },
            {
                "id": "vv-space-technical",
                "name": "Technická místnost",
                "note": "Prostor s hlavním rozvaděčem, bez trvalé obsluhy.",
                "selections": {"AA": "AA5", "AB": "AB5", "AD": "AD1", "BA": "BA4", "BC": "BC3"},
                "measures": "Zajistit trvalý přístup k rozvaděči, neukládat materiál v manipulačním prostoru a zachovat označení hlavního vypínače.",
                "intervals": "Doporučená kontrola při každé pravidelné revizi elektroinstalace.",
            },
            {
                "id": "vv-space-storage",
                "name": "Sklad",
                "note": "Skladový prostor s možností mechanického namáhání instalace.",
                "selections": {"AA": "AA5", "AB": "AB5", "AG": "AG2", "BA": "BA4", "BC": "BC3"},
                "measures": "Kabely a zásuvky v manipulačních trasách chránit proti mechanickému poškození. Po změně skladovaného materiálu provést nové posouzení.",
                "intervals": "Doporučená lhůta pravidelné revize 3 roky, případně kratší podle provozního zatížení.",
            },
        ],
    }


def upsert_revision(
    db: Session,
    project: Project,
    rev_type: str,
    date_done: date,
    valid_until: date,
    data_builder,
) -> Revision:
    existing = (
        db.query(Revision)
        .filter(Revision.project_id == project.id, Revision.type == rev_type)
        .order_by(Revision.id.asc())
        .first()
    )
    if existing:
        number = existing.number
        rev_uuid = existing.uuid or generate_revision_uuid()
        existing.uuid = rev_uuid
        existing.date_done = date_done
        existing.valid_until = valid_until
        existing.status = "Rozpracovaná"
        existing.data_json = data_builder(number, rev_uuid)
        existing.conclusion_text = existing.data_json["conclusion"]["text"]
        existing.conclusion_safety = existing.data_json["conclusion"]["safety"]
        existing.conclusion_valid_until = valid_until
        existing.defects = ""
        db.add(existing)
        return existing

    prefix = "LPS" if rev_type.upper() == "LPS" else "RZ"
    number = _generate_revision_number(db, project.id, project.number, date_done.year, prefix)
    rev_uuid = generate_revision_uuid()
    data = data_builder(number, rev_uuid)
    row = Revision(
        project_id=project.id,
        type=rev_type,
        uuid=rev_uuid,
        number=number,
        date_done=date_done,
        valid_until=valid_until,
        status="Rozpracovaná",
        data_json=data,
        conclusion_text=data["conclusion"]["text"],
        conclusion_safety=data["conclusion"]["safety"],
        conclusion_valid_until=valid_until,
        defects="",
    )
    db.add(row)
    db.flush()
    return row


def upsert_vv(db: Session, project: Project) -> VvDoc:
    existing = (
        db.query(VvDoc)
        .filter(VvDoc.project_id == project.id)
        .order_by(VvDoc.created_at.asc())
        .first()
    )
    if existing:
        existing.data_json = vv_data()
        db.add(existing)
        return existing

    row = VvDoc(
        id=str(uuid4()),
        number=_generate_vv_number(db, project.id, project.number),
        project_id=project.id,
        data_json=vv_data(),
    )
    db.add(row)
    db.flush()
    return row


def seed() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == TARGET_EMAIL).first()
        if not user:
            user = db.query(User).filter(User.name.ilike("%Blažek%")).first()
        if not user:
            raise RuntimeError(f"Uživatel Josef Blažek nebyl nalezen ({TARGET_EMAIL}).")

        project = (
            db.query(Project)
            .filter(Project.owner_id == user.id, Project.address == PROJECT_ADDRESS)
            .first()
        )
        if not project:
            project = Project(
                number=_generate_project_number(db, user.id),
                address=PROJECT_ADDRESS,
                client=PROJECT_CLIENT,
                owner_id=user.id,
            )
            db.add(project)
            db.flush()
        else:
            project.client = PROJECT_CLIENT
            if not project.number:
                project.number = _generate_project_number(db, user.id)
            db.add(project)

        electro = upsert_revision(db, project, "EI", date(2026, 8, 24), date(2029, 8, 24), electro_data)
        lps = upsert_revision(db, project, "LPS", date(2026, 8, 24), date(2030, 8, 24), lps_data)
        vv = upsert_vv(db, project)

        db.commit()
        print(
            "Seed TEST projektu dokončen: "
            f"user_id={user.id}, project_id={project.id}, "
            f"EI={electro.number}, LPS={lps.number}, VV={vv.number}"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
