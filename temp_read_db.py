import sqlite3
import pathlib
root = pathlib.Path(__file__).resolve().parent
db_path = root / "backend" / "src" / "QAQuest.Api" / "qaquest.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
for name, sql in cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table';"):
    print(name)
    print(sql)
    print('---')
