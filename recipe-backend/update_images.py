import pandas as pd
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# 1. Load the CSV again
# Make sure this matches your CSV filename exactly
csv_file = 'Food Ingredients and Recipe Dataset with Image Name Mapping.csv'
df = pd.read_csv(csv_file)

# 2. Connect to Database
conn = psycopg2.connect(
    host=os.getenv('DB_HOST'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_NAME'),
    port=os.getenv('DB_PORT')
)
cur = conn.cursor()

print("Connected. Updating image filenames...")

updated_count = 0

for index, row in df.iterrows():
    try:
        title = row['Title']
        image_name = row['Image_Name'] # This is the column header in the Kaggle CSV
        
        # Clean up the filename if necessary (ensure it ends in .jpg)
        if not image_name.endswith('.jpg'):
             image_name += '.jpg'

        # UPDATE the row where the title matches
        cur.execute(
            "UPDATE recipes SET image_name = %s WHERE title = %s",
            (image_name, title)
        )
        
        updated_count += 1
        
        if updated_count % 1000 == 0:
            conn.commit()
            print(f"Updated {updated_count} recipes...")

    except Exception as e:
        print(f"Error at index {index}: {e}")

conn.commit()
cur.close()
conn.close()
print(f"Success! Updated {updated_count} recipe images.")