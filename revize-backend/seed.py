from database import SessionLocal, engine
from models import Base, User, Project, Revision
from models import project_user_link  # import spojovací tabulky
from datetime import datetime, timedelta
import random

# 🧹 Drop + create all
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# 🔐 Vytvoříme uživatele
users = [
    User(name="Petr Revizní", email="petr@example.com", password_hash="hashed1"),
    User(name="Jana Technická", email="jana@example.com", password_hash="hashed2"),
    User(name="Karel Pomocný", email="karel@example.com", password_hash="hashed3"),
]
for u in users:
    db.add(u)
db.commit()

# 🔄 Mapujeme uživatele
u1, u2, u3 = users

# 📁 Projekty
projects = [
    Project(address="U Lesa 12, Praha", client="Novák", owner=u1),
    Project(address="Na Výsluní 45, Brno", client="Svoboda", owner=u1),
    Project(address="Zahradní 8, Ostrava", client="Dvořák", owner=u2),
    Project(address="Dlouhá 33, Plzeň", client="Beneš", owner=u3),
]

# 🧑‍🤝‍🧑 Sdílení: projekt[0] u1 ↔ u2, projekt[2] u2 ↔ u3
projects[0].shared_with_users.append(u2)
projects[2].shared_with_users.append(u3)

for p in projects:
    db.add(p)
db.commit()

# 📄 Revize
rev_id_counter = 1000  # pro unikátní evidenční čísla

for project in projects:
    for _ in range(random.randint(1, 3)):
        done = datetime.now() - timedelta(days=random.randint(30, 365))
        valid = done + timedelta(days=365*4)
        rev = Revision(
            number=f"RZ-{rev_id_counter}",
            type=random.choice(["Elektroinstalace", "FVE", "Spotřebič", "Stroj"]),
            date_done=done.strftime("%Y-%m-%d"),
            valid_until=valid.strftime("%Y-%m-%d"),
            status=random.choice(["Hotová", "Rozpracovaná"]),
            data_json='{"poznámka": "Seedová revize"}',
            project_id=project.id
        )
        rev_id_counter += 1
        db.add(rev)

db.commit()
db.close()
print("✅ Seed hotov. Vytvořeni uživatelé, projekty a revize.")
