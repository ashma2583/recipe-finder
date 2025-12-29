SELECT 
    recipes.id,
    recipes.title,
    ARRAY_AGG(ingredients.name) AS all_ingredients
FROM recipes
JOIN recipe_ingredients ON recipes.id = recipe_ingredients.recipe_id
JOIN ingredients ON recipe_ingredients.ingredient_id = ingredients.id
GROUP BY recipes.id, recipes.title