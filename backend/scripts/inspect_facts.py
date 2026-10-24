import sqlite3
import json

conn = sqlite3.connect("backend/verifin.db")
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("""
    SELECT metric, canonical_metric, value, unit, period, xbrl_tag, extraction_method
    FROM facts
    WHERE canonical_metric IN ('revenue', 'net_income', 'operating_income', 'gross_profit', 'total_assets', 'eps')
    LIMIT 20
""")
rows = cursor.fetchall()
for r in rows:
    print(dict(r))
