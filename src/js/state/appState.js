export class FoodLogStore {
  constructor(key = 'nutriplan_food_log_v1') {
    this.key = key;
  }
  all() {
    try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch { return {}; }
  }
  save(data) { localStorage.setItem(this.key, JSON.stringify(data)); }
  dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  get(date = new Date()) { return this.all()[this.dateKey(date)] || []; }
  add(item, date = new Date()) {
    const all = this.all();
    const key = this.dateKey(date);
    all[key] ||= [];
    all[key].push({ ...item, logId: crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, loggedAt: new Date().toISOString() });
    this.save(all);
  }
  remove(logId, date = new Date()) {
    const all = this.all();
    const key = this.dateKey(date);
    all[key] = (all[key] || []).filter(x => x.logId !== logId);
    this.save(all);
  }
  clear(date = new Date()) {
    const all = this.all();
    delete all[this.dateKey(date)];
    this.save(all);
  }
  totals(date = new Date()) {
    return this.get(date).reduce((a, x) => ({
      calories: a.calories + Number(x.calories || 0),
      protein: a.protein + Number(x.protein || 0),
      carbs: a.carbs + Number(x.carbs || 0),
      fat: a.fat + Number(x.fat || 0),
    }), { calories:0, protein:0, carbs:0, fat:0 });
  }
}

export class AppState {
  constructor() {
    this.meals = [];
    this.categories = [];
    this.areas = [];
    this.products = [];
    this.currentMeal = null;
    this.currentNutrition = null;
    this.activeCategory = '';
    this.activeArea = '';
    this.activeNutriGrade = '';
    this.gridView = true;
  }
}
