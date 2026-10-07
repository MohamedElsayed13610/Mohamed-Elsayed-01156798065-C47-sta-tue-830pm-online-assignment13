export class NutriPlanAPI {
  constructor(baseUrl = 'https://nutriplan-api.vercel.app/api') {
    this.baseUrl = baseUrl;
  }

  async request(path, options = {}) {
    const { params = {}, method = 'GET', body, headers = {} } = options;
    const url = new URL(this.baseUrl + path);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
    const init = { method, headers: { ...headers } };
    if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    if (!res.ok) throw new Error(data?.message || data?.error?.message || data?.error || `Request failed (${res.status})`);
    return data || {};
  }

  async getCategories() {
    const d = await this.request('/meals/categories');
    return d.results || d.categories || [];
  }
  async getAreas() {
    const d = await this.request('/meals/areas');
    return d.results || d.areas || [];
  }
  async getRandomMeals(count = 25) {
    const d = await this.request('/meals/random', { params: { count } });
    return d.results || d.meals || [];
  }
  async filterMeals({ category = '', area = '', ingredient = '', limit = 25 } = {}) {
    const d = await this.request('/meals/filter', { params: { category, area, ingredient, limit } });
    return d.results || d.meals || [];
  }
  async searchMeals(q) {
    const d = await this.request('/meals/search', { params: { q } });
    return d.results || d.meals || [];
  }
  async getMeal(id) {
    const d = await this.request(`/meals/${encodeURIComponent(id)}`);
    return d.result || d.meal || d;
  }
  async analyzeNutrition(meal) {
    const ingredients = (meal.ingredients || []).map(i => `${i.measure || ''} ${i.ingredient || i.name || ''}`.trim()).filter(Boolean);
    const d = await this.request('/nutrition/analyze', {
      method: 'POST',
      headers: { 'x-api-key': 'DEMO_KEY' },
      body: { recipeName: meal.name || meal.strMeal || 'Recipe', ingredients }
    });
    return d.data || d.result || d;
  }
  async searchProducts(q, page = 1, limit = 25) {
    const d = await this.request('/products/search', { params: { q, page, limit } });
    return d.results || d.products || [];
  }
  async getProductByBarcode(code) {
    const d = await this.request(`/products/barcode/${encodeURIComponent(code)}`);
    return d.result || d.product || d;
  }
  async getProductCategories(page = 1, limit = 50) {
    const d = await this.request('/products/categories', { params: { page, limit } });
    return d.results || d.categories || [];
  }
  async getProductsByCategory(category, page = 1, limit = 25) {
    const d = await this.request(`/products/category/${encodeURIComponent(category)}`, { params: { page, limit } });
    return d.results || d.products || [];
  }
}
