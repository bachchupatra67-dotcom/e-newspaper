// Configuration - Replace with your actual keys
const CONFIG = {
    gnews: {
        key: ' 8d2a825a10e2836e5c8a26affa038680 ',
        // GNews uses &page=1, 2, 3...
        getUrl: (page) => `https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=in&max=10&page=${page}&apikey=YOUR_GNEWS_API_KEY`
    },
    newsdata: {
        key: 'pub_9410f56733d649d0bd05e1204efae7ee',
        // NewsData.io uses a string token for pages, but we can approximate with offset or simple page params
        getUrl: (page) => `https://newsdata.io/api/1/news?apikey=YOUR_NEWSDATA_API_KEY&country=in&language=en&page=${page}`
    }
};

let currentPage = 1;

/**
 * Main function to fetch news with fallback logic
 */
async function loadNews(page = 1) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = `<div class="col-span-full text-center py-20 text-stone-400 animate-pulse italic text-xl">
                        Updating the Gazette for Page ${page}...
                      </div>`;

    let success = false;

    // 1. Try GNews first
    try {
        const response = await fetch(CONFIG.gnews.getUrl(page));
        if (!response.ok) throw new Error('GNews Limit Reached');
        const data = await response.json();
        if (data.articles && data.articles.length > 0) {
            renderNews(data.articles);
            success = true;
        }
    } catch (err) {
        console.warn("GNews failed, trying NewsData.io...");
    }

    // 2. Fallback to NewsData if GNews fails
    if (!success) {
        try {
            const response = await fetch(CONFIG.newsdata.getUrl(page));
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                renderNews(data.results);
                success = true;
            }
        } catch (err) {
            grid.innerHTML = `<div class="col-span-full text-center py-20 text-red-600 font-bold">
                                Error: Unable to reach news servers. Please check API keys.
                              </div>`;
        }
    }

    if (success) {
        updatePaginationUI(page);
    }
}

/**
 * Renders articles into the HTML grid
 */
function renderNews(articles) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '';

    articles.forEach((article, index) => {
        // Universal mapping (handles different API field names)
        const title = article.title;
        const url = article.url || article.link;
        const img = article.image || article.image_url || 'https://images.unsplash.com/photo-1504711432869-efd597cdd047?q=80&w=1000';
        const desc = article.description || 'View full coverage on the original source.';
        const source = (article.source && article.source.name) || article.source_id || 'News Desk';

        const isHero = index === 0;

        grid.innerHTML += `
            <article class="${isHero ? 'md:col-span-2 border-b-2 md:border-b-0 md:border-r border-stone-300 pr-0 md:pr-8 mb-6' : 'border-b border-stone-200 pb-6'} group cursor-pointer">
                <div class="overflow-hidden mb-4">
                    <img src="${img}" 
                         alt="News" 
                         class="w-full h-72 object-cover transform transition-transform duration-500 group-hover:scale-105"
                         onerror="this.src='https://via.placeholder.com/600x400?text=Latest+Newspaper'">
                </div>
                <h2 class="${isHero ? 'text-4xl' : 'text-xl'} font-bold mb-3 leading-tight group-hover:text-red-900 transition-colors">
                    <a href="${url}" target="_blank">${title}</a>
                </h2>
                <p class="text-stone-600 mb-4 line-clamp-3 leading-relaxed">${desc}</p>
                <div class="flex justify-between items-center text-xs font-black uppercase tracking-widest text-stone-400">
                    <span>Source: ${source}</span>
                    <span class="text-red-700">Read More →</span>
                </div>
            </article>
        `;
    });

    // Auto-scroll to top so user sees the new page
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Updates the Page Number and Button states
 */
function updatePaginationUI(page) {
    document.getElementById('page-num').innerText = `PAGE ${page}`;
    const prevBtn = document.getElementById('prev-btn');
    prevBtn.disabled = (page === 1);
    prevBtn.style.opacity = (page === 1) ? "0.3" : "1";
}

// Event Listeners for Pagination
document.getElementById('next-btn').addEventListener('click', () => {
    currentPage++;
    loadNews(currentPage);
});

document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadNews(currentPage);
    }
});

// Set Date and Initial Load
document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

loadNews(currentPage);