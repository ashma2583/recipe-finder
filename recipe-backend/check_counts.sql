SELECT 'recipes' AS table, COUNT(*) FROM recipes
UNION ALL SELECT 'ingredients', COUNT(*) FROM ingredients
UNION ALL SELECT 'recipe_ingredients', COUNT(*) FROM recipe_ingredients;
