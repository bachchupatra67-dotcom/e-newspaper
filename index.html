document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

const API_KEY = 'YOUR_API_KEY_HERE'; // Get this from gnews.io
const URL = `https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=in&max=10&apikey=${API_KEY}`;

async function fetchNews() {
    try {
        const response = await fetch(URL);
        const data = await response.json();
        const articles = data.articles;
        
        const grid = document.getElementById('news-grid');
        grid.innerHTML = ''; // Clear loading state

        articles.forEach((article, index) => {
            const isHero = index === 0;
            const card = `
                <div class="${isHero ? 'md:col-span-2 border-b-2 md:border-b-0 md:border-r border-stone-300 pr-0 md:pr-8' : 'border-b border-stone-200 pb-6'}">
                    <img src="${article.image}" class="w-full h-64 object-cover mb-4 filter grayscale hover:grayscale-0 transition duration-500" alt="News Image">
                    <h2 class="${isHero ? 'text-4xl' : 'text-xl'} font-bold mb-2 leading-tight">
                        <a href="${article.url}" target="_blank" class="hover:underline">${article.title}</a>
                    </h2>
                    <p class="text-stone-600 mb-4">${article.description}</p>
                    <div class="text-xs font-bold uppercase text-stone-400">Source: ${article.source.name}</div>
                </div>
            `;
            grid.innerHTML += card;
        });
    } catch (error) {
        console.error("Error fetching news:", error);
        document.getElementById('news-grid').innerHTML = "<p>Failed to load news. Check your API key.</p>";
    }
}

fetchNews();