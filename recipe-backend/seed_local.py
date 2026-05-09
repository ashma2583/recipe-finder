import pandas as pd
import psycopg2
import json
import os
from dotenv import load_dotenv

load_dotenv()

CSV_FILE = 'recipes_data.csv'
ROW_LIMIT = 13000

df = pd.read_csv(CSV_FILE, nrows=ROW_LIMIT)

conn = psycopg2.connect(
    host=os.getenv('DB_HOST'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_NAME'),
    port=os.getenv('DB_PORT')
)
cur = conn.cursor()

print(f"Connected. Seeding {len(df)} recipes...")

for index, row in df.iterrows():
    try:
        directions = row['directions']
        try:
            steps = json.loads(directions)
            instructions = '\n'.join(steps) if isinstance(steps, list) else str(directions)
        except (json.JSONDecodeError, TypeError):
            instructions = str(directions)

        cur.execute(
            "INSERT INTO recipes (title, instructions) VALUES (%s, %s) RETURNING id",
            (row['title'], instructions)
        )
        recipe_id = cur.fetchone()[0]

        # NER column holds cleaned ingredient names as a JSON-ish list
        ner = row['NER']
        try:
            ingredients = json.loads(ner)
        except (json.JSONDecodeError, TypeError):
            ingredients = []

        for ing_name in ingredients:
            name = ing_name.strip().lower()
            if not name:
                continue
            cur.execute(
                """
                INSERT INTO ingredients (name)
                VALUES (%s)
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
                """,
                (name,)
            )
            ing_id = cur.fetchone()[0]

            cur.execute(
                "INSERT INTO recipe_ingredients (recipe_id, ingredient_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (recipe_id, ing_id)
            )

        if index % 500 == 0 and index > 0:
            conn.commit()
            print(f"Uploaded {index} recipes...")

    except Exception as e:
        print(f"Error at index {index}: {e}")
        conn.rollback()

conn.commit()
cur.close()
conn.close()
print(f"Done. Seeded ~{len(df)} recipes.")
