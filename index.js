export default function Newspaper() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-8 font-serif">
      <header className="border-b-4 border-double border-stone-800 pb-4 mb-8 text-center">
        <h1 className="text-6xl font-black uppercase tracking-tighter">The Digital Gazette</h1>
        <div className="flex justify-between mt-4 text-sm font-sans font-bold border-t border-stone-300 pt-2">
          <span>Vol. I — No. 001</span>
          <span>{new Date().toLocaleDateString()}</span>
          <span>Price: Free</span>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <section className="md:col-span-3 border-r border-stone-300 pr-8">
          <article>
            <h2 className="text-4xl font-bold leading-tight mb-4">The Future of AI: A New Era Begins</h2>
            <p className="text-lg leading-relaxed mb-4">
              Today marks a turning point in digital journalism...
            </p>
            <div className="h-64 bg-stone-200 mb-4 flex items-center justify-center italic text-stone-500">
              [Primary News Image]
            </div>
          </article>
        </section>

        <aside className="space-y-6">
          <h3 className="font-sans font-black border-b-2 border-stone-800 uppercase italic">Trending</h3>
          <div className="text-sm">
            <h4 className="font-bold underline">Tech: New Updates for Vercel</h4>
            <p>Deployment speeds reach record highs...</p>
          </div>
        </aside>
      </main>
    </div>
  );
}