# NutriPlan JavaScript Exam

Functional implementation built on the original NutriPlan starter design.

## Features
- 25 random meals on Home
- Search + filter by category and cuisine area
- Dynamic meal details, ingredients, instructions and YouTube tutorial
- Nutrition analysis through NutriPlan API (uses USDA `DEMO_KEY`; replace it in `src/js/api/nutriplanApi.js` with your USDA key if needed)
- Product search, barcode lookup, category browsing and Nutri-Score filters
- Food Log persisted with LocalStorage
- Daily macro/calorie progress + weekly calorie chart
- SPA-style URL routing: `/home`, `/meal/:id`, `/scanner`, `/foodlog`
- OOP / ES Modules
- Responsive original design

## Run locally
Because ES modules are used, run through a local web server instead of opening `index.html` directly.

Example:
```bash
python -m http.server 5500
```
Then open `http://localhost:5500/home`.
