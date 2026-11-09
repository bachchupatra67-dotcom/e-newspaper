const state={all:[],category:"All",query:""};
const $=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateLabel=value=>{if(!value)return"Recent";const d=new Date(value);return Number.isNaN(d.getTime())?"Recent":new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short",year:"numeric"}).format(d)};
function safeUrl(value){try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)?u.href:"#"}catch{return"#"}}
function render(){
 const q=state.query.trim().toLowerCase();
 const filtered=state.all.filter(item=>(state.category==="All"||item.category===state.category)&&(!q||[item.title,item.summary,item.source,item.category].join(" ").toLowerCase().includes(q)));
 $("newsGrid").innerHTML=filtered.map((item,i)=>`<article class="news-card ${i===0&&state.category==="All"&&!q?"featured":""}"><div class="card-meta"><span class="tag">${esc(item.category||"News")}</span><time class="date">${esc(dateLabel(item.published))}</time></div><h3>${esc(item.title)}</h3>${item.summary?`<p class="summary">${esc(item.summary)}</p>`:""}<div class="card-bottom"><span class="source">${esc(item.source||"Source")}</span><a class="read-link" href="${esc(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer">Read at source ↗</a></div></article>`).join("");
 $("storyCount").textContent=`${filtered.length} ${filtered.length===1?"story":"stories"}`;
 $("emptyState").hidden=filtered.length!==0;
 $("newsGrid").hidden=filtered.length===0;
 $("sectionTitle").textContent=state.category==="All"?"Top Stories":state.category;
}
async function loadNews(){
 $("status").textContent="Checking the latest published edition…";
 try{
  const response=await fetch("./data/news.json?updated="+Date.now(),{cache:"no-store"});
  if(!response.ok)throw new Error("News feed is not available yet.");
  const data=await response.json();
  state.all=Array.isArray(data.articles)?data.articles:[];
  const updated=data.updated_at?new Date(data.updated_at):null;
  $("status").textContent=state.all.length?`Edition updated ${updated&&!Number.isNaN(updated.getTime())?updated.toLocaleString("en-IN"):"recently"}. Stories link to their original sources.`:"The first automated edition is being prepared. Check back after the scheduled feed collection.";
  render();
 }catch(error){$("status").textContent="The news feed could not be loaded. Please try again shortly.";state.all=[];render()}
}
$("categoryNav").addEventListener("click",event=>{const button=event.target.closest("[data-category]");if(!button)return;state.category=button.dataset.category;document.querySelectorAll(".nav-link").forEach(el=>el.classList.toggle("active",el===button));render()});
$("searchInput").addEventListener("input",event=>{state.query=event.target.value;render()});
$("refreshBtn").addEventListener("click",loadNews);
const now=new Date();$("today").textContent=new Intl.DateTimeFormat("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(now);$("editionDate").textContent="Edition · "+new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"long",year:"numeric"}).format(now);$("year").textContent=now.getFullYear();
loadNews();