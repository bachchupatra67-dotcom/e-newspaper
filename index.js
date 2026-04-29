const CONFIG = {
    gnews: {
        key: '8d2a825a10e2836e5c8a26affa038680',
        getUrl: (page, category) => `https://gnews.io/api/v4/top-headlines?category=${category}&lang=en&country=in&max=10&page=${page}&apikey=8d2a825a10e2836e5c8a26affa038680`
    },
    newsdata: {
        key: 'pub_9410f56733d649d0bd05e1204efae7ee',
        getUrl: (token, category) => {
            // Mapping GNews categories to NewsData categories if they differ
            const cat = category === 'nation' ? 'top' : category;
            let url = `https://newsdata.io/api/1/news?apikey=pub_9410f56733d649d0bd05e1204efae7ee&country=in&language=en&category=${cat}`;
            if (token && token !== 1) url += `&page=${token}`;
            return url;
        }
    }
};

let currentPage = 1;
let currentCategory = 'general';
let nextDataToken = null;

async function loadNews(page = 1, category = 'general') {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = `<div class="col-span-full text-center py-20 text-stone-400 animate-pulse italic text-xl">Updating the ${category} section...</div>`;

    let success = false;

    // 1. Try GNews
    try {
        const response = await fetch(CONFIG.gnews.getUrl(page, category));
        const data = await response.json();
        if (response.ok && data.articles?.length > 0) {
            renderNews(data.articles);
            success = true;
        }
    } catch (err) { console.warn("GNews fail, checking fallback..."); }

    // 2. Fallback to NewsData
    if (!success) {
        try {
            const token = (page === 1) ? null : nextDataToken;
            const response = await fetch(CONFIG.newsdata.getUrl(token, category));
            const data = await response.json();
            if (data.status === "success" && data.results?.length > 0) {
                nextDataToken = data.nextPage;
                renderNews(data.results);
                success = true;
            }
        } catch (err) {
            grid.innerHTML = `<div class="col-span-full text-center py-20 text-red-600 font-bold text-xl">System Error: News Desk Unreachable.</div>`;
        }
    }

    if (success) updatePaginationUI(page);
}

function updateTicker(articles) {
    const ticker = document.getElementById('breaking-ticker');
    const headlines = articles.map(a => a.title).join(' • ');
    ticker.innerText = `${headlines} • ${headlines}`;
}

function renderNews(articles) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '';
    updateTicker(articles);

    articles.forEach((article, index) => {
        const title = article.title || "Latest Report";
        const url = article.url || article.link;
        const img = article.image || article.image_url || 'https://images.unsplash.com/photo-1504711432869-efd597cdd047?w=800';
        const desc = article.description || 'Full coverage is available via the link below.';
        const source = article.source?.name || article.source_id || 'News Desk';
        const isHero = index === 0;

        grid.innerHTML += `
            <article class="${isHero ? 'md:col-span-2 border-b-2 md:border-b-0 md:border-r border-stone-300 pr-0 md:pr-8 mb-6 pb-6' : 'border-b border-stone-200 pb-6'} group cursor-pointer">
                <div class="overflow-hidden mb-4 bg-stone-100">
                    <img src="${img}" class="w-full ${isHero ? 'h-96' : 'h-52'} object-cover transition duration-500 group-hover:scale-105" 
                         onerror="this.src='https://via.placeholder.com/800x500?text=Gazette+News'">
                </div>
                <h2 class="${isHero ? 'text-4xl' : 'text-xl'} font-bold mb-3 leading-tight group-hover:text-red-800">
                    <a href="${url}" target="_blank">${title}</a>
                </h2>
                <p class="text-stone-600 mb-4 line-clamp-3">${desc}</p>
                <div class="flex justify-between items-center text-xs font-black uppercase tracking-widest text-stone-400">
                    <span>${source}</span>
                    <span class="text-red-700">Read More →</span>
                </div>
            </article>`;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updatePaginationUI(page) {
    document.getElementById('page-num').innerText = `PAGE ${page}`;
    document.getElementById('prev-btn').disabled = (page === 1);
}

// Category Click Events
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        currentPage = 1; // Reset to page 1 for new category
        loadNews(currentPage, currentCategory);
    });
});

document.getElementById('next-btn').onclick = () => { currentPage++; loadNews(currentPage, currentCategory); };
document.getElementById('prev-btn').onclick = () => { if(currentPage > 1) { currentPage--; loadNews(currentPage, currentCategory); } };

// Initialize
document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});
loadNews(currentPage, currentCategory);