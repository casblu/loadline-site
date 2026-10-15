(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SC={'operating':['s-op','#3ddc97'],'partially operating':['s-part','#4da3ff'],'under construction':['s-under','#ffd166'],'announced':['s-ann','#93a0bd'],'paused':['s-pause','#ff6b7a'],'cancelled':['s-pause','#ff6b7a']};
const REPO='https://github.com/casblu/loadline-site';
let LC={},D,S=[],map,layer,sortK='mw',sortD=-1,sel=null,markers={};
const nd='<span class="nd">not disclosed</span>';
const d0=x=>x==null?'—':x;
const fmt=(n,dg)=>n==null?null:Number(n).toLocaleString('en-US',{maximumFractionDigits:dg==null?0:dg});
const ago=iso=>{if(!iso)return'';const m=(Date.now()-new Date(iso))/6e4;return m<60?Math.round(m)+' min ago':m<2880?Math.round(m/60)+' h ago':Math.round(m/1440)+' days ago'};
const names=v=>Array.isArray(v)?v.map(x=>x.name+(x.confidence&&x.confidence!=='confident'?` (${x.confidence})`:'')).join(', '):v;
function prov(f,extra){if(!f)return'';const a=f.as_of?`as of ${esc(f.as_of)}`:'as-of date not given by source';
 return `<div class="m">${esc(f.basis.replace(/_/g,' '))} · ${a} · fetched ${esc((f.fetched_at||'').slice(0,16).replace('T',' '))} UTC · <a href="${esc(f.source_url)}" target="_blank" rel="noopener">source ↗</a>${f.note?'<br><i>'+esc(f.note)+'</i>':''}${extra||''}</div>`}
function fld(label,f,val){const v=(f&&f.value!=null)?val:nd;return `<div class="fld"><div class="k">${label}</div><div class="v">${v}</div>${f?prov(f):''}</div>`}
const stat=s=>s.status.value;
const mw=s=>s.capacity_it_mw_estimate.value;
function badge(s){const t=stat(s);return `<span class="sbadge ${(SC[t]||[''])[0]}">${esc(t)}</span>`}
function issue(s){return `${REPO}/issues/new?template=report-update.yml&title=${encodeURIComponent('[AI-DC update] '+s.name)}&site=${encodeURIComponent(s.name)}`}
function filtered(){const q=$('q').value.toLowerCase(),st=$('fs').value,co=$('fc').value;
 return S.filter(s=>(!q||(s.name+' '+(names(s.operator.value)||'')+' '+(s.city||'')+' '+(s.state||'')+' '+s.country).toLowerCase().includes(q))&&(!st||stat(s)===st)&&(!co||(co==='US'?s.country==='United States':s.country!=='United States')))}
function render(){const L=filtered();
 const key={mw:mw,name:s=>s.name,op:s=>names(s.operator.value)||'',st:stat,loc:s=>(s.state||s.country)+(s.city||''),pj:s=>s.capacity_it_mw_projected_max.value};
 const f=key[sortK];L.sort((a,b)=>{const x=f(a),y=f(b);if(x==null)return 1;if(y==null)return-1;return(x>y?1:x<y?-1:0)*sortD});
 $('cnt').textContent=`${L.length} of ${S.length} sites`;
 $('tb').innerHTML=L.map(s=>{const m=mw(s),p=s.capacity_it_mw_projected_max.value,l=s.location;
  return `<tr data-id="${s.id}" class="${sel===s.id?'sel':''}"><td><b>${esc(s.name)}</b></td><td>${esc(names(s.operator.value)||'')||nd}</td><td>${esc([s.city,s.state,s.country==='United States'?'':s.country].filter(Boolean).join(', '))}${l?`<br><span class="nd">${l.precision==='exact'?'exact (address)':l.precision==='street'?'street-level':'town-level'}</span>`:`<br>${nd}`}</td><td>${badge(s)}<br><span class="nd">${esc(s.status.as_of||'')}</span></td><td class="n">${m!=null?fmt(m)+' MW':nd}<br><span class="nd">est.</span></td><td class="n">${p?fmt(p)+' MW':nd}<br><span class="nd">proj.</span></td></tr>`}).join('');
 layer.clearLayers();markers={};
 L.forEach(s=>{const l=s.location;if(!l)return;const c=(SC[stat(s)]||[0,'#93a0bd'])[1],r=Math.max(7,Math.min(26,6+Math.sqrt(mw(s)||0)*.55));
  const m=window.L.marker([l.lat,l.lon],{icon:window.L.divIcon({className:'',html:`<div class="aidot" style="width:${r*2}px;height:${r*2}px;background:${c}cc;color:${c}"></div>`,iconSize:[r*2,r*2],iconAnchor:[r,r]}),title:s.name});
  m.bindTooltip(`${esc(s.name)} · ${esc(stat(s))}`);m.on('click',()=>select(s.id,true));m.addTo(layer);markers[s.id]=m});
}
function select(id,scroll){sel=id;const s=S.find(x=>x.id===id);if(!s)return;
 const l=s.location,cr=s.chips_reported,ce=s.chips_estimate;
 let h=`<h3>${esc(s.name)}</h3><div>${badge(s)} <span class="nd">${esc([s.city,s.state,s.country].filter(Boolean).join(', '))}</span></div>`;
 h+=fld('Operator / owner',s.operator,esc(names(s.operator.value)));
 h+=fld('Users / customers',s.users,esc(names(s.users.value)));
 h+=fld('Status',s.status,esc(stat(s)));
 h+=fld('IT capacity (estimate)',s.capacity_it_mw_estimate,fmt(mw(s))+' MW');
 h+=fld('Planned / projected IT capacity (Epoch timeline, max)',s.capacity_it_mw_projected_max,fmt(s.capacity_it_mw_projected_max.value)+' MW');
 h+=fld('Chips / compute (estimate)',ce,ce&&ce.value?esc([ce.value.chip_types,ce.value.h100_equivalents!=null?fmt(ce.value.h100_equivalents)+' H100-equivalents':null].filter(Boolean).join(' · ')):'');
 h+=fld('Chips (company-disclosed)',cr||{value:null,basis:'not_disclosed',source_url:D.meta.primary_source.csv,fetched_at:D.meta.last_checked_utc},cr?esc(fmt(cr.value.units)+' × '+cr.value.chip):'');
 h+=fld('Power source / utility',s.power_source,esc(s.power_source.value));
 h+=fld('Water (estimate)',s.water_mgd_estimate,fmt(s.water_mgd_estimate.value,3)+' million gal/day');
 h+=fld('Address',s.address,esc(s.address.value));
 h+=`<div class="fld"><div class="k">Map location</div><div class="v">${l?l.lat+', '+l.lon+' · '+(l.precision==='exact'?'exact (matched a building)':l.precision==='street'?'street-level':'town-level only'):nd}</div>${l?`<div class="m">geocoded · as of ${esc(l.as_of)} · fetched ${esc(l.fetched_at.slice(0,16).replace('T',' '))} UTC · <a href="https://nominatim.openstreetmap.org/" target="_blank" rel="noopener">OpenStreetMap Nominatim ↗</a> · query: ${esc(l.geocode_query)}<br><i>${esc(l.note)}</i></div>`:''}</div>`;
 if(s.reported&&s.reported.length)h+=`<div class="fld"><div class="k">Company-reported statements (manually verified)</div>${s.reported.map(r=>`<p class="m" style="font-size:13.5px;color:#c4cde2">${esc(r.claim)}<br>${r.as_of?'published '+esc(r.as_of):'publication date not shown'} · verified ${esc(r.verified_on)} · <a href="${esc(r.source_url)}" target="_blank" rel="noopener">source ↗</a></p>`).join('')}</div>`;
 if(s.sources.length)h+=`<div class="fld"><div class="k">Epoch AI's cited sources for this site (${s.sources.length})</div><div class="m">${s.sources.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)} ↗</a>${[404,410].includes(LC[x.url])?' <b style="color:#ff6b7a">(link returned '+LC[x.url]+' at last check)</b>':''}`).join('<br>')}<br><i>Link checks run periodically; some publishers (news paywalls, X) block automated checks.</i></div></div>`;
 h+=`<a class="ob" href="${issue(s)}" target="_blank" rel="noopener">Report an update for this site ↗</a>`;
 $('detail').innerHTML=h;$('detail').hidden=false;
 document.querySelectorAll('#tb tr').forEach(r=>r.classList.toggle('sel',r.dataset.id===id));
 if(l)map.setView([l.lat,l.lon],Math.max(map.getZoom(),l.precision==='town'?7:9));
 if(scroll)$('detail').scrollIntoView({behavior:'smooth',block:'nearest'});
}
fetch('data/link-check.json').then(r=>r.json()).catch(()=>({results:{}})).then(l=>{LC=l.results||{};window._lc=l;return fetch('data/ai-datacenters.json',{cache:'no-cache'})}).then(r=>r.json()).then(d=>{D=d;S=d.sites;const m=d.meta;
 $('lastchk').textContent=`Last checked: ${m.last_checked_utc.slice(0,16).replace('T',' ')} UTC (${ago(m.last_checked_utc)})`;
 const tot=S.reduce((a,s)=>a+(mw(s)||0),0),by=t=>S.filter(s=>stat(s)===t).length;
 $('sum').innerHTML=[[S.length,'sites tracked'],[by('operating')+by('partially operating'),'operating or partly operating'],[by('under construction'),'under construction'],[fmt(tot/1000,1)+' GW','estimated IT power today (sum of estimates)']].map(x=>`<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
 $('src').innerHTML=`Primary dataset: <a href="${esc(m.primary_source.url)}" target="_blank" rel="noopener">${esc(m.primary_source.name)}</a> (CSV: <a href="${esc(m.primary_source.csv)}">data_centers.csv</a>), licensed ${esc(m.primary_source.license)}. Rebuilt automatically every 6 hours.`+(window._lc&&window._lc.checked_at?` Source links last checked ${esc(window._lc.checked_at.slice(0,10))}: ${window._lc.ok} of ${window._lc.total} loaded for our bot (others are paywalled, bot-blocked or gone).`:'');
 map=window.L.map('aimap',{minZoom:2,maxZoom:12,worldCopyJump:true}).setView([30,-60],innerWidth<600?2:3);
 window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,attribution:'© OpenStreetMap contributors'}).addTo(map);
 layer=window.L.layerGroup().addTo(map);
 $('fs').innerHTML='<option value="">All statuses</option>'+[...new Set(S.map(stat))].map(x=>`<option>${esc(x)}</option>`).join('');
 ['q','fs','fc'].forEach(i=>$(i).addEventListener('input',render));
 document.querySelectorAll('th[data-k]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.k;sortD=sortK===k?-sortD:(k==='mw'||k==='pj'?-1:1);sortK=k;render()}));
 $('tb').addEventListener('click',e=>{const tr=e.target.closest('tr');if(tr)select(tr.dataset.id,true)});
 render();const qs=new URLSearchParams(location.search).get('site');if(qs)select(qs,true);
 fetch('data/ercot-latest.json').then(r=>r.json()).then(e=>{$('ercot').innerHTML=`ERCOT grid demand ${fmt(e.demand_mw)} MW (system-wide, not data centers) · fetched ${esc(e.fetched_at.slice(0,16).replace('T',' '))} UTC · <a href="${esc(e.source_url)}" target="_blank" rel="noopener">ERCOT dashboards ↗</a>`}).catch(()=>{});
}).catch(e=>{$('lastchk').textContent='Could not load data/ai-datacenters.json'});
})();
