from recipe_scrapers import scrape_me
import json

# List of URLs you want to scrape
urls = [
    'https://www.allrecipes.com/recipe/158140/spaghetti-sauce-with-ground-beef/',
    'https://www.allrecipes.com/recipe/212721/indian-chicken-curry-murgh-kari/',
    'https://www.allrecipes.com/recipe/241601/sesame-chicken-for-slow-cooker/'
]

scraped_data = []

for url in urls:
    try:
        scraper = scrape_me(url)
        
        recipe = {
            "title": scraper.title(),
            "ingredients": scraper.ingredients(), # List of strings
            "instructions": scraper.instructions(),
            "image": scraper.image()
        }
        scraped_data.append(recipe)
        print(f"✅ Scraped: {recipe['title']}")
    except Exception as e:
        print(f"❌ Failed {url}: {e}")

# Save to a JSON file
with open('recipes.json', 'w') as f:
    json.dump(scraped_data, f, indent=4)