# scripts/seed_cables.py
from database import SessionLocal, engine
from models import Base, Cable, CableFamily
from sqlalchemy import select
from collections import defaultdict

DATA = {
  "CYKY": [
    "CYKY 2x1,5","CYKY 2x2,5","CYKY 2x4","CYKY 2x6","CYKY 2x10","CYKY 2x16",
    "CYKY 3x1,5","CYKY 3x2,5","CYKY 3x4","CYKY 3x6","CYKY 3x10","CYKY 3x16",
    "CYKY 4x1,5","CYKY 4x2,5","CYKY 4x4","CYKY 4x6","CYKY 4x10","CYKY 4x16",
    "CYKY 5x1,5","CYKY 5x2,5","CYKY 5x4","CYKY 5x6","CYKY 5x10","CYKY 5x16"
  ],
  "CYKYLo": ["CYKYLo 2x1,5","CYKYLo 2x2,5","CYKYLo 3x1,5","CYKYLo 3x2,5"],
  "CYSY": [
    "CYSY 2x0,75","CYSY 2x1","CYSY 2x1,5","CYSY 2x2,5",
    "CYSY 3x0,75","CYSY 3x1","CYSY 3x1,5","CYSY 3x2,5",
    "CYSY 4x0,75","CYSY 4x1","CYSY 4x1,5","CYSY 4x2,5",
    "CYSY 5x0,75","CYSY 5x1","CYSY 5x1,5","CYSY 5x2,5"
  ],
  "CYA": [
    "CYA 1x0,75","CYA 1x1","CYA 1x1,5","CYA 1x2,5","CYA 1x4","CYA 1x6",
    "CYA 1x10","CYA 1x16","CYA 1x25","CYA 1x35","CYA 1x50","CYA 1x70",
    "CYA 1x95","CYA 1x120","CYA 1x150","CYA 1x185","CYA 1x240"
  ],
  "AYKY": [
    "AYKY 4x10","AYKY 4x16","AYKY 4x25","AYKY 4x35","AYKY 4x50","AYKY 4x70","AYKY 4x95","AYKY 4x120","AYKY 4x150","AYKY 4x185","AYKY 4x240",
    "AYKY 5x10","AYKY 5x16","AYKY 5x25","AYKY 5x35","AYKY 5x50","AYKY 5x70","AYKY 5x95","AYKY 5x120","AYKY 5x150","AYKY 5x185","AYKY 5x240"
  ],
  "H1Z2Z2-K": ["H1Z2Z2-K 1x2,5","H1Z2Z2-K 1x4","H1Z2Z2-K 1x6","H1Z2Z2-K 1x10","H1Z2Z2-K 1x16"],
  "PV1-F": ["PV1-F 1x4","PV1-F 1x6","PV1-F 1x10"],
  "N2XH": [
    "N2XH 2x1,5","N2XH 3x1,5","N2XH 4x1,5","N2XH 5x1,5",
    "N2XH 2x2,5","N2XH 3x2,5","N2XH 4x2,5","N2XH 5x2,5",
    "N2XH 3x4","N2XH 4x4","N2XH 5x4",
    "N2XH 3x6","N2XH 4x6","N2XH 5x6",
    "N2XH 3x10","N2XH 4x10","N2XH 5x10",
    "N2XH 3x16","N2XH 4x16","N2XH 5x16"
  ],
  "NHXH-J": ["NHXH-J 3x1,5","NHXH-J 3x2,5","NHXH-J 5x1,5","NHXH-J 5x2,5","NHXH-J 5x4"],
  "NHXH-O": ["NHXH-O 3x1,5","NHXH-O 3x2,5","NHXH-O 5x1,5","NHXH-O 5x2,5","NHXH-O 5x4"],
  "H07Z-K": ["H07Z-K 1x1","H07Z-K 1x1,5","H07Z-K 1x2,5","H07Z-K 1x4","H07Z-K 1x6","H07Z-K 1x10","H07Z-K 1x16","H07Z-K 1x25","H07Z-K 1x35","H07Z-K 1x50"],
  "UTP Cat5e": ["UTP Cat5e 4x2x0,5"],
  "UTP Cat6": ["UTP Cat6 4x2x0,57"],
  "UTP Cat6A": ["UTP Cat6A 4x2x0,58"],
  "STP Cat5e": ["STP Cat5e 4x2x0,5"],
  "STP Cat6": ["STP Cat6 4x2x0,57"],
  "STP Cat6A": ["STP Cat6A 4x2x0,58"],
  "FTP Cat5e": ["FTP Cat5e 4x2x0,5"],
  "FTP Cat6": ["FTP Cat6 4x2x0,57"],
  "FTP Cat6A": ["FTP Cat6A 4x2x0,58"],
  "S/FTP Cat6": ["S/FTP Cat6 4x2x0,57"],
  "S/FTP Cat6A": ["S/FTP Cat6A 4x2x0,58"],
}

def main():
    db = SessionLocal()
    try:
        for fam_name, labels in DATA.items():
            fam = db.query(CableFamily).filter_by(name=fam_name).first()
            if not fam:
                fam = CableFamily(name=fam_name)
                db.add(fam); db.flush()
            for label in labels:
                exists = db.query(Cable).filter_by(label=label).first()
                if exists:
                    continue
                spec = label.split(" ", 1)[1] if " " in label else None
                db.add(Cable(family_id=fam.id, label=label, spec=spec))
        db.commit()
        print("Seed hotový.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
