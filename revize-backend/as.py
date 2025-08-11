
import os, sqlite3
db = os.path.join(os.path.dirname(__file__), "projects.db")
con = sqlite3.connect(db); cur = con.cursor()
cur.execute("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)")
con.commit()
cur.execute("DELETE FROM alembic_version")
con.commit()
print("alembic_version vyprázdněna")
