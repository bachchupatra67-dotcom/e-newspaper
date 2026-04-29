const CONFIG = {
    gnews: {
        key: '8d2a825a10e2836e5c8a26affa038680',
        getUrl: (page, cat, lang) => `https://gnews.io/api/v4/top-headlines?category=${cat}&lang=${lang}&country=in&max=10&page=${page}&apikey=8d2a825a10e2836e5c8a26affa038680`
    },
    newsdata: {
        key: 'pub_9410f56733d649d0bd05e1204efae7ee',
        getUrl: (token, cat, lang) => {
            let url = `https://newsdata.io/api/1/news?apikey=pub_9410f56733d649d0bd05e1204efae7ee&country=in&language=${lang}&category=${cat === 'nation' ? 'top' : cat}`;
            if (token && token !== 1) url += `&page=${token}`;
            return url;
        }
    }
};

const UI_TEXT = {
    en: { title: "THE GAZETTE", edition: "National Edition", nav: ["general", "world", "nation", "sports", "technology"] },
    hi: { title: "द गज़ेट", edition: "राष्ट्रीय संस्करण", nav: ["general", "world", "nation", "sports", "technology"], labels: { general: "मुख्य समाचार", world: "विश्व", nation: "देश", sports: "खेल", technology: "तकनीक" } },
    bn: { title: "দ্য গেজেট", edition: "জাতীয় সংস্করণ", nav: ["general", "world", "nation", "sports", "technology"], labels: { general: "মূল খবর", world: "আন্তর্জাতিক", nation: "দেশ", sports: "খেলাধুলা", technology: "প্রযুক্তি" } }
};

let currentLang = 'en';
let currentPage = 1;
let currentCategory = 'general';
let nextDataToken = null;

async function loadNews(page = 1, category = 'general', lang = 'en') {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = `<div class="col-span-full text-center py-20 text-stone-400 italic text-xl">Loading...</div>`;

    let success = false;

    // 1. GNews
    try {
        const response = await fetch(CONFIG.gnews.getUrl(page, category, lang));
        const data = await response.json();
        if (response.ok && data.articles?.length > 0) {
            renderNews(data.articles);
            success = true;
        }
    } catch (err) { console.warn("Source 1 offline"); }

    // 2. NewsData Fallback
    if (!success) {
        try {
            const token = (page === 1) ? null : nextDataToken;
            const response = await fetch(CONFIG.newsdata.getUrl(token, category, lang));
            const data = await response.json();
            if (data.results?.length > 0) {
                nextDataToken = data.nextPage;
                renderNews(data.results);
                success = true;
            }
        } catch (err) { console.error("All Sources Failed"); }
    }

    if (!success) grid.innerHTML = `<div class="col-span-full text-center py-20 font-bold text-red-800">API Limit Reached for today.</div>`;
    updatePaginationUI(page);
}

function renderNews(articles) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '';
    
    // Update Ticker
    const ticker = document.getElementById('breaking-ticker');
    ticker.innerText = articles.map(a => a.title).join(' • ');

    articles.forEach((article, index) => {
        const isHero = index === 0;
        const img = article.image || article.image_url || 'https://via.placeholder.com/800x500?text=News';
        grid.innerHTML += `
            <article class="${isHero ? 'md:col-span-2 border-b-2 md:border-r border-stone-300 pr-4 mb-6 pb-6' : 'border-b border-stone-200 pb-6'}">
                <img src="${img}" class="w-full ${isHero ? 'h-96' : 'h-48'} object-cover mb-4">
                <h2 class="${isHero ? 'text-3xl' : 'text-lg'} font-bold mb-2">
                    <a href="${article.url || article.link}" target="_blank">${article.title}</a>
                </h2>
                <p class="text-stone-600 line-clamp-3 text-sm">${article.description || ''}</p>
            </article>`;
    });
}

function updateUIStrings() {
    const ui = UI_TEXT[currentLang];
    document.getElementById('main-title').innerText = ui.title;
    document.getElementById('edition-label').innerText = ui.edition;
    document.body.className = `text-stone-900 lang-${currentLang}`;

    // Update Navigation Labels
    const nav = document.getElementById('nav-bar');
    nav.innerHTML = ui.nav.map(cat => {
        const label = ui.labels ? ui.labels[cat] : cat.toUpperCase();
        return `<button class="category-btn ${cat === currentCategory ? 'active' : ''}" data-category="${cat}">${label}</button>`;
    }).join('');

    // Re-attach listeners to new nav buttons
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

// Language Switcher Listeners
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentLang = e.target.dataset.lang;
        currentPage = 1;
        updateUIStrings();
        loadNews(currentPage, currentCategory, currentLang);
    };
});

document.getElementById('next-btn').onclick = () => { currentPage++; loadNews(currentPage, currentCategory, currentLang); };
document.getElementById('prev-btn').onclick = () => { if (currentPage > 1) { currentPage--; loadNews(currentPage, currentCategory, currentLang); } };

// Initialize
updateUIStrings();
document.getElementById('current-date').innerText = new Date().toLocaleDateString();
loadNews(currentPage, currentCategory, currentLang);