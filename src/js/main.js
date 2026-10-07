import { NutriPlanAPI } from './api/nutriplanApi.js';
import { AppState, FoodLogStore } from './state/appState.js';
import { UI, normalizeMeal, normalizeNutrition, normalizeProduct } from './ui/components.js';

class NutriPlanApp {
  constructor() {
    this.api = new NutriPlanAPI();
    this.state = new AppState();
    this.store = new FoodLogStore();
    this.ui = new UI();
    this.searchTimer = null;
  }

  async init() {
    this.bindGlobalEvents();
    await this.bootstrap();
    this.route(false);
    this.ui.hideLoading();
  }

  async bootstrap() {
    try {
      const [categories, areas, meals] = await Promise.all([
        this.api.getCategories().catch(()=>[]),
        this.api.getAreas().catch(()=>[]),
        this.api.getRandomMeals(25).catch(()=>[])
      ]);
      this.state.categories = categories;
      this.state.areas = areas;
      this.state.meals = meals;
      this.ui.renderCategories(categories);
      this.ui.renderAreaButtons(areas);
      this.ui.renderMeals(meals, true);
      this.api.getProductCategories().then(x=>this.ui.renderProductCategories(x)).catch(()=>{});
    } catch (e) {
      this.ui.toast('error','Could not load NutriPlan', e.message);
    }
  }

  bindGlobalEvents() {
    const nav = document.querySelectorAll('.nav-link');
    nav[0]?.addEventListener('click',e=>{e.preventDefault();this.go('/home');});
    nav[1]?.addEventListener('click',e=>{e.preventDefault();this.go('/scanner');});
    nav[2]?.addEventListener('click',e=>{e.preventDefault();this.go('/foodlog');});
    window.addEventListener('popstate',()=>this.route(false));

    document.querySelector('#header-menu-btn')?.addEventListener('click',()=>this.toggleSidebar(true));
    document.querySelector('#sidebar-close-btn')?.addEventListener('click',()=>this.toggleSidebar(false));
    document.querySelector('#sidebar-overlay')?.addEventListener('click',()=>this.toggleSidebar(false));

    document.addEventListener('click', async e => {
      const card=e.target.closest('.recipe-card'); if(card){ this.go(`/meal/${card.dataset.mealId}`); return; }
      const cat=e.target.closest('.category-card'); if(cat){ await this.applyMealFilter({category:cat.dataset.category}); return; }
      const area=e.target.closest('.area-filter-btn'); if(area){ await this.applyMealFilter({area:area.dataset.area}); return; }
      if(e.target.closest('#back-to-meals-btn')){ this.go('/home'); return; }
      if(e.target.closest('#log-meal-btn')){ this.logCurrentMeal(); return; }
      const pc=e.target.closest('.product-category-btn'); if(pc?.dataset.category){ await this.loadProductCategory(pc.dataset.category); return; }
      const pf=e.target.closest('.nutri-score-filter'); if(pf){ this.state.activeNutriGrade=pf.dataset.grade||''; this.paintNutriFilters(); this.ui.renderProducts(this.state.products,this.state.activeNutriGrade); return; }
      const lp=e.target.closest('.log-product-btn'); if(lp){ this.logProduct(lp.dataset.code); return; }
      const rm=e.target.closest('.remove-log-item'); if(rm){ this.store.remove(rm.dataset.logId); this.refreshFoodLog(); return; }
    });

    document.querySelector('#search-input')?.addEventListener('input',e=>{
      clearTimeout(this.searchTimer);
      this.searchTimer=setTimeout(()=>this.searchMeals(e.target.value.trim()),350);
    });
    document.querySelector('#grid-view-btn')?.addEventListener('click',()=>this.setView(true));
    document.querySelector('#list-view-btn')?.addEventListener('click',()=>this.setView(false));
    document.querySelector('#search-product-btn')?.addEventListener('click',()=>this.searchProducts());
    document.querySelector('#product-search-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')this.searchProducts();});
    document.querySelector('#lookup-barcode-btn')?.addEventListener('click',()=>this.lookupBarcode());
    document.querySelector('#barcode-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')this.lookupBarcode();});
    document.querySelector('#clear-foodlog')?.addEventListener('click',()=>{
      this.store.clear(); this.refreshFoodLog(); this.ui.toast('success','Food log cleared');
    });
  }

  toggleSidebar(open){document.querySelector('#sidebar')?.classList.toggle('open',open);document.querySelector('#sidebar-overlay')?.classList.toggle('active',open);}
  go(path){ history.pushState({},'',path); this.route(false); this.toggleSidebar(false); }
  async route() {
    const p=location.pathname;
    if(p.startsWith('/meal/')) { await this.openMeal(p.split('/').filter(Boolean)[1]); return; }
    if(p==='/scanner'||p==='/products') { this.ui.showOnly('scanner'); this.ui.setHeader('Product Scanner','Search packaged foods by name or barcode'); this.ui.setNav(1); document.title='NutriPlan - Product Scanner'; return; }
    if(p==='/foodlog') { this.ui.showOnly('foodlog'); this.ui.setHeader('Food Log','Track your daily calories and macros'); this.ui.setNav(2); this.refreshFoodLog(); document.title='NutriPlan - Food Log'; return; }
    this.ui.showOnly('home'); this.ui.setHeader('Meals & Recipes','Discover delicious and nutritious recipes tailored for you'); this.ui.setNav(0); document.title='NutriPlan - Meals & Recipes';
  }

  async applyMealFilter(changed) {
    if ('category' in changed) this.state.activeCategory = this.state.activeCategory===changed.category?'':changed.category;
    if ('area' in changed) this.state.activeArea = changed.area;
    this.ui.renderCategories(this.state.categories,this.state.activeCategory);
    this.ui.renderAreaButtons(this.state.areas,this.state.activeArea);
    try {
      const meals=(this.state.activeCategory||this.state.activeArea)?await this.api.filterMeals({category:this.state.activeCategory,area:this.state.activeArea,limit:25}):await this.api.getRandomMeals(25);
      this.state.meals=meals; this.ui.renderMeals(meals,this.state.gridView);
    } catch(e){this.ui.toast('error','Filter failed',e.message);}
  }

  async searchMeals(q) {
    if(!q){ await this.applyMealFilter({area:this.state.activeArea}); return; }
    try { this.state.meals=await this.api.searchMeals(q); this.ui.renderMeals(this.state.meals,this.state.gridView); }
    catch(e){ this.ui.toast('error','Search failed',e.message); }
  }

  setView(grid) {
    this.state.gridView=grid; this.ui.renderMeals(this.state.meals,grid);
    document.querySelector('#grid-view-btn').className=`px-3 py-1.5 ${grid?'bg-white rounded-md shadow-sm':''}`;
    document.querySelector('#list-view-btn').className=`px-3 py-1.5 ${!grid?'bg-white rounded-md shadow-sm':''}`;
  }

  async openMeal(id) {
    this.ui.showOnly('meal'); this.ui.setHeader('Meal Details','Ingredients, preparation and nutrition facts'); this.ui.setNav(0); document.title='NutriPlan - Meal Details';
    try {
      const raw=await this.api.getMeal(id); const meal=normalizeMeal(raw); this.state.currentMeal=meal; this.state.currentNutrition=null;
      this.ui.renderMealDetails(meal,null,true);
      try { const nutrition=await this.api.analyzeNutrition(meal); this.state.currentNutrition=normalizeNutrition(nutrition); this.ui.renderMealDetails(meal,nutrition,false); }
      catch { this.state.currentNutrition={calories:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0}; this.ui.renderMealDetails(meal,this.state.currentNutrition,false); }
    } catch(e) { this.ui.toast('error','Could not load meal',e.message); this.go('/home'); }
  }

  logCurrentMeal() {
    const m=this.state.currentMeal; if(!m)return;
    const n=this.state.currentNutrition||{};
    this.store.add({type:'meal',id:m.id,name:m.name,image:m.image,calories:n.calories||0,protein:n.protein||0,carbs:n.carbs||0,fat:n.fat||0});
    this.ui.toast('success','Meal added to Food Log',m.name);
  }

  async searchProducts() {
    const q=document.querySelector('#product-search-input').value.trim(); if(!q){this.ui.toast('info','Type a product name first');return;}
    try { this.state.products=await this.api.searchProducts(q); this.ui.renderProducts(this.state.products,this.state.activeNutriGrade); }
    catch(e){this.ui.toast('error','Product search failed',e.message);}
  }
  async lookupBarcode() {
    const code=document.querySelector('#barcode-input').value.trim(); if(!code){this.ui.toast('info','Enter a barcode first');return;}
    try { const p=await this.api.getProductByBarcode(code); this.state.products=p?[p]:[]; this.ui.renderProducts(this.state.products,this.state.activeNutriGrade); }
    catch(e){this.state.products=[];this.ui.renderProducts([]);this.ui.toast('error','Product not found',e.message);}
  }
  async loadProductCategory(category){
    try { this.state.products=await this.api.getProductsByCategory(category); this.ui.renderProducts(this.state.products,this.state.activeNutriGrade); }
    catch(e){this.ui.toast('error','Could not load category',e.message);}
  }
  paintNutriFilters(){document.querySelectorAll('.nutri-score-filter').forEach(b=>{const on=(b.dataset.grade||'')===this.state.activeNutriGrade;b.classList.toggle('bg-emerald-600',on);b.classList.toggle('text-white',on);});}
  logProduct(code){
    const p=normalizeProduct(this.state.products.find(x=>String(x.code||x.barcode||x.id)===String(code))||{}); if(!p.name)return;
    this.store.add({type:'product',id:p.code,name:p.name,image:p.image,calories:p.calories,protein:p.protein,carbs:p.carbs,fat:p.fat}); this.ui.toast('success','Product added to Food Log',p.name);
  }
  refreshFoodLog(){
    this.ui.renderFoodLog(this.store);
    if(!window.Plotly)return;
    const labels=[], values=[]; for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);labels.push(d.toLocaleDateString('en-US',{weekday:'short'}));values.push(Math.round(this.store.totals(d).calories));}
    Plotly.newPlot('weekly-chart',[{x:labels,y:values,type:'bar',marker:{color:'#10b981'}}],{margin:{t:10,r:10,b:35,l:45},height:260,yaxis:{title:'kcal'},paper_bgcolor:'transparent',plot_bgcolor:'transparent'},{displayModeBar:false,responsive:true});
  }
}

document.addEventListener('DOMContentLoaded',()=>new NutriPlanApp().init());
