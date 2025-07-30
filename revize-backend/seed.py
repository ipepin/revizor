# seed.py
import os
import sqlite3
import json

# Uprav cestu, pokud máš DB jinde nebo pod jiným názvem
DB_PATH = os.path.join(os.path.dirname(__file__), "projects.db")

def delete_all_projects_and_revisions():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM revisions")
    cur.execute("DELETE FROM projects")
    conn.commit()
    conn.close()
    print("Vymazány všechny projekty i revize.")

def seed_data():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    sample_projects = [
        {"address": "Ulice 1, Praha", "client": "Jan Novák"},
        {"address": "Ulice 2, Brno", "client": "Petr Svoboda"},
    ]

    for p in sample_projects:
        # Vlož projekt
        cur.execute(
            "INSERT INTO projects (address, client) VALUES (?, ?)",
            (p["address"], p["client"]),
        )
        project_id = cur.lastrowid

        # Přidej dvě revize k projektu
        for rev_num in [1, 2]:
            form = {
                "evidencni": f"E-00{project_id}{rev_num}",
                "objekt": f"Objekt {rev_num}",
                "adresa": p["address"],
                "objednatel": p["client"],
                "typRevize": "Pravidelná",
                "sit": "TN-S",
                "voltage": "230V",
                "date_start": "2025-07-01",
                "date_end": "2025-07-01",
                "date_created": "2025-07-01",
                "documentation": "Projektová dokumentace XYZ",
                "environment": "Vnější vlivy ABC",
                "extraNotes": "Žádné speciální poznámky.",
                "protection_basic": ["Základní izolace", "Přepážky a kryty"],
                "protection_fault": ["Automatické odpojení od zdroje"],
                "protection_additional": ["Proudové chrániče (RCD)"],
                "norms": ["ČSN 33 2000-4-41 ed. 3", "ČSN 33 2000-6"],
                "customNorm1": "",
                "customNorm2": "",
                "customNorm3": "",
                "boards": [
                    {
                        "id": 1,
                        "name": "Rozvaděč hlavní",
                        "vyrobce": "ABB",
                        "typ": "Typ A",
                        "vyrobniCislo": "SN12345",
                        "napeti": "230V",
                        "proud": "16A",
                        "ip": "IP20",
                        "odpor": "< 0.1Ω",
                        "umisteni": "Místnost A",
                        "komponenty": [
                            {
                                "id": 1,
                                "nazev": "Jistič C16",
                                "popis": "Jistič",
                                "dimenze": "1 modul",
                                "riso": "0.1Ω",
                                "ochrana": "30mA",
                                "poznamka": "Bez závad",
                            }
                        ],
                    }
                ],
                "rooms": [
                    { "id": 1, "name": "Místnost A", "popis": "Hlavní provozní místnost" }
                ],
                "defects": [
                    {
                        "description": "Chybí kryt svorek",
                        "standard": "ČSN 33 2000-4-41",
                        "article": "411.4.4",
                    }
                ],
                "conclusion": {
                    "text": "Vše vyhovuje podle norem.",
                    "safety": "able",
                    "validUntil": "2029-07-01",
                },
            }
            data_json = json.dumps(form, ensure_ascii=False)

            # Číslo revize unikátně podle project_id a rev_num
            revision_number = f"RZ-{project_id}{rev_num:02d}"

            cur.execute(
                """
                INSERT INTO revisions
                  (project_id, type, number, date_done, valid_until, status, data_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    project_id,
                    "Pravidelná",
                    revision_number,
                    "2025-07-01",
                    "2029-07-01",
                    "Rozpracovaná",
                    data_json,
                ),
            )

    conn.commit()
    conn.close()
    print("Seed data vložena.")

if __name__ == "__main__":
    delete_all_projects_and_revisions()
    seed_data()
