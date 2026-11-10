const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateLabel=value=>{const d=new Date(value);return value&&!Number.isNaN(d.getTime())?new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"long",year:"numeric"}).format(d):"Recent"};
async function showArticle(){
 const root=document.getElementById("article");document.getElementById("year").textContent=new Date().getFullYear();
 const id=new URLSearchParams(location.search).get("id");
 if(!id){root.innerHTML='<div class="article-error"><h1>Report not found</h1><p>Choose a story from the Latest Newspaper homepage.</p></div>';return}
 try{
  const response=await fetch("./data/news.json?updated="+Date.now(),{cache:"no-store"});if(!response.ok)throw new Error("feed");
  const data=await response.json();const item=(data.articles||[]).find(x=>String(x.id)===id);
  if(!item){root.innerHTML='<div class="article-error"><h1>Report not found</h1><p>This story may have been removed from the current edition.</p></div>';return}
  const paragraphs=Array.isArray(item.body)?item.body:(item.body?String(item.body).split(/\n\n+/):[]);
  const content=paragraphs.length?paragraphs.map(p=>'<p>'+esc(p)+'</p>').join(""):'<p>'+esc(item.summary||"A detailed independent report is being prepared for this story.")+'</p><p>This report is based on the information currently published in this edition. Readers should check the named issuing authority for any subsequent correction or update.</p>';
  root.innerHTML='<div class="article-meta"><span class="tag">'+esc(item.category||"Education")+'</span><time class="date">'+esc(dateLabel(item.published))+'</time></div><h1>'+esc(item.title)+'</h1><p class="article-summary">'+esc(item.summary||"A concise update from the education desk.")+'</p><div class="article-body">'+content+'</div><div class="article-source">Source attribution: '+esc(item.source||"Source not specified")+' · Independently written by Latest Newspaper. This page keeps the reader within Latest Newspaper; no external article redirect is provided.</div>';
  document.title=item.title+" | Latest Newspaper";
 }catch(e){root.innerHTML='<div class="article-error"><h1>Report unavailable</h1><p>Please return to the homepage and try again.</p></div>'}
}
showArticle();