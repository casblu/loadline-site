const $=s=>document.querySelector(s);
// ---- hero background
(function(){const c=$('#bg'),x=c.getContext('2d');let W,H,P=[];
function rs(){W=c.width=c.offsetWidth;H=c.height=c.offsetHeight;P=Array.from({length:Math.min(90,W/8)},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.6+.4,v:Math.random()*.3+.05,c:Math.random()<.3?'#f7931a':'#6ea8ff'}))}
function f(){x.clearRect(0,0,W,H);P.forEach(p=>{p.x+=p.v;if(p.x>W)p.x=0;x.fillStyle=p.c;x.globalAlpha=.7;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()});
x.globalAlpha=.12;x.strokeStyle='#6ea8ff';for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const dx=P[i].x-P[j].x,dy=P[i].y-P[j].y;if(dx*dx+dy*dy<7000){x.beginPath();x.moveTo(P[i].x,P[i].y);x.lineTo(P[j].x,P[j].y);x.stroke()}}
requestAnimationFrame(f)}
rs();addEventListener('resize',rs);f()})();
// ---- map
const map=L.map('lmap',{zoomControl:true,minZoom:3,maxZoom:9,zoomSnap:0.5}).setView([31.4,-99.5],innerWidth<600?5.5:6);
fetch('vendor/states.json').then(r=>r.json()).then(g=>{
 L.geoJSON(g,{style:f=>f.properties.name==='Texas'?{color:'#f7931a',weight:1.6,fillColor:'#1a2440',fillOpacity:1}:{color:'#2f4170',weight:.8,fillColor:'#111a30',fillOpacity:1}}).addTo(map).bringToBack()}).catch(()=>{});
const mk={};
function icon(c){return L.divIcon({className:'',html:`<div class="dot" style="width:20px;height:20px;background:${c};color:${c}"></div>`,iconSize:[20,20],iconAnchor:[10,10]})}
const grp=L.layerGroup().addTo(map);
function esc(s){return s.replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
function show(p){const a=p.src.map(k=>`<a href="${SRC[k][1]}" target="_blank" rel="noopener">${esc(SRC[k][0])} ↗</a>`).join('');
 $('#card').innerHTML=`<span class="tag">${p.tag}</span><h3>${p.name}</h3><div class="loc">Pin = town centre (approx.), not exact site. ${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}</div><ul>${p.facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul><div class="src"><b>Sources</b>${a}</div>`;
 if(innerWidth<900)$('#card').scrollIntoView({behavior:'smooth',block:'nearest'})}
POINTS.forEach(p=>{const m=L.marker([p.lat,p.lng],{icon:icon(LAYERS[p.primary].color),title:p.name}).bindTooltip(p.name,{direction:'top',offset:[0,-8]});m.on('click',()=>show(p));mk[p.id]=m});
function refresh(){grp.clearLayers();POINTS.forEach(p=>{if(p.layers.some(l=>LAYERS[l].on))grp.addLayer(mk[p.id])})}
$('#layers').innerHTML=Object.entries(LAYERS).map(([k,l])=>`<label><input type="checkbox" data-k="${k}" ${l.on?'checked':''}><i style="background:${l.color}"></i>${l.name}</label>`).join('');
$('#layers').addEventListener('change',e=>{LAYERS[e.target.dataset.k].on=e.target.checked;refresh()});refresh();
document.querySelectorAll('.viewbtns button').forEach(b=>b.onclick=()=>b.dataset.v==='tx'?map.setView([31.4,-99.5],innerWidth<600?5.5:6):map.setView([38.5,-96],4));
// ---- model (illustrative)
const bump=(h,a,b)=>{const d=Math.max(0,Math.min(h-a,b-h));return Math.min(1,d/1.5)};
function model(){const sq=+$('#s1').value/100,cur=+$('#s2').value/100,m=+$('#s3').value,price=$('#s4').checked;
 $('#v1').textContent=$('#s1').value;$('#v2').textContent=$('#s2').value;$('#v3').textContent=m;
 const H=[];let short0=0,short1=0,curtH=0;
 for(let h=0;h<24;h++){const other=55+28*Math.exp(-Math.pow((h-17.5)/3.4,2))+6*Math.exp(-Math.pow((h-9)/3,2));
  const sup=100*(1-sq*bump(h,15.5,21.5));
  const stress=other+m>sup, pricey=(h>=12&&h<=14);
  const curtailNow=price?pricey:stress;
  const mm=curtailNow?m*(1-cur):m; if(curtailNow)curtH++;
  const s0=Math.max(0,other+m-sup),s1=Math.max(0,other+mm-sup);short0+=s0;short1+=s1;
  H.push({h,other,mm,sup,s1})}
 const X=h=>40+h*(590/23),Y=v=>280-v*2.4;let svg='';
 for(let v=0;v<=120;v+=20)svg+=`<line x1="40" x2="630" y1="${Y(v)}" y2="${Y(v)}" stroke="#1f2b47"/><text x="4" y="${Y(v)+4}" fill="#93a0bd" font-size="11">${v}</text>`;
 for(let h=0;h<24;h+=3)svg+=`<text x="${X(h)-8}" y="296" fill="#93a0bd" font-size="11">${h}:00</text>`;
 const pts=(f)=>H.map(d=>`${X(d.h)},${Y(f(d))}`).join(' ');
 svg+=`<polygon points="${X(0)},${Y(0)} ${pts(d=>d.other)} ${X(23)},${Y(0)}" fill="#6ea8ff" opacity=".55"/>`;
 svg+=`<polygon points="${H.map(d=>`${X(d.h)},${Y(d.other+d.mm)}`).join(' ')} ${H.slice().reverse().map(d=>`${X(d.h)},${Y(d.other)}`).join(' ')}" fill="#f7931a" opacity=".85"/>`;
 svg+=`<polyline points="${pts(d=>d.sup)}" fill="none" stroke="#ff6b7a" stroke-width="2" stroke-dasharray="6 4"/>`;
 svg+=`<text x="46" y="16" fill="#93a0bd" font-size="11">ILLUSTRATIVE — index units, invented curves</text>`;
 $('#chart').innerHTML=svg;
 const v=$('#verdict');
 if(short1<=0.01){v.className='verdict ok';v.innerHTML=short0>0?`<b>Grid holds.</b> Without curtailment the illustrative grid would be short by ${short0.toFixed(0)} index-hours; curtailing closes the gap.`:`<b>No stress</b> at these settings: supply covers demand even with full mining load. Raise the squeeze.`}
 else{v.className='verdict bad';v.innerHTML=`<b>Shortfall remains: ${short1.toFixed(0)} index-hours.</b> ${price?'Mining only cut back during the price-spike window, not when supply was actually scarce.':'Mining did not curtail enough in the stressed hours.'} This is the gap that rules like NPRR‑1337 target.`}}
['s1','s2','s3','s4'].forEach(i=>$('#'+i).addEventListener('input',model));model();
// ---- content
$('#explainers').innerHTML=EXPLAINERS.map(e=>`<div class="ex"><h3>${e[0]}</h3><p>${e[1]}</p><a href="${e[2]}" target="_blank" rel="noopener">Source ↗</a></div>`).join('');
$('#both').innerHTML=`<div class="row"><div class="t"></div><div class="t">Case for / helpful view</div><div class="t">Case against / concern</div></div>`+BOTH.map(r=>`<div class="row"><div class="t">${r[0]}</div><div class="p">${r[1]}</div><div class="c">${r[2]}</div></div>`).join('');
$('#faq').innerHTML=FAQ.map(f=>`<details><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join('');
$('#srclist').innerHTML=SOURCELIST.map(s=>`<li><a href="${s[1]}" target="_blank" rel="noopener">${s[0]}</a></li>`).join('');
