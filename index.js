const STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const UI_TEXT = {
    en: { title: "THE GAZETTE", edition: "National Edition", nav: ["general", "world", "nation", "states", "sports", "technology"] },
    hi: { title: "द गज़ेट", edition: "राष्ट्रीय संस्करण", nav: ["general", "world", "nation", "states", "sports", "technology"], labels: { general: "मुख्य समाचार", world: "विश्व", nation: "देश", states: "राज्य", sports: "खेल", technology: "तकनीक" } },
    bn: { title: "দ্য গেজেট", edition: "জাতীয় সংস্করণ", nav: ["general", "world", "nation", "states", "sports", "technology"], labels: { general: "মূল খবর", world: "আন্তর্জাতিক", nation: "দেশ", states: "রাজ্য", sports: "খেলাধুলা", technology: "প্রযুক্তি" } }
};

let currentLang = 'en';
let currentPage = 1;
let currentCategory = 'general';
let currentState = "";
let apiTokens = { newsdata: [], currents: [] }; // Storage for page tokens to fix pagination bug

const API_SOURCES = [
    {
        name: 'GNews',
        fetch: async (p, c, l) => {
            const key = '8d2a825a10e2836e5c8a26affa038680';
            let query = (c === 'states') ? `q=${currentState || 'India'}` : `category=${c}`;
            const res = await fetch(`https://gnews.io/api/v4/top-headlines?${query}&lang=${l}&country=in&max=10&page=${p}&apikey=${key}`);
            const data = await res.json();
            if (!res.ok) throw new Error();
            return data.articles.map(a => ({ title: a.title, desc: a.description, img: a.image, link: a.url, source: a.source.name }));
        }
    },
    {
        name: 'NewsData',
        fetch: async (p, c, l) => {
            const key = 'pub_9410f56733d649d0bd05e1204efae7ee';
            const cat = c === 'general' ? 'top' : (c === 'nation' ? 'politics' : (c === 'states' ? 'top' : c));
            let url = `https://newsdata.io/api/1/news?apikey=${key}&country=in&language=${l}&category=${cat}`;
            if (c === 'states' && currentState) url += `&q=${currentState}`;
            if (p > 1 && apiTokens.newsdata[p-2]) url += `&page=${apiTokens.newsdata[p-2]}`;
            
            const res = await fetch(url);
            const data = await res.json();
            if (data.status === "error") throw new Error();
            apiTokens.newsdata[p-1] = data.nextPage; // Save token for next page
            return data.results.map(a => ({ title: a.title, desc: a.description, img: a.image_url, link: a.link, source: a.source_id }));
        }
    },
    {
        name: 'CurrentsAPI',
        fetch: async (p, c, l) => {
            const key = 'ZSiD8EbjAqlidDAA0wxOu3Dn2i5C9wRazO7i-Xave-kk4s-g ';
            let url = `https://api.currentsapi.services/v1/latest-news?language=${l}&apiKey=${key}`;
            if (c === 'states') url += `&keywords=${currentState || 'India'}`; else url += `&category=${c}`;
            
            const res = await fetch(url);
            const data = await res.json();
            if (data.status !== "ok") throw new Error();
            return data.news.map(a => ({ title: a.title, desc: a.description, img: a.image, link: a.url, source: a.author }));
        }
    }
];

async function loadNews(page = 1, category = 'general', lang = 'en') {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = `<div class="col-span-full text-center py-20 text-stone-400 italic text-xl">Loading Sources...</div>`;
    
    // Toggle State Dropdown
    document.getElementById('state-selector').classList.toggle('hidden', category !== 'states');

    let results = null;
    for (let source of API_SOURCES) {
        try {
            results = await source.fetch(page, category, lang);
            if (results && results.length > 0) break;
        } catch (e) { continue; }
    }

    if (results) {
        renderNews(results);
    } else {
        grid.innerHTML = `<div class="col-span-full text-center py-20 font-bold text-red-800">ALL API LIMITS EXHAUSTED</div>`;
    }
}

function renderNews(articles) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '';
    document.getElementById('breaking-ticker').innerText = articles.map(a => a.title).join(' • ');

    articles.forEach((article, index) => {
        const isHero = index === 0;
        grid.innerHTML += `
            <article class="${isHero ? 'md:col-span-2 border-b-2 md:border-r border-stone-300 md:pr-8 mb-6 pb-6' : 'border-b border-stone-200 pb-6'}">
                <img src="${article.img || 'https://via.placeholder.com/600x400'}" class="w-full ${isHero ? 'h-96' : 'h-48'} object-cover mb-4">
                <h2 class="${isHero ? 'text-3xl' : 'text-lg'} font-bold mb-2">
                    <a href="${article.link}" target="_blank" class="hover:text-red-700">${article.title}</a>
                </h2>
                <p class="text-stone-600 line-clamp-3 text-sm">${article.desc || ''}</p>
                <p class="text-[10px] font-bold mt-2 uppercase text-stone-400">Source: ${article.source}</p>
            </article>`;
    });
    window.scrollTo(0,0);
}

function updateUIStrings() {
    const ui = UI_TEXT[currentLang];
    document.getElementById('main-title').innerText = ui.title;
    document.getElementById('edition-label').innerText = ui.edition;
    
    const nav = document.getElementById('nav-bar');
    nav.innerHTML = ui.nav.map(cat => {
        const label = ui.labels ? ui.labels[cat] : cat.toUpperCase();
        return `<button class="category-btn ${cat === currentCategory ? 'active' : ''}" data-category="${cat}">${label}</button>`;
    }).join('');

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.onclick = (e) => {
            currentCategory = e.target.dataset.category;
            currentPage = 1;
            apiTokens = { newsdata: [], currents: [] }; // Reset tokens on category change
            loadNews(1, currentCategory, currentLang);
            updateUIStrings();
        };
    });
}

// State Selector Logic
const stateDropdown = document.getElementById('state-dropdown');
stateDropdown.innerHTML += STATES.map(s => `<option value="${s}">${s}</option>`).join('');
stateDropdown.onchange = (e) => {
    currentState = e.target.value;
    currentPage = 1;
    loadNews(1, 'states', currentLang);
};

// Pagination
document.getElementById('next-btn').onclick = () => { currentPage++; loadNews(currentPage, currentCategory, currentLang); document.getElementById('page-num').innerText = `PAGE ${currentPage}`; };
document.getElementById('prev-btn').onclick = () => { if (currentPage > 1) { currentPage--; loadNews(currentPage, currentCategory, currentLang); document.getElementById('page-num').innerText = `PAGE ${currentPage}`; } };

// Lang Buttons
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('bg-red-700', 'text-white'));
        e.target.classList.add('bg-red-700', 'text-white');
        currentLang = e.target.dataset.lang;
        currentPage = 1;
        updateUIStrings();
        loadNews(1, currentCategory, currentLang);
    };
});

// Init
document.getElementById('current-date').innerText = new Date().toDateString();
updateUIStrings();
loadNews(1, 'general', 'en');
