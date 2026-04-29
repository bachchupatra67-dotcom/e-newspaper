// 1. API REGISTRY - The Waterfall Engine
const API_SOURCES = [
    {
        name: 'GNews',
        fetch: async (p, c, l) => {
            const key = '8d2a825a10e2836e5c8a26affa038680'; // <--- PASTE GNEWS.IO KEY HERE
            const res = await fetch(`https://gnews.io/api/v4/top-headlines?category=${c}&lang=${l}&country=in&max=10&page=${p}&apikey=${key}`);
            const data = await res.json();
            if (!res.ok) throw new Error('Limit Reached');
            return data.articles.map(a => ({ 
                title: a.title, 
                desc: a.description, 
                img: a.image, 
                link: a.url, 
                source: a.source.name 
            }));
        }
    },
    {
        name: 'NewsData',
        fetch: async (p, c, l) => {
            const key = 'pub_9410f56733d649d0bd05e1204efae7ee'; // <--- PASTE NEWSDATA.IO KEY HERE
            const cat = c === 'general' ? 'top' : (c === 'nation' ? 'politics' : (c === 'states' ? 'business,politics' : c));
            const res = await fetch(`https://newsdata.io/api/1/news?apikey=${key}&country=in&language=${l}&category=${cat}`);
            const data = await res.json();
            if (data.status === "error") throw new Error('Limit Reached');
            return data.results.map(a => ({ 
                title: a.title, 
                desc: a.description, 
                img: a.image_url, 
                link: a.link, 
                source: a.source_id 
            }));
        }
    },
    {
        name: 'CurrentsAPI',
        fetch: async (p, c, l) => {
            const key = 'ZSiD8EbjAqlidDAA0wxOu3Dn2i5C9wRazO7i-Xave-kk4s-g'; // <--- PASTE CURRENTAPI.SERVICES KEY HERE
            const res = await fetch(`https://api.currentsapi.services/v1/latest-news?language=${l}&category=${c}&apiKey=${key}`);
            const data = await res.json();
            if (data.status !== "ok") throw new Error('Limit Reached');
            return data.news.map(a => ({ 
                title: a.title, 
                desc: a.description, 
                img: a.image, 
                link: a.url, 
                source: a.author 
            }));
        }
    }
    // You can copy/paste the blocks above to add 7 more sources.
];

// 2. UI CONFIGURATION
const UI_TEXT = {
    en: { title: "THE GAZETTE", edition: "National Edition", nav: ["general", "world", "nation", "states", "sports", "technology"] },
    hi: { title: "द गज़ेट", edition: "राष्ट्रीय संस्करण", nav: ["general", "world", "nation", "states", "sports", "technology"], labels: { general: "मुख्य समाचार", world: "विश्व", nation: "देश", states: "राज्य", sports: "खेल", technology: "तकनीक" } },
    bn: { title: "দ্য গেজেট", edition: "জাতীয় সংস্করণ", nav: ["general", "world", "nation", "states", "sports", "technology"], labels: { general: "মূল খবর", world: "আন্তর্জাতিক", nation: "দেশ", states: "রাজ্য", sports: "খেলাধুলা", technology: "প্রযুক্তি" } }
};

let currentLang = 'en';
let currentPage = 1;
let currentCategory = 'general';

// 3. CORE LOGIC
async function loadNews(page = 1, category = 'general', lang = 'en') {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = `<div class="col-span-full text-center py-20 text-stone-400 italic text-xl font-serif">Scanning Global Sources...</div>`;
    
    let newsArticles = null;

    // The Waterfall: Tries each API until one works
    for (let source of API_SOURCES) {
        try {
            const results = await source.fetch(page, category, lang);
            if (results && results.length > 0) {
                newsArticles = results;
                console.log(`Loaded via: ${source.name}`);
                break; 
            }
        } catch (err) {
            console.warn(`${source.name} limit reached or error. Switching...`);
            continue; 
        }
    }

    if (newsArticles) {
        renderNews(newsArticles);
    } else {
        grid.innerHTML = `<div class="col-span-full text-center py-20 font-bold text-red-800 border-2 border-dashed border-red-200">
            <h3 class="text-2xl uppercase">All API Limits Reached</h3>
            <p class="font-normal text-stone-500 mt-2 italic">Please check back later or update your API keys.</p>
        </div>`;
    }
    updatePaginationUI(page);
}

function renderNews(articles) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '';
    
    document.getElementById('breaking-ticker').innerText = articles.map(a => a.title).join(' • ');

    articles.forEach((article, index) => {
        const isHero = index === 0;
        const img = article.img || 'https://via.placeholder.com/800x500?text=Press+Report';
        grid.innerHTML += `
            <article class="${isHero ? 'md:col-span-2 border-b-2 md:border-r border-stone-300 md:pr-8 mb-6 pb-6' : 'border-b border-stone-200 pb-6'}">
                <img src="${img}" class="w-full ${isHero ? 'h-96' : 'h-48'} object-cover mb-4 hover:opacity-90 transition">
                <h2 class="${isHero ? 'text-4xl' : 'text-xl'} font-bold mb-3 leading-tight">
                    <a href="${article.link}" target="_blank" class="hover:text-red-800 transition">${article.title}</a>
                </h2>
                <p class="text-stone-600 line-clamp-3 text-sm mb-4">${article.desc || 'No further description available.'}</p>
                <div class="flex justify-between items-center text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    <span>Source: ${article.source}</span>
                    <span class="text-red-700">Live Update</span>
                </div>
            </article>`;
    });
}

function updateUIStrings() {
    const ui = UI_TEXT[currentLang];
    document.getElementById('main-title').innerText = ui.title;
    document.getElementById('edition-label').innerText = ui.edition;
    document.body.className = `text-stone-900 lang-${currentLang}`;

    const nav = document.getElementById('nav-bar');
    nav.innerHTML = ui.nav.map(cat => {
        const label = ui.labels ? ui.labels[cat] : cat.toUpperCase();
        return `<button class="category-btn ${cat === currentCategory ? 'active border-b-2 border-red-700 text-red-700' : ''}" data-category="${cat}">${label}</button>`;
    }).join('');

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.onclick = (e) => {
            currentCategory = e.target.dataset.category;
            currentPage = 1;
            loadNews(currentPage, currentCategory, currentLang);
            updateUIStrings();
        };
    });
}

function updatePaginationUI(page) {
    document.getElementById('page-num').innerText = `PAGE ${page}`;
    document.getElementById('prev-btn').disabled = (page === 1);
}

// 4. EVENT LISTENERS
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active', 'bg-red-700', 'text-white'));
        e.target.classList.add('active', 'bg-red-700', 'text-white');
        currentLang = e.target.dataset.lang;
        currentPage = 1;
        updateUIStrings();
        loadNews(currentPage, currentCategory, currentLang);
    };
});

document.getElementById('next-btn').onclick = () => { currentPage++; loadNews(currentPage, currentCategory, currentLang); };
document.getElementById('prev-btn').onclick = () => { if (currentPage > 1) { currentPage--; loadNews(currentPage, currentCategory, currentLang); } };

// Initialize
document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
updateUIStrings();
loadNews(currentPage, currentCategory, currentLang);
