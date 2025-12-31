-- SELECT 
--     recipes.id,
--     recipes.title,
--     ARRAY_AGG(ingredients.name) AS all_ingredients
-- FROM recipes
-- JOIN recipe_ingredients ON recipes.id = recipe_ingredients.recipe_id
-- JOIN ingredients ON recipe_ingredients.ingredient_id = ingredients.id
-- GROUP BY recipes.id, recipes.title

-- -- Increase the limit for ingredient names
-- ALTER TABLE ingredients 
-- ALTER COLUMN name TYPE TEXT;

-- -- It's also a good idea to check your recipe titles
-- ALTER TABLE recipes 
-- ALTER COLUMN title TYPE TEXT;

-- -- Change constraints to handle unrestricted lengths
-- ALTER TABLE recipes ALTER COLUMN title TYPE TEXT;
-- ALTER TABLE recipes ALTER COLUMN instructions TYPE TEXT;
-- ALTER TABLE ingredients ALTER COLUMN name TYPE TEXT;

-- -- Add a unique constraint if you haven't yet
-- -- This prevents the same ingredient from being added twice
-- ALTER TABLE ingredients ADD CONSTRAINT unique_ingredient_name UNIQUE (name);


TRUNCATE recipes, ingredients, recipe_ingredients RESTART IDENTITY CASCADE;


ALTER TABLE recipes ADD CONSTRAINT unique_recipe_title UNIQUE (title);