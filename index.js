const CONFIG = {
    gnews: {
        key: '8d2a825a10e2836e5c8a26affa038680',
        getUrl: (page, cat, query) => {
            let baseUrl = `https://gnews.io/api/v4/top-headlines?lang=en&country=in&max=10&page=${page}&apikey=8d2a825a10e2836e5c8a26affa038680`;
            if (query) return `https://gnews.io/api/v4/search?q=${query}&lang=en&country=in&max=10&page=${page}&apikey=8d2a825a10e2836e5c8a26affa038680`;
            return `${baseUrl}&category=${cat}`;
        }
    },
    newsdata: {
        key: 'pub_9410f56733d649d0bd05e1204efae7ee',
        getUrl: (token, cat, query) => {
            let url = `https://newsdata.io/api/1/news?apikey=pub_9410f56733d649d0bd05e1204efae7ee&country=in&language=en`;
            if (query) url += `&q=${query}`;
            else url += `&category=${cat === 'nation' ? 'top' : cat}`;
            if (token && token !== 1) url += `&page=${token}`;
            return url;
        }
    }
};

let currentPage = 1;
let currentCategory = 'general';
let currentQuery = ''; 
let nextDataToken = null;

async function loadNews(page = 1, category = 'general', query = '') {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = `<div class="col-span-full text-center py-20 text-stone-400 animate-pulse italic text-xl">Searching the archives for ${query || category}...</div>`;

    let success = false;

    // 1. GNews
    try {
        const response = await fetch(CONFIG.gnews.getUrl(page, category, query));
        const data = await response.json();
        if (response.ok && data.articles?.length > 0) {
            renderNews(data.articles);
            success = true;
        }
    } catch (err) { console.warn("GNews Fail"); }

    // 2. NewsData Fallback
    if (!success) {
        try {
            const token = (page === 1) ? null : nextDataToken;
            const response = await fetch(CONFIG.newsdata.getUrl(token, category, query));
            const data = await response.json();
            if (data.status === "success" && data.results?.length > 0) {
                nextDataToken = data.nextPage;
                renderNews(data.results);
                success = true;
            }
        } catch (err) { console.error("All Sources Failed"); }
    }

    if (!success) {
        grid.innerHTML = `<div class="col-span-full text-center py-20 border-2 border-stone-300 font-bold text-red-800">EDITION DELAYED: Daily Limit Reached.</div>`;
    }
    updatePaginationUI(page);
}

function renderNews(articles) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '';
    
    // Update Ticker with slower text
    const ticker = document.getElementById('breaking-ticker');
    const headlines = articles.map(a => a.title).join(' • ');
    ticker.innerText = `${headlines} • ${headlines}`;

    articles.forEach((article, index) => {
        const isHero = index === 0;
        const title = article.title || "Untitled Report";
        const url = article.url || article.link;
        const img = article.image || article.image_url || 'https://images.unsplash.com/photo-1504711432869-efd597cdd047?w=800';
        const source = article.source?.name || article.source_id || 'News Desk';

        grid.innerHTML += `
            <article class="${isHero ? 'md:col-span-2 border-b-2 md:border-b-0 md:border-r border-stone-300 pr-0 md:pr-4 mb-6 pb-6' : 'border-b border-stone-200 pb-6'} group">
                <div class="overflow-hidden mb-4 bg-stone-200">
                    <img src="${img}" class="w-full ${isHero ? 'h-80' : 'h-48'} object-cover transition duration-700 group-hover:scale-105" 
                         onerror="this.src='https://via.placeholder.com/800x500?text=Gazette+News'">
                </div>
                <h2 class="${isHero ? 'text-3xl' : 'text-lg'} font-bold mb-2 leading-tight group-hover:text-red-900 transition-colors">
                    <a href="${url}" target="_blank">${title}</a>
                </h2>
                <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">
                    <span>${source}</span>
                    <span class="text-red-700">Read More →</span>
                </div>
            </article>`;
    });
}

function updatePaginationUI(page) {
    document.getElementById('page-num').innerText = `PAGE ${page}`;
    document.getElementById('prev-btn').disabled = (page === 1);
}

// Category Listeners
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelectorAll('.category-btn, .state-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        currentQuery = ''; 
        currentPage = 1;
        loadNews(currentPage, currentCategory, '');
    };
});

// State Listeners (Searches for state name)
document.querySelectorAll('.state-btn').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelectorAll('.category-btn, .state-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentQuery = e.target.dataset.state;
        currentPage = 1;
        loadNews(currentPage, '', currentQuery);
    };
});

document.getElementById('next-btn').onclick = () => { currentPage++; loadNews(currentPage, currentCategory, currentQuery); };
document.getElementById('prev-btn').onclick = () => { if (currentPage > 1) { currentPage--; loadNews(currentPage, currentCategory, currentQuery); } };

document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});
loadNews(currentPage, currentCategory, '');