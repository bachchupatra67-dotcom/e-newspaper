// Configuration
const CONFIG = {
    gnews: {
        key: '8d2a825a10e2836e5c8a26affa038680',
        url: (key) => `https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=in&max=10&apikey=${key}`
    },
    newsdata: {
        key: 'pub_9410f56733d649d0bd05e1204efae7ee',
        url: (key) => `https://newsdata.io/api/1/news?apikey=${key}&country=in&language=en`
    }
};

async function fetchWithFallback() {
    const grid = document.getElementById('news-grid');
    
    // 1. Try GNews First
    console.log("Attempting GNews...");
    try {
        const response = await fetch(CONFIG.gnews.url(CONFIG.gnews.key));
        if (!response.ok) throw new Error('GNews Failed');
        const data = await response.json();
        renderNews(data.articles, 'gnews');
        return; 
    } catch (e) {
        console.warn("GNews failed, switching to NewsData.io...");
    }

    // 2. Fallback to NewsData.io
    try {
        const response = await fetch(CONFIG.newsdata.url(CONFIG.newsdata.key));
        if (!response.ok) throw new Error('NewsData Failed');
        const data = await response.json();
        // NewsData uses 'results' instead of 'articles'
        renderNews(data.results, 'newsdata');
    } catch (e) {
        grid.innerHTML = `<div class="col-span-full text-center py-10">
            <p class="text-red-600 font-bold">All news sources are currently unavailable.</p>
            <p class="text-sm text-stone-500">Please check your API keys or daily limits.</p>
        </div>`;
    }
}

function renderNews(articles, source) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = '';

    articles.forEach((article, index) => {
        // Handle different field names between APIs
        const title = article.title;
        const link = article.url || article.link;
        const img = article.image || article.image_url || 'https://via.placeholder.com/600x400?text=Latest+News';
        const desc = article.description || 'Click to read the full story on the original site.';
        const siteName = (article.source && article.source.name) || article.source_id || 'Top News';

        const isHero = index === 0;
        grid.innerHTML += `
            <div class="${isHero ? 'md:col-span-2 border-b-2 md:border-b-0 md:border-r border-stone-300 pr-0 md:pr-8 mb-6' : 'border-b border-stone-200 pb-6'}">
                <img src="${img}" class="w-full h-64 object-cover mb-4 filter grayscale hover:grayscale-0 transition duration-500" onerror="this.src='https://via.placeholder.com/600x400?text=News+Image'">
                <h2 class="${isHero ? 'text-4xl' : 'text-xl'} font-bold mb-2 leading-tight">
                    <a href="${link}" target="_blank" class="hover:underline">${title}</a>
                </h2>
                <p class="text-stone-600 mb-4 line-clamp-3">${desc}</p>
                <div class="text-xs font-bold uppercase text-stone-400">Source: ${siteName}</div>
            </div>
        `;
    });
}

// Initialize
document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});
fetchWithFallback();