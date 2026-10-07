const esc = (v='') => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const num = (v, fallback=0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const pick = (obj, keys, fallback='') => { for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null && obj?.[k] !== '') return obj[k]; return fallback; };

export function normalizeMeal(raw={}) {
  const ingredients = raw.ingredients || Array.from({length:20}, (_,i) => {
    const ingredient = raw[`strIngredient${i+1}`];
    const measure = raw[`strMeasure${i+1}`];
    return ingredient?.trim() ? { ingredient: ingredient.trim(), measure: (measure||'').trim() } : null;
  }).filter(Boolean);
  return {
    id: String(pick(raw,['id','idMeal','mealId'],'')),
    name: pick(raw,['name','strMeal','title'],'Untitled Meal'),
    image: pick(raw,['image','imageUrl','strMealThumb','thumbnail'],'https://placehold.co/800x600?text=Meal'),
    category: pick(raw,['category','strCategory'],'Meal'),
    area: pick(raw,['area','strArea'],'International'),
    tags: Array.isArray(raw.tags) ? raw.tags : String(pick(raw,['strTags'],'')).split(',').map(x=>x.trim()).filter(Boolean),
    instructions: pick(raw,['instructions','strInstructions'],'No instructions available.'),
    youtube: pick(raw,['youtube','video','strYoutube'],''),
    source: pick(raw,['source','strSource'],''),
    ingredients,
    raw
  };
}

export function normalizeNutrition(raw={}) {
  const n = raw.perServing || raw.per_serving || raw.nutrition || raw.totals || raw;
  const nutrients = n.totalNutrients || n.nutrients || {};
  const read = (...keys) => {
    for (const k of keys) {
      const v = n?.[k] ?? nutrients?.[k]?.quantity ?? nutrients?.[k]?.value;
      if (v !== undefined && v !== null) return num(v);
    }
    return 0;
  };
  const servings = num(raw.yield || raw.servings || raw.numberOfServings || 1,1) || 1;
  let calories = read('calories','energyKcal','ENERC_KCAL');
  let protein = read('protein','protein_g','PROCNT');
  let carbs = read('carbs','carbohydrates','carbs_g','CHOCDF');
  let fat = read('fat','fat_g','FAT');
  let fiber = read('fiber','fiber_g','FIBTG');
  let sugar = read('sugar','sugars','sugar_g','SUGAR');
  if (raw.totals && !raw.perServing && servings > 1) { calories/=servings; protein/=servings; carbs/=servings; fat/=servings; fiber/=servings; sugar/=servings; }
  return { calories, protein, carbs, fat, fiber, sugar, servings, raw };
}

export function normalizeProduct(raw={}) {
  const nutr = raw.nutriments || raw.nutrition || {};
  const n = (...keys) => {
    for (const k of keys) {
      const v = raw[k] ?? nutr[k];
      if (v !== undefined && v !== null && v !== '') return num(v);
    }
    return 0;
  };
  return {
    code: String(pick(raw,['code','barcode','id'],'')),
    name: pick(raw,['name','productName','product_name'],'Unknown Product'),
    brand: pick(raw,['brand','brands','manufacturer'],'Unknown Brand'),
    image: pick(raw,['image','imageUrl','image_url','image_front_url'],'https://placehold.co/500x500?text=Product'),
    quantity: pick(raw,['quantity','servingSize','serving_size'],'100g'),
    grade: String(pick(raw,['nutritionGrade','nutriscore_grade','nutrition_grade_fr'],'')).toLowerCase(),
    nova: pick(raw,['novaGroup','nova_group'],''),
    calories: n('calories','caloriesPer100g','energy-kcal_100g','energy_kcal_100g'),
    protein: n('protein','proteinPer100g','proteins_100g'),
    carbs: n('carbs','carbsPer100g','carbohydrates_100g'),
    fat: n('fat','fatPer100g','fat_100g'),
    sugar: n('sugar','sugars_100g'),
    raw
  };
}

export class UI {
  constructor() {
    this.sections = {
      search: document.querySelector('#search-filters-section'),
      categories: document.querySelector('#meal-categories-section'),
      recipes: document.querySelector('#all-recipes-section'),
      details: document.querySelector('#meal-details'),
      products: document.querySelector('#products-section'),
      foodlog: document.querySelector('#foodlog-section')
    };
    this.headerTitle = document.querySelector('#header h1');
    this.headerSubtitle = document.querySelector('#header p');
  }

  hideLoading() {
    const el = document.querySelector('#app-loading-overlay');
    if (!el) return;
    el.style.opacity='0';
    setTimeout(()=> el.style.display='none', 450);
  }
  showOnly(page) {
    Object.values(this.sections).forEach(s => { if(s) s.style.display='none'; });
    if (page==='home') ['search','categories','recipes'].forEach(k=>this.sections[k].style.display='');
    if (page==='meal') this.sections.details.style.display='';
    if (page==='scanner') this.sections.products.style.display='';
    if (page==='foodlog') this.sections.foodlog.style.display='';
    window.scrollTo({top:0,behavior:'instant'});
  }
  setHeader(title, subtitle='') {
    this.headerTitle.textContent=title;
    this.headerSubtitle.textContent=subtitle;
  }
  setNav(index) {
    document.querySelectorAll('.nav-link').forEach((a,i)=>{
      a.className = `nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${i===index?'bg-emerald-50 text-emerald-700':'text-gray-600 hover:bg-gray-50'}`;
      const span=a.querySelector('span'); if(span) span.className=i===index?'font-semibold':'font-medium';
    });
  }
  toast(icon,title,text='') {
    if (window.Swal) Swal.fire({icon,title,text,toast:true,position:'top-end',showConfirmButton:false,timer:2200,timerProgressBar:true});
  }
  renderAreaButtons(areas, active='') {
    const row = document.querySelector('#search-filters-section .flex.items-center.gap-3');
    if(!row) return;
    const list = (areas||[]).slice(0,12).map(a=> typeof a==='string'?a:(a.name||a.area||a.strArea)).filter(Boolean);
    row.innerHTML = `<button data-area="" class="area-filter-btn px-4 py-2 ${active===''?'bg-emerald-600 text-white':'bg-gray-100 text-gray-700'} rounded-full font-medium text-sm whitespace-nowrap transition-all">All Recipes</button>`+
      list.map(a=>`<button data-area="${esc(a)}" class="area-filter-btn px-4 py-2 ${active===a?'bg-emerald-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-full font-medium text-sm whitespace-nowrap transition-all">${esc(a)}</button>`).join('');
  }
  renderCategories(categories, active='') {
    const el=document.querySelector('#categories-grid');
    if(!el) return;
    const icons=['fa-drumstick-bite','fa-bone','fa-fish','fa-ice-cream','fa-bowl-food','fa-seedling','fa-burger','fa-pizza-slice','fa-egg','fa-cookie-bite'];
    const list=(categories||[]).slice(0,12).map(c=>typeof c==='string'?{name:c}:{name:c.name||c.category||c.strCategory,description:c.description||c.strCategoryDescription||''});
    el.innerHTML=list.map((c,i)=>`<div class="category-card bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border ${active===c.name?'border-emerald-500 ring-2 ring-emerald-200':'border-emerald-200'} hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all group" data-category="${esc(c.name)}"><div class="flex items-center gap-2.5"><div class="text-white w-9 h-9 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><i class="fa-solid ${icons[i%icons.length]}"></i></div><div><h3 class="text-sm font-bold text-gray-900">${esc(c.name)}</h3></div></div></div>`).join('');
  }
  renderMeals(meals, grid=true) {
    const el=document.querySelector('#recipes-grid');
    const count=document.querySelector('#recipes-count');
    const list=(meals||[]).map(normalizeMeal).slice(0,25);
    count.textContent=`Showing ${list.length} recipes`;
    el.className = grid ? 'grid grid-cols-4 gap-5' : 'grid grid-cols-1 gap-4';
    if(!list.length){ el.innerHTML=`<div class="col-span-full text-center py-14 text-gray-500"><i class="fa-solid fa-magnifying-glass text-4xl text-gray-300 mb-3"></i><p class="font-semibold">No recipes found</p></div>`; return; }
    el.innerHTML=list.map(m=>`<article class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group ${grid?'':'flex'}" data-meal-id="${esc(m.id)}"><div class="relative ${grid?'h-48':'h-40 w-56 shrink-0'} overflow-hidden"><img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="${esc(m.image)}" alt="${esc(m.name)}" loading="lazy"><div class="absolute bottom-3 left-3 flex gap-2"><span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-gray-700">${esc(m.category)}</span><span class="px-2 py-1 bg-emerald-500 text-xs font-semibold rounded-full text-white">${esc(m.area)}</span></div></div><div class="p-4 flex-1"><h3 class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">${esc(m.name)}</h3><p class="text-xs text-gray-600 mb-3 line-clamp-2">Delicious recipe to try!</p><div class="flex items-center justify-between text-xs"><span class="font-semibold text-gray-900"><i class="fa-solid fa-utensils text-emerald-600 mr-1"></i>${esc(m.category)}</span><span class="font-semibold text-gray-500"><i class="fa-solid fa-globe text-blue-500 mr-1"></i>${esc(m.area)}</span></div></div></article>`).join('');
  }
  renderMealDetails(mealRaw, nutrition=null, loadingNutrition=false) {
    const meal=normalizeMeal(mealRaw);
    const el=this.sections.details;
    const tags=[meal.category,meal.area,...meal.tags.slice(0,1)].filter(Boolean);
    const yt = meal.youtube ? meal.youtube.replace('watch?v=','embed/').replace('youtu.be/','youtube.com/embed/') : '';
    const steps = String(meal.instructions||'').split(/\r?\n|(?<=\.)\s+(?=[A-Z0-9])/).map(s=>s.trim()).filter(Boolean).slice(0,12);
    const n = normalizeNutrition(nutrition||{});
    const facts = loadingNutrition ? `<div class="py-8 text-center"><i class="fa-solid fa-spinner fa-spin text-3xl text-emerald-600"></i><p class="text-sm text-gray-500 mt-3">Calculating nutrition...</p></div>` : this.nutritionFacts(n);
    el.innerHTML=`<div class="max-w-7xl mx-auto"><button id="back-to-meals-btn" class="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium mb-6 transition-colors"><i class="fa-solid fa-arrow-left"></i><span>Back to Recipes</span></button><div class="bg-white rounded-2xl shadow-lg overflow-hidden mb-8"><div class="relative h-80 md:h-96"><img src="${esc(meal.image)}" alt="${esc(meal.name)}" class="w-full h-full object-cover"><div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div><div class="absolute bottom-0 left-0 right-0 p-8"><div class="flex items-center gap-3 mb-3">${tags.map((t,i)=>`<span class="px-3 py-1 ${['bg-emerald-500','bg-blue-500','bg-purple-500'][i%3]} text-white text-sm font-semibold rounded-full">${esc(t)}</span>`).join('')}</div><h1 class="text-3xl md:text-4xl font-bold text-white mb-2">${esc(meal.name)}</h1><div class="flex items-center gap-6 text-white/90"><span class="flex items-center gap-2"><i class="fa-solid fa-utensils"></i><span>${esc(meal.category)}</span></span><span class="flex items-center gap-2"><i class="fa-solid fa-globe"></i><span>${esc(meal.area)}</span></span>${n.calories?`<span class="flex items-center gap-2"><i class="fa-solid fa-fire"></i><span>${Math.round(n.calories)} cal/serving</span></span>`:''}</div></div></div></div><div class="flex flex-wrap gap-3 mb-8"><button id="log-meal-btn" class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all" data-meal-id="${esc(meal.id)}"><i class="fa-solid fa-clipboard-list"></i><span>Log This Meal</span></button></div><div class="grid grid-cols-1 lg:grid-cols-3 gap-8"><div class="lg:col-span-2 space-y-8"><div class="bg-white rounded-2xl shadow-lg p-6"><h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><i class="fa-solid fa-list-check text-emerald-600"></i>Ingredients<span class="text-sm font-normal text-gray-500 ml-auto">${meal.ingredients.length} items</span></h2><div class="grid grid-cols-1 md:grid-cols-2 gap-3">${meal.ingredients.map(i=>`<label class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors"><input type="checkbox" class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300"><span class="text-gray-700"><span class="font-medium text-gray-900">${esc(i.measure)}</span> ${esc(i.ingredient||i.name)}</span></label>`).join('')}</div></div><div class="bg-white rounded-2xl shadow-lg p-6"><h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><i class="fa-solid fa-list-ol text-emerald-600"></i>Step-by-Step Instructions</h2><div class="space-y-2">${steps.map((s,i)=>`<div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"><div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">${i+1}</div><p class="text-gray-700 leading-relaxed pt-2">${esc(s)}</p></div>`).join('')}</div></div>${yt?`<div class="bg-white rounded-2xl shadow-lg p-6"><h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><i class="fa-solid fa-video text-red-500"></i>Video Tutorial</h2><div class="relative aspect-video rounded-xl overflow-hidden bg-gray-100"><iframe src="${esc(yt)}" class="absolute inset-0 w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`:''}</div><div class="space-y-6"><div class="bg-white rounded-2xl shadow-lg p-6 sticky top-24"><h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><i class="fa-solid fa-chart-pie text-emerald-600"></i>Nutrition Facts</h2><div id="nutrition-facts-container">${facts}</div></div></div></div></div>`;
  }
  nutritionFacts(n) {
    const pct=(v,max)=>Math.min(100,Math.round((num(v)/max)*100));
    return `<p class="text-sm text-gray-500 mb-4">Per serving</p><div class="text-center py-4 mb-4 bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl"><p class="text-sm text-gray-600">Calories per serving</p><p class="text-4xl font-bold text-emerald-600">${Math.round(n.calories||0)}</p></div><div class="space-y-4">${[['Protein',n.protein,'bg-emerald-500',50],['Carbs',n.carbs,'bg-blue-500',300],['Fat',n.fat,'bg-purple-500',65],['Fiber',n.fiber,'bg-orange-500',28],['Sugar',n.sugar,'bg-pink-500',50]].map(([label,v,color,max])=>`<div><div class="flex items-center justify-between"><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full ${color}"></div><span class="text-gray-700">${label}</span></div><span class="font-bold text-gray-900">${num(v).toFixed(v?1:0)}g</span></div><div class="w-full bg-gray-100 rounded-full h-2 mt-2"><div class="${color} h-2 rounded-full" style="width:${pct(v,max)}%"></div></div></div>`).join('')}</div>`;
  }
  renderProductCategories(categories=[]) {
    const el=document.querySelector('#product-categories');
    const list=categories.slice(0,10).map(c=>typeof c==='string'?c:(c.name||c.category||c.slug)).filter(Boolean);
    if(!list.length) return;
    el.innerHTML=list.map(c=>`<button class="product-category-btn px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-emerald-200 transition-all" data-category="${esc(c)}"><i class="fa-solid fa-tag mr-1.5"></i>${esc(c)}</button>`).join('');
  }
  renderProducts(products=[], grade='') {
    const list=products.map(normalizeProduct).filter(p=>!grade||p.grade===grade);
    document.querySelector('#products-count').textContent=`${list.length} product${list.length===1?'':'s'} found`;
    const el=document.querySelector('#products-grid');
    if(!list.length){el.innerHTML=`<div class="col-span-full text-center py-12 text-gray-500"><i class="fa-solid fa-barcode text-4xl text-gray-300 mb-3"></i><p class="font-semibold">No products found</p></div>`;return;}
    const gradeColor={a:'bg-green-500',b:'bg-lime-500',c:'bg-yellow-500',d:'bg-orange-500',e:'bg-red-500'};
    el.innerHTML=list.map(p=>`<article class="product-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all group" data-barcode="${esc(p.code)}"><div class="relative h-48 bg-gray-100 flex items-center justify-center overflow-hidden"><img class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">${p.grade?`<div class="absolute top-2 left-2 ${gradeColor[p.grade]||'bg-gray-500'} text-white text-xs font-bold px-2 py-1 rounded uppercase">Nutri-Score ${esc(p.grade)}</div>`:''}${p.nova?`<div class="absolute top-2 right-2 bg-lime-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" title="NOVA ${esc(p.nova)}">${esc(p.nova)}</div>`:''}</div><div class="p-4"><p class="text-xs text-emerald-600 font-semibold mb-1 truncate">${esc(p.brand)}</p><h3 class="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">${esc(p.name)}</h3><div class="flex items-center gap-3 text-xs text-gray-500 mb-3"><span><i class="fa-solid fa-weight-scale mr-1"></i>${esc(p.quantity)}</span><span><i class="fa-solid fa-fire mr-1"></i>${Math.round(p.calories)} kcal/100g</span></div><div class="grid grid-cols-4 gap-1 text-center mb-3"><div class="bg-emerald-50 rounded p-1.5"><p class="text-xs font-bold text-emerald-700">${p.protein.toFixed(1)}g</p><p class="text-[10px] text-gray-500">Protein</p></div><div class="bg-blue-50 rounded p-1.5"><p class="text-xs font-bold text-blue-700">${p.carbs.toFixed(1)}g</p><p class="text-[10px] text-gray-500">Carbs</p></div><div class="bg-purple-50 rounded p-1.5"><p class="text-xs font-bold text-purple-700">${p.fat.toFixed(1)}g</p><p class="text-[10px] text-gray-500">Fat</p></div><div class="bg-orange-50 rounded p-1.5"><p class="text-xs font-bold text-orange-700">${p.sugar.toFixed(1)}g</p><p class="text-[10px] text-gray-500">Sugar</p></div></div><button class="log-product-btn w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700" data-code="${esc(p.code)}">Add to Food Log</button></div></article>`).join('');
  }
  renderFoodLog(store) {
    const date=new Date();
    document.querySelector('#foodlog-date').textContent=date.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
    const items=store.get(date), totals=store.totals(date), goals={calories:2000,protein:50,carbs:250,fat:65};
    const cards=document.querySelectorAll('#foodlog-today-section > .grid > div');
    ['calories','protein','carbs','fat'].forEach((key,i)=>{ const card=cards[i]; if(!card)return; const span=card.querySelector('.text-gray-500'); const bar=card.querySelector('.h-2\\.5 > div, .h-2\\.5.rounded-full'); if(span) span.textContent=`${Math.round(totals[key])} / ${goals[key]} ${key==='calories'?'kcal':'g'}`; const actualBar=card.querySelector('.bg-emerald-500, .bg-blue-500, .bg-amber-500, .bg-purple-500'); if(actualBar) actualBar.style.width=`${Math.min(100,(totals[key]/goals[key])*100)}%`; });
    const title=document.querySelector('#foodlog-today-section h4'); if(title) title.textContent=`Logged Items (${items.length})`;
    const clear=document.querySelector('#clear-foodlog'); clear.style.display=items.length?'':'none';
    const list=document.querySelector('#logged-items-list');
    list.innerHTML=items.length?items.map(x=>`<div class="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"><img src="${esc(x.image||'https://placehold.co/72x72?text=Food')}" class="w-14 h-14 rounded-lg object-cover" alt=""><div class="flex-1 min-w-0"><p class="font-semibold text-gray-900 truncate">${esc(x.name)}</p><p class="text-xs text-gray-500">${Math.round(num(x.calories))} kcal · P ${num(x.protein).toFixed(1)}g · C ${num(x.carbs).toFixed(1)}g · F ${num(x.fat).toFixed(1)}g</p></div><button class="remove-log-item text-red-500 hover:text-red-700 p-2" data-log-id="${esc(x.logId)}"><i class="fa-solid fa-trash"></i></button></div>`).join(''):`<div class="text-center py-8 text-gray-500"><i class="fa-solid fa-utensils text-4xl mb-3 text-gray-300"></i><p class="font-medium">No meals logged today</p><p class="text-sm">Add meals from the Meals page or scan products</p></div>`;
  }
}
