const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateLabel=value=>{const d=new Date(value);return value&&!Number.isNaN(d.getTime())?new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"long",year:"numeric"}).format(d):"Recent"};
let activeUtterance=null;
let readingText="";
function stopReading(){
 if("speechSynthesis" in window)window.speechSynthesis.cancel();
 activeUtterance=null;
 const status=document.getElementById("listenStatus");
 const button=document.getElementById("listenBtn");
 if(status)status.textContent="Reading stopped.";
 if(button)button.textContent="▶ Read aloud";
}
function startReading(){
 if(!("speechSynthesis" in window)){document.getElementById("listenStatus").textContent="Read aloud is not supported in this browser. Try your device's accessibility reader.";return}
 if(window.speechSynthesis.paused){window.speechSynthesis.resume();document.getElementById("listenBtn").textContent="Ⅱ Pause";document.getElementById("listenStatus").textContent="Reading…";return}
 if(window.speechSynthesis.speaking){window.speechSynthesis.pause();document.getElementById("listenBtn").textContent="▶ Resume";document.getElementById("listenStatus").textContent="Reading paused.";return}
 window.speechSynthesis.cancel();
 activeUtterance=new SpeechSynthesisUtterance(readingText);
 activeUtterance.lang="en-IN";
 activeUtterance.rate=0.95;
 activeUtterance.onstart=()=>{document.getElementById("listenBtn").textContent="Ⅱ Pause";document.getElementById("listenStatus").textContent="Reading article aloud…"};
 activeUtterance.onend=()=>{document.getElementById("listenBtn").textContent="▶ Read aloud";document.getElementById("listenStatus").textContent="Finished reading.";activeUtterance=null};
 activeUtterance.onerror=()=>{document.getElementById("listenBtn").textContent="▶ Read aloud";document.getElementById("listenStatus").textContent="Audio playback could not start on this device.";activeUtterance=null};
 window.speechSynthesis.speak(activeUtterance);
}
async function showArticle(){
 const root=document.getElementById("article");document.getElementById("year").textContent=new Date().getFullYear();
 const id=new URLSearchParams(location.search).get("id");
 if(!id){root.innerHTML='<div class="article-error"><h1>Report not found</h1><p>Choose a story from the Latest Newspaper homepage.</p></div>';return}
 try{
  const response=await fetch("./data/news.json?updated="+Date.now(),{cache:"no-store"});if(!response.ok)throw new Error("feed");
  const data=await response.json();const item=(data.articles||[]).find(x=>String(x.id)===id);
  if(!item){root.innerHTML='<div class="article-error"><h1>Report not found</h1><p>This story may have been removed from the current edition.</p></div>';return}
  const paragraphs=Array.isArray(item.body)?item.body:(item.body?String(item.body).split(/\n\n+/):[]);
  const safeParagraphs=paragraphs.length?paragraphs:[item.summary||"A detailed independent report is being prepared for this story."];
  const content=safeParagraphs.map(p=>'<p>'+esc(p)+'</p>').join("");
  readingText=[item.title,item.summary,...safeParagraphs].filter(Boolean).join(". ");
  root.innerHTML='<div class="article-meta"><span class="tag">'+esc(item.category||"Education")+'</span><time class="date">'+esc(dateLabel(item.published))+'</time></div><h1>'+esc(item.title)+'</h1><p class="article-summary">'+esc(item.summary||"A concise update from the education desk.")+'</p><div class="listen-tools"><button id="listenBtn" class="listen-btn" type="button">▶ Read aloud</button><button id="stopBtn" class="stop-btn" type="button">■ Stop</button><span id="listenStatus" class="listen-status" role="status" aria-live="polite">Listen to this report using your device\'s speech voice.</span></div><div class="article-body">'+content+'</div><div class="article-source">Source attribution: '+esc(item.source||"Source not specified")+' · Independently written by Latest Newspaper. This page keeps the reader within Latest Newspaper; no external article redirect is provided.</div>';
  document.title=item.title+" | Latest Newspaper";
  document.getElementById("listenBtn").addEventListener("click",startReading);
  document.getElementById("stopBtn").addEventListener("click",stopReading);
 }catch(e){root.innerHTML='<div class="article-error"><h1>Report unavailable</h1><p>Please return to the homepage and try again.</p></div>'}
}
window.addEventListener("pagehide",()=>{if("speechSynthesis" in window)window.speechSynthesis.cancel()});
showArticle();
