import pandas as pd
import psycopg2
import json
import os
from dotenv import load_dotenv

load_dotenv()

# 1. Load the CSV
df = pd.read_csv('Food Ingredients and Recipe Dataset with Image Name Mapping.csv', encoding='utf-8')

# 2. Connect to AWS RDS
conn = psycopg2.connect(
    host=os.getenv('DB_HOST'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_NAME'),
    port=os.getenv('DB_PORT')
)
cur = conn.cursor()

print("Connected to AWS. Starting upload...")

for index, row in df.iterrows():
    try:
        # Save Recipe
        cur.execute(
            "INSERT INTO recipes (title, instructions) VALUES (%s, %s) RETURNING id",
            (row['Title'], row['Instructions'])
        )
        recipe_id = cur.fetchone()[0]

        # Process Ingredients (Kaggle stores them as a string representation of a list)
        # We convert it to a real Python list
        ingredients = eval(row['Cleaned_Ingredients']) 

        for ing_name in ingredients:
            # Check if ingredient exists, or insert it
            cur.execute(
                """
                INSERT INTO ingredients (name) 
                VALUES (%s) 
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
                RETURNING id
                """,
                (ing_name.strip(),)
            )
            ing_id = cur.fetchone()[0]

            # Link them in the bridge table
            cur.execute(
                "INSERT INTO recipe_ingredients (recipe_id, ingredient_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (recipe_id, ing_id)
            )

        if index % 100 == 0:
            conn.commit()
            print(f"Uploaded {index} recipes...")

    except Exception as e:
        print(f"Error at index {index}: {e}")
        conn.rollback()

conn.commit()
cur.close()
conn.close()
print("Database seeding complete!")