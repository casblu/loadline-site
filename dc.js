(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const UNIT={MWh:'MWh',TWh:'TWh',ML:'ML',million_gallons:'million gal',L_per_kWh_IT:'L/kWh IT',MW:'MW',ratio:'',gallons:'gal',gallons_per_day:'gal/day'};
const NAME={google:'Google (Alphabet)',microsoft:'Microsoft',meta:'Meta',amazon:'Amazon / AWS',apple:'Apple',oracle:'Oracle (OCI)',xai:'xAI / SpaceXAI',equinix:'Equinix'};
let D,SRC,ROWS,NOW=new Date();
function fmtVal(r){const q=r.qualifier||'';const u=UNIT[r.unit]!==undefined?UNIT[r.unit]:r.unit;
 return esc(q+(q?' ':'')+Number(r.value).toLocaleString('en-US',{maximumFractionDigits:3})+(u?' '+u:''));}
function months(r){if(!r.period_end)return null;const e=new Date(r.period_end+'T00:00:00');if(isNaN(e))return null;
 return Math.max(0,Math.floor((NOW-e)/(86400000*30.4375)));}
function ageBadge(r){if(r.basis==='forecast'||(r.period_end&&new Date(r.period_end)>NOW))return '<span class="age n">projection, not an age</span>';const m=months(r);if(m==null)return '<span class="age n">period end n/a</span>';
 const c=m>18?'r':m>13?'a':'g';return `<span class="age ${c}" title="Months since the reported period ended">${m} mo old</span>`;}
function srcLink(r){const s=SRC[r.source_id]||{};const pg=r.source_page?`, p.${r.source_page}`:'';
 return `<a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.publisher||'source')}: ${esc(s.title||r.source_id)}${pg} ↗</a>`;}
function basisTag(r){const b=r.basis;const c=b==='estimated'?'est':(b==='forecast'||b==='survey')?'fc':'';
 return `<span class="tag2 ${c}">${esc(String(b).replace(/_/g,' '))}</span>`;}
function metaLine(r){return `${basisTag(r)}${esc(r.period_label)} · ${ageBadge(r)}<br>Boundary: ${esc(r.boundary)}<br>As of ${esc(r.as_of)} · verified ${esc(r.verified_on)} · ${srcLink(r)}`+(r.notes?`<br><i>Note: ${esc(r.notes)}</i>`:'');}
function fact(r,label){return `<div class="fact"><div class="m">${esc(label||r.metric.replace(/_/g,' '))}</div><div class="v">${fmtVal(r)}</div><div class="meta">${metaLine(r)}</div></div>`;}
const get=id=>ROWS.find(r=>r.id===id);

function scorecard(){
 const crit=D.scorecard.criteria;const by=Object.fromEntries(D.scorecard.scores.map(s=>[s.company_id,s]));
 const list=[...D.scorecard.scores].sort((a,b)=>b.total-a.total);
 $('scores').innerHTML=list.map(s=>{
  const partial=s.company_id==='apple';
  const rows=crit.map(c=>{const v=s.scores[c.id];const cls=v==null?'nc':v===0?'zero':'ok';
   const txt=v==null?`not yet checked / ${c.max}`:`${v} / ${c.max}`;
   return `<div class="crit ${cls}"><span class="id">${c.id}</span><span>${esc(c.name)}</span><span class="pt">${txt}</span></div>`;}).join('');
  const unk=s.unknown.length?`Not yet checked: ${s.unknown.join(', ')}.`:'All criteria checked.';
  return `<div class="co"><div class="draft">Draft score${partial?' · partial review':''}</div><div class="hd"><h3>${esc(NAME[s.company_id]||s.company_id)}</h3><div class="tot">${s.total}<small> / 100</small></div></div>
  <div class="meter"><i style="width:${s.total}%"></i></div>${rows}
  <p class="note">${unk} ${esc(s.notes)}</p>
  <p class="note">Checked ${esc((ROWS.find(r=>r.entity_id===s.company_id)||{verified_on:D.meta.generated.slice(0,10)}).verified_on)}. Companies are invited to submit corrections.</p></div>`;}).join('');
 $('rubric').innerHTML=crit.map(c=>`<div class="rub"><span>${c.id}</span><span>${esc(c.name)}<em>${esc(c.rule)}</em></span><span>${c.max}</span></div>`).join('');
}

function bars(el,ids,opts){opts=opts||{};
 const rs=ids.map(i=>get(i)).filter(Boolean);const max=Math.max(...rs.map(r=>r.value));
 $(el).innerHTML=rs.map(r=>{const w=Math.max(2,r.value/max*100);const co=NAME[r.entity_id]||({eu:'EU reporting round',industry:'Uptime survey'}[r.entity_id])||r.entity_id;
  const hatch=(r.qualifier==='>'||/Company-wide/.test(r.boundary))?'hatch':'';const bench=opts.bench&&opts.bench.includes(r.id)?'bench':'';
  return `<div class="bar"><div class="top"><span>${esc(co)}</span><b>${fmtVal(r)}</b></div><div class="tr"><i class="${hatch} ${bench}" style="width:${w}%"></i></div><div class="meta">${metaLine(r)}</div></div>`;}).join('')+(opts.foot?`<p class="tiny">${opts.foot}</p>`:'');
}

function water(){
 const picks=[['google-dc-water-withdrawal-2025','Google: withdrawal'],['google-dc-water-consumption-2025','Google: consumption'],['ms-total-water-withdrawal-fy25','Microsoft: withdrawal (company-wide)'],['ms-total-water-consumption-fy25','Microsoft: consumption (company-wide)'],['meta-dc-water-withdrawal-2024','Meta: withdrawal (data centers)']];
 $('ch-water').innerHTML=picks.map(([i,l])=>{const r=get(i);return r?fact(r,l):'';}).join('')+
 `<div class="fact"><div class="m">Amazon / AWS</div><div class="v">Not disclosed</div><div class="meta">No absolute water volume found; only a WUE ratio. Checked 2026-10-15.</div></div>`+
 `<div class="fact"><div class="m">Oracle, xAI, CoreWeave, OpenAI, Anthropic</div><div class="v">None found</div><div class="meta">No company-published water figure found. Checked 2026-10-15.</div></div>`;
}

function coCards(){
 const order=['google','microsoft','meta','amazon','apple','equinix','xai'];
 $('co-cards').innerHTML=order.map(id=>{
  const own=ROWS.filter(r=>r.entity_id===id);
  const sites=ROWS.filter(r=>r.entity_type==='site'&&r.entity_id.startsWith(id==='amazon'?'__':id+'-'));
  const groups={};sites.forEach(r=>{(groups[r.entity_id]=groups[r.entity_id]||[]).push(r);});
  const sitehtml=Object.entries(groups).map(([k,rs])=>{const nm=(rs[0].boundary.split(': ').pop());return `<h4>${esc(nm)}</h4>`+rs.map(r=>fact(r)).join('');}).join('');
  const co=D.companies.find(c=>c.id===id)||{};
  const body=(own.length?own.map(r=>fact(r)).join(''):'<p class="tiny">No company-published figures found. Checked 2026-10-15.</p>')+
   (sitehtml?`<details><summary>Per-site figures (${sites.length})</summary>${sitehtml}</details>`:'');
  return `<details><summary><span>${esc(NAME[id])}</summary>${co.fiscal_year?`<p class="tiny">Fiscal year: ${esc(co.fiscal_year)}</p>`:''}${body}</details>`.replace('<span>'+esc(NAME[id])+'</summary>','<span>'+esc(NAME[id])+'</span><span class="tiny">'+(own.length+sites.length)+' figures</span></summary>');
 }).join('');
}

function regional(){
 const groups=[['United States (LBNL)',['us-dc-elec-2023-lbnl','us-dc-elec-2028-low','us-dc-elec-2028-high']],
 ['World (IEA)',['world-dc-elec-2024','world-dc-elec-2025','world-dc-elec-2030']],
 ['ERCOT (Texas): large-load requests, not use',['ercot-largeload-requests-2026','ercot-batchzero-base-2026','ercot-batchzero-studied-2026','ercot-batchzero-excluded-2026']],
 ['PJM',['pjm-dc-growth-2025-2030','pseg-dc-peak-2025']],
 ['EU and industry benchmarks (PUE)',['eu-pue-2024round','uptime-pue-2025']]];
 $('regional').innerHTML=groups.map(([t,ids])=>`<h3 class="h2s">${esc(t)}</h3><div class="grid cards">${ids.map(i=>{const r=get(i);return r?fact(r):''}).join('')}</div>`).join('')+
 '<p class="tiny">ERCOT Batch Zero: the same deck gives 125.4 GW in its chart and 127.9 GW in its text; we show the chart value. Energization of new data-center and crypto loads of 75 MW or more is paused per the Sep 11, 2026 board deck.</p>';
}

const LAWS=[
['California','AB 1577 (Ch. 434/2026)','Report location, size, PUE and generator fuel to the CEC. CEC publishes anonymized, aggregated data.','Signed 2026-09-21','enacted','https://legiscan.com/CA/text/AB1577/id/3459434'],
['California','AB 2469, AB 2619, AB 2383, SB 1168','Water-supply assessment and water disclosures before permits; electricity and rate rules.','Signed 2026-09-21','enacted','https://www.gov.ca.gov/2026/09/21/governor-newsom-signs-most-comprehensive-data-center-laws-in-the-nation-providing-communities-more-control-on-water-electricity-and-land-use/'],
['Virginia','HB 496 / SB 553 (2026)','Water suppliers report monthly water delivered to each air-permitted data center.','Effective 2027-01-01','enacted','https://datacenterrecord.org/laws'],
['Virginia','SB 94, HB 507, HB 323','Siting assessment for 100 MW+ sites; generator limits; waste-heat report.','In effect 2026-07-01','enacted','https://datacenterrecord.org/laws'],
['New Jersey','S3379','Semi-annual water and energy reports to the BPU.','Signed 2026-08-27 (per Data Center Record; bill text not yet read)','enacted','https://datacenterrecord.org/laws'],
['New Jersey','S4658','Annual reports to DEP plus a state transparency dashboard.','In committee','pending','https://datacenterrecord.org/laws'],
['Texas','Governor\'s directive (Jun 10 / Aug 3, 2026)','PUCT and ERCOT audit projects on demand, water source and use, and ownership. Not a statute; unclear whether data will be public.','Administrative','adm','https://www.usatoday.com/story/news/state/texas/2026/08/21/which-tech-ai-companies-are-complying-with-texas-data-center-rules/91373947007/'],
['Ohio','HB 983, HB 646','Data Center Accountability Act; study commission.','Introduced / in committee','pending','https://datacenterrecord.org/laws'],
['Others','MN HF 16 (2025); AZ HB 2756','Water reporting tied to tax exemption (MN); utility reporting on large loads (AZ).','Enacted. IL SB 2181, MI HB 6265 and federal bills pending.','enacted','https://icwp.org/wp-content/uploads/2026/06/ICWP-2026-Data-Center-Report.pdf'],
['European Union','Energy Efficiency Directive Art. 12 (Reg. 2024/1364)','Sites with 500 kW+ IT load report annually. Published data is anonymised and aggregated. Commission proposed a common rating scheme on 2026-09-21.','In force; rating scheme proposed','enacted','https://energy.ec.europa.eu/topics/energy-efficiency/energy-efficiency-targets-directive-and-rules/energy-efficiency-directive/energy-performance-data-centres_en']];
function laws(){$('laws').innerHTML=LAWS.map(l=>`<div class="r"><b>${esc(l[0])}</b> · ${esc(l[1])}<span class="st ${l[4]}">${esc(l[3])}</span><div class="meta">${esc(l[2])} <a href="${esc(l[5])}" rel="noopener" target="_blank">Source ↗</a> · status as of 2026-10-15</div></div>`).join('');}

const GAPS=[['Amazon / AWS','Publishes no absolute electricity or water volume. Only PUE and WUE ratios.'],
['Oracle (OCI)','No numeric PUE, electricity or water figure found.'],
['xAI / SpaceXAI','No company-published sustainability data. Site facts exist only via utility testimony, advocacy groups and Epoch estimates.'],
['CoreWeave, Nscale','Reported to publish no ESG data in Computing\'s 2026 audit.'],
['OpenAI, Anthropic','Little to nothing published; their compute runs largely on partners\' facilities.'],
['Meta: data is old','Latest year is CY2024. No 2025 data as of 2026-10-15.'],
['Per-site data is rare','Only Microsoft (owned sites) and Meta (2024) give per-site electricity. Google gives per-site water but not electricity.'],
['Leased and colocation load','Often excluded: Microsoft and Google report owned or operated sites only.'],
['Government data is anonymised','EU database, California AB 1577 and EIA pilots cannot name individual companies by design.'],
['No metered grid data','ERCOT queue figures are requests, not use. No standard public disclosure of compute.']];
function gaps(){$('gaplist').innerHTML=GAPS.map(g=>`<div class="gap"><h3>${esc(g[0])}</h3><p>${esc(g[1])}</p></div>`).join('')+'<p class="tiny">Source: Loadline research brief, checked 2026-10-15. Company details link from the <a href="#compare">comparison</a>; Computing audit: <a href="https://www.computing.co.uk/research/2026/ai-cloud-boom-who-is-counting-the-cost" rel="noopener" target="_blank">computing.co.uk ↗</a>.</p>';}

const TRK=[['Epoch AI: AI Data Centers','https://epoch.ai/data/ai-data-centers','94 frontier AI sites with estimated IT power and compute, from satellite imagery and permits. Data licensed CC BY (attribution required). Updated Oct 12–15, 2026. Best public compute source; Loadline plans to ingest it with credit as an "estimated" layer. Not ingested yet.'],
['Cleanview','https://cleanview.co/data-centers','US map of 4,057 data centers (1,355 operating, 2,651 planned), 476,058 MW, accessed 2026-10-15. Pipeline and siting; no disclosure scoring. Terms not checked.'],
['Data Center Watch','https://www.datacenterwatch.org/q2-2026','Tracks local opposition: about 45 projects (~$68B) blocked or delayed in Q2 2026. Terms not checked.'],
['Data Center Record','https://datacenterrecord.org/laws','Legal tracker: 686 bills and 38 state rules. We cite it for the state-law table. Terms not checked.'],
['Computing (UK) cloud audit','https://www.computing.co.uk/research/2026/ai-cloud-boom-who-is-counting-the-cost','Annual journalistic audit of 10 clouds. Cited for gaps; not a dataset.'],
['LBNL, IEA, Uptime Institute, EIA','https://datacenters.lbl.gov/publications/2024-lbnl-data-center-energy-usage-report','Aggregate sources used in the grid context section. IEA chart is CC BY 4.0. Terms for others: facts cited with attribution; not bulk-copied.']];
function trackers(){$('trk').innerHTML=TRK.map(t=>`<div class="ex trk"><h3>${esc(t[0])}</h3><p>${esc(t[2])}</p><a href="${esc(t[1])}" rel="noopener" target="_blank">Visit ↗</a></div>`).join('');}

async function ercot(){
 const box=$('ercot');let j=null;
 try{const r=await fetch('data/ercot-latest.json',{cache:'no-store'});if(r.ok)j=await r.json();}catch(e){}
 if(!j){box.innerHTML=`<span class="st planned tag2">PLANNED</span><h3>Live ERCOT feed: not available yet</h3><p>A scheduled GitHub Action is set up to write <code>data/ercot-latest.json</code> hourly from ERCOT's public dashboard (no key). It has not produced data yet, so nothing is shown. We do not display placeholder numbers.</p>`;feeds(false);return;}
 const f=t=>{const d=new Date(t);return isNaN(d)?esc(t):d.toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'})+' ET';};
 const ageMin=Math.round((NOW-new Date(j.fetched_at))/60000);
 box.innerHTML=`<span class="tag2"><i class="pulse"></i>LIVE · hourly snapshot</span><h3>ERCOT system-wide grid, latest snapshot</h3>
 <div class="big"><div><b>${Number(j.demand_mw).toLocaleString()} MW</b><span>Demand (interval ${esc(j.interval_timestamp)})</span></div><div><b>${Number(j.capacity_mw).toLocaleString()} MW</b><span>"Capacity" per ERCOT supply-demand chart</span></div>
 <div><b>${esc(j.prc_mw)} MW</b><span>Physical Responsive Capability</span></div><div><b>${esc(j.condition_title)}</b><span>${esc(j.condition_note)}</span></div></div>
 <p class="meta">Source updated: ${esc(j.source_updated_at)} (ERCOT local time) · Last checked by Loadline: ${f(j.fetched_at)} (${ageMin} min ago) · <a href="${esc(j.source_url)}" rel="noopener" target="_blank">ERCOT dashboards ↗</a><br><i>${esc(j.note)} This is not data-center or crypto load; ERCOT does not publish that in this feed.</i></p>`;
 feeds(true);
}
function feeds(ercotLive){
 const rows=[[ 'ERCOT public dashboards (grid demand, PRC)',ercotLive?'live':'planned',ercotLive?'Hourly GitHub Action → data/ercot-latest.json. No key. Browser cannot call ERCOT directly (its CORS only allows ercot.com), so the Action fetches it. Undocumented dashboard JSON: it may change or be blocked.':'Action configured, no data yet.'],
 ['EIA API v2 (grid demand, state sales)','planned','Needs a free API key stored as a repository secret. Not wired.'],
 ['PJM Data Miner 2','planned','Needs a key; non-members must confirm internal-business use, so redistribution terms must be checked first. Not wired.'],
 ['SEC EDGAR filing alerts','planned','No key, requires a User-Agent with contact email. Not wired.'],
 ['Epoch AI data centers CSV (CC BY)','planned','Daily download with credit. Not wired.'],
 ['Company sustainability reports','planned','No API. A change-detection job would open a review request; a human enters values. Annual cadence, cannot be live.']];
 $('feeds').innerHTML=rows.map(r=>`<div class="r"><b>${esc(r[0])}</b><span class="st ${r[1]}">${r[1].toUpperCase()}</span><div class="meta">${esc(r[2])}</div></div>`).join('');
}

fetch('data/datacenter-data.json').then(r=>r.json()).then(d=>{D=d;SRC=d.sources;ROWS=d.rows;
 const lc=ROWS.map(r=>r.verified_on).sort().pop();$('lastchk').textContent='Last checked: '+lc+' (data) · dataset generated '+d.meta.generated.slice(0,10);
 scorecard();
 bars('ch-elec',['google-dc-elec-2025','meta-dc-elec-2024','ms-total-elec-fy25','apple-dc-elec-2025'],{foot:'Hatched bars are floors ("over") or company-wide totals that include non-data-center use. Google: owned and operated DCs; Meta: includes leased; Microsoft: company-wide (no DC total published); Apple: owned plus colocation share, "over 2.5 billion kWh". AWS, Oracle and xAI: none published.'});
 bars('ch-pue',['google-pue-2025','meta-pue-2024','ms-pue-fy25','aws-pue-2025','equinix-pue-2025','eu-pue-2024round','uptime-pue-2025'],{bench:['eu-pue-2024round','uptime-pue-2025'],foot:'Grey bars are benchmarks (EU reporting sites; Uptime survey respondents), not companies. Bars start at zero so differences look small; read the values.'});
 bars('ch-wue',['aws-wue-2025','meta-wue-2024','ms-wue-fy25'],{foot:'Definitions differ: AWS and Meta use withdrawn water; Microsoft uses humidification and cooling water. AWS Asia Pacific is also reported at 1.1 L/kWh. Google WUE: not yet checked.'});
 water();coCards();regional();laws();gaps();trackers();ercot();
}).catch(e=>{document.body.insertAdjacentHTML('beforeend','<p class="wrap">Could not load data: '+esc(e)+'</p>');});
})();
