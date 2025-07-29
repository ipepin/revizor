import sqlite3
import json
import random
import os
from datetime import datetime

DB_PATH = "projects.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# 1. Smaž prázdné revize
cur.execute("DELETE FROM revisions WHERE data_json IS NULL OR TRIM(data_json) = ''")
conn.commit()

# 2. Smaž všechny projekty
cur.execute("DELETE FROM projects")
conn.commit()

# 3. Vytvoř nový projekt
address = f"Testovací objekt č. {random.randint(100,999)}, Ulice {random.randint(1, 50)}"
client = "Ukázkový klient"
owner_id = 1  # uprav podle potřeby

cur.execute(
    "INSERT INTO projects (address, client, owner_id) VALUES (?, ?, ?)",
    (address, client, owner_id)
)
project_id = cur.lastrowid
conn.commit()

print(f"Projekt vytvořen (id: {project_id}, adresa: {address})")

# 4. Načti JSON revize
REVIZE_DIR = "sample_revisions"
rev_files = [f for f in os.listdir(REVIZE_DIR) if f.endswith(".json")]

if not rev_files:
    print("❌ Ve složce 'samples' nejsou žádné JSON soubory.")
    exit()

# 5. Přidej revize
for file in rev_files:
    with open(os.path.join(REVIZE_DIR, file), "r", encoding="utf-8") as f:
        data_json = f.read()

    number = f"REV-{random.randint(1000,9999)}"

    cur.execute(
        "INSERT INTO revisions (project_id, number, data_json) VALUES (?, ?, ?)",
        (project_id, number, data_json)
    )

conn.commit()
conn.close()

print(f"✅ Do projektu ID {project_id} bylo vloženo {len(rev_files)} revizí.")
