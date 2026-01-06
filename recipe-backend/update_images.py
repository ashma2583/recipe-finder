import pandas as pd
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# 1. Load CSV
csv_file = 'Food Ingredients and Recipe Dataset with Image Name Mapping.csv'
df = pd.read_csv(csv_file)

# 2. Connect
conn = psycopg2.connect(
    host=os.getenv('DB_HOST'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_NAME'),
    port=os.getenv('DB_PORT')
)
cur = conn.cursor()

print("Starting Fuzzy Image Update...")
updated_count = 0

for index, row in df.iterrows():
    try:
        title = row['Title'].strip() # Remove accidental spaces
        image_name = row['Image_Name']
        
        if pd.isna(image_name): continue

        if not image_name.endswith('.jpg'):
             image_name += '.jpg'

        # THE FIX: Use ILIKE and TRIM to catch mismatched titles
        # This matches "Piccante Eggplant Sauce" with "Piccante Eggplant Sauce "
        cur.execute(
            """
            UPDATE recipes 
            SET image_name = %s 
            WHERE TRIM(title) ILIKE %s 
            AND image_name IS NULL
            """,
            (image_name, title)
        )
        
        if cur.rowcount > 0:
            updated_count += 1
        
        if updated_count % 100 == 0:
            conn.commit()
            print(f"Updated {updated_count} recipes...")

    except Exception as e:
        conn.rollback()
        # print(f"Error: {e}")

conn.commit()
cur.close()
conn.close()
print(f"Done! Filled in {updated_count} missing images.")