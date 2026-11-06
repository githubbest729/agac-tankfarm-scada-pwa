const SITE_URL='https://githubbest729.github.io/agac-tankfarm-scada-pwa/';
const FILES=['index.html','manifest.webmanifest','sw.js','offline.html','favicon.ico','favicon.svg','apple-touch-icon.png','og-image.png','robots.txt','css/styles.css','js/app.js','js/calculators.js','js/field-guide.js','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-192.png','icons/icon-maskable-512.png'];
const root=document.documentElement;
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;setTimeout(()=>t.hidden=true,2500)}
function setTheme(t){root.dataset.theme=t;try{localStorage.setItem('theme',t)}catch(_){}
 document.querySelectorAll('[data-theme-btn]').forEach(b=>b.classList.toggle('on',b.dataset.themeBtn===t));
 document.querySelector('meta[name=theme-color]').content={dark:'#0f172a',sun:'#ffffff',oled:'#000000'}[t]}
function showView(v){if(!$('#view-'+v))v='overview';document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id==='view-'+v));
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===v));$('#main').scrollTop=0;const on=document.querySelector('#tabs .on');if(on)on.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});if(location.hash!=='#'+v)history.replaceState(null,'','#'+v)}
function dlg(html){$('#dlgBody').innerHTML=html;$('#dlg').showModal()}
function renderGuide(){for(const k in GUIDE){const g=GUIDE[k];$('#view-'+k).innerHTML=`<h2>${g.t}</h2>`+g.c.map(([h,p])=>`<article class="card"><h3>${h}</h3>${p.startsWith('<')?p:'<p>'+p+'</p>'}</article>`).join('')}
 $('#view-install').innerHTML=`<h2>iPhone install & lock screen</h2><article class="card"><h3>Add to Home Screen</h3><ul><li>Open this page in Safari.</li><li>Tap Share, then Add to Home Screen.</li><li>Launch from the icon for full-screen, offline use.</li></ul></article><article class="card"><h3>Lock screen and widgets</h3><p>iOS web apps cannot place true widgets on the lock screen. The Media Session API can show a tank status card in the media controls while the app plays audio. Use the button below to try the simulation.</p><button id="bMedia">Start tank status simulation</button><div id="medOut" class="out">Inactive</div></article>`;
 $('#bMedia').onclick=()=>{const p=Math.round(50+30*Math.random());$('#medOut').textContent=`Tank T-101 level ${p}% (simulated)`;if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:`T-101 level ${p}%`,artist:'AGAC SCADA',album:'Simulated status',artwork:[{src:'icons/icon-192.png',sizes:'192x192',type:'image/png'}]});toast('Media Session set')}else toast('Media Session not supported')}}
function net(){const on=navigator.onLine;['netpill'].forEach(i=>{const e=$('#'+i);e.textContent=on?'Online':'Offline';e.classList.toggle('off',!on)})}
async function share(){const d={title:'AGAC Tank Farm SCADA Engineering Field Handbook',text:'SCADA field toolkit and calculators for tank farm engineers.',url:'https://githubbest729.github.io/agac-tankfarm-scada-pwa/'};
 if(navigator.share){try{await navigator.share(d);return}catch(e){if(e.name==='AbortError')return}}
 dlg(`<h3>Share</h3><textarea id="shTxt" readonly>${d.title}\n${d.url}</textarea><button id="cp">Copy to clipboard</button>`);
 $('#cp').onclick=async()=>{try{await navigator.clipboard.writeText(d.title+'\n'+d.url)}catch(_){$('#shTxt').select();document.execCommand('copy')}toast('Copied')}}
async function zip(){if(!window.JSZip){toast('JSZip unavailable offline');return}toast('Building ZIP…');const z=new JSZip();
 try{for(const f of FILES){const r=await fetch(f);if(r.ok)z.file(f,await r.blob())}
 const b=await z.generateAsync({type:'blob'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='agac-tankfarm-scada-pwa.zip';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast('ZIP ready')}catch(e){toast('ZIP failed: '+e.message)}}
function init(){renderGuide();renderCalc();net();
 addEventListener('online',net);addEventListener('offline',net);
 document.querySelectorAll('[data-theme-btn]').forEach(b=>b.onclick=()=>setTheme(b.dataset.themeBtn));
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
 $('#bShare').onclick=share;$('#bZip').onclick=zip;$('#dlgClose').onclick=()=>$('#dlg').close();
 $('#bSearch').onclick=()=>{const q=$('#q');q.hidden=!q.hidden;if(!q.hidden)q.focus()};
 $('#q').oninput=e=>{const s=e.target.value.toLowerCase();if(s)document.querySelectorAll('.view').forEach(v=>v.classList.add('on'));else showView(location.hash.slice(1)||'overview');document.querySelectorAll('.card').forEach(c=>c.classList.toggle('hide',!!s&&!c.textContent.toLowerCase().includes(s)))};
 const qp=new URLSearchParams(location.search);let t='dark';try{t=localStorage.getItem('theme')||'dark'}catch(_){}
 setTheme(qp.get('theme')||t);showView(location.hash.slice(1)||'overview');
 if(navigator.getBattery)navigator.getBattery().then(b=>{const chk=()=>{if(b.level<.15&&!b.charging&&root.dataset.theme!=='oled'&&!sessionStorage.getItem('batAsked')){sessionStorage.setItem('batAsked',1);if(confirm('Battery below 15%. Switch to OLED saver mode?'))setTheme('oled')}};b.onlevelchange=chk;chk()}).catch(()=>{});
 if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').then(reg=>{reg.onupdatefound=()=>{const w=reg.installing;w.onstatechange=()=>{if(w.state==='installed'&&navigator.serviceWorker.controller){dlg('<h3>Update available</h3><button id="up">Reload with update</button>');$('#up').onclick=()=>{w.postMessage('SKIP_WAITING');location.reload()}}}}}).catch(()=>{})}
init();
