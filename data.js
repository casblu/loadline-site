// Facts from the project brief and public pages checked Oct 15, 2026.
// Coordinates = town/city centre (approximate, NOT site coordinates).
const LAYERS={
 mines:{name:"Mining sites (publicly reported)",color:"#f7931a",on:true},
 ai:{name:"Shifting to AI / compute",color:"#b388ff",on:true},
 community:{name:"Community impact (as reported)",color:"#ff6b7a",on:true},
 wind:{name:"Wind co-located (company-reported)",color:"#3ddc97",on:false},
 gas:{name:"Gas-fed (company-reported)",color:"#ffd166",on:false},
 grid:{name:"Grid operators",color:"#6ea8ff",on:true}
};
const SRC={
 maraops:["MARA — operations (company page)","https://www.mara.com/operations"],
 riotrock:["Riot Platforms — Rockdale (company page)","https://www.riotplatforms.com/locations/rockdale/"],
 riotdc:["Riot Platforms — Data Centers (company page)","https://www.riotplatforms.com/datacenters/"],
 riotfy:["Riot FY2025 results, Mar 2026","https://www.riotplatforms.com/riot-platforms-reports-full-year-2025-financial-results-and-strategic-highlights/"],
 galaxy:["Galaxy — Helios Phase I complete, 2026","https://www.galaxy.com/newsroom/galaxy-completes-phase-i-of-its-helios-data-center-campus"],
 galaxydc:["Galaxy — data center infrastructure (company page)","https://www.galaxy.com/data-centers"],
 sec:["Galaxy SEC exhibit, Q2 2026","https://www.sec.gov/Archives/edgar/data/1859392/000185939226000084/exhibit992-q22026overvie.htm"],
 earthj:["Earthjustice, 2024–25: Granbury residents & MARA noise lawsuit","https://earthjustice.org/press/2025/granbury-residents-demand-answers-from-maras-bitcoin-mine-as-lawsuit-over-noise-nuisance-continues"],
 dallas:["Dallas Observer, 2026: lawsuits over local crypto mine","https://www.dallasobserver.com/news/unbearable-noise-and-chicken-deaths-lawsuits-mount-against-local-crypto-mine-40671971/"],
 texan:["The Texan: noise levels within legal limit (industry-commissioned test)","https://thetexan.news/issues/energy/hood-county-bitcoin-mining-facility-maintains-noise-levels-are-within-legal-limit/article_46cd2180-5045-11ef-ae73-0b81403b5ff4.html"],
 dcd:["DCD, Apr 2022: Compute North 300 MW at Wolf Hollow","https://www.datacenterdynamics.com/en/news/compute-north-breaks-ground-on-300mw-data-center-in-granbury-texas/"],
 ercotllb:["ERCOT board update, Sep 11, 2026","https://www.ercot.com/files/docs/2026/09/11/14-Batch-Zero-Update.pdf"],
 ercotceo:["ERCOT CEO update, Apr 15, 2026","https://www.ercot.com/files/docs/2026/04/15/12-CEO-Update.pdf"],
 obm:["OBM, 2026: NPRR‑1337 explained","https://obm.io/blog/nprr-1337-what-ercots-proposed-ers-changes-mean-for-bitcoin-miners/"],
 bb:["Baker Botts, Jul 2025: Texas SB 6","https://www.bakerbotts.com/thought-leadership/publications/2025/july/texas-senate-bill-6-understanding-the-impacts-to-large-loads-and-co-located-generation"],
 voltus:["Voltus — digital infrastructure demand response","https://www.voltus.co/demand-response/digital-infrastructure"],
 hashrate:["Hashrate Index, 2026: energy management platforms","https://hashrateindex.com/blog/top-5-bitcoin-mining-energy-management-platforms-of-2026/"]
};
const POINTS=[
{id:"granbury",name:"Granbury (Hood County), TX",lat:32.4487,lng:-97.7942,layers:["mines","community","gas"],primary:"community",tag:"Mine + community impact",
 facts:["MARA reports a 300 MW Bitcoin-mining data center at the Wolf Hollow gas plant, powered directly by local generation (company-reported).","Built by Compute North (construction began Apr 2022); MARA took over operations in Apr 2024.","MARA says it voluntarily powers down during high-demand periods (company claim; not independently verified).","Residents sued MARA over noise (Earthjustice, 2024–25). In related federal cases, 31 of 37 plaintiffs later dismissed their claims (2026, per Dallas Observer and attorney posts).","A noise survey commissioned via the Texas Blockchain Council (an industry group) reported 43–63 dB, against a state 'unreasonable' threshold of 85 dB (The Texan). Residents dispute the experience; no neutral study found."],
 src:["maraops","dcd","earthj","dallas","texan"]},
{id:"rockdale",name:"Rockdale (Milam County), TX",lat:30.6554,lng:-97.0011,layers:["mines"],primary:"mines",tag:"Mining site",
 facts:["Riot Platforms' flagship site: 700 MW of developed capacity, seven buildings, supporting Bitcoin mining and data-center operations (company-reported).","Construction began 2019; operational by 2020 (company).","Riot earned $56.7M in power-curtailment credits company-wide in 2025, up from $33.7M in 2024 (not Rockdale-only)."],
 src:["riotrock","riotfy"]},
{id:"mccamey",name:"McCamey (Upton County), TX",lat:31.1357,lng:-102.2188,layers:["mines","wind"],primary:"wind",tag:"Wind co-located",
 facts:["MARA says its McCamey site is co-located behind the meter on a wind farm and uses excess power during peak generation (company-reported).","Company-listed compute: 7.6 EH/s. It also keeps a grid connection (company)."],
 src:["maraops"]},
{id:"gardencity",name:"Garden City (Glasscock County), TX",lat:31.8640,lng:-101.4816,layers:["mines","wind"],primary:"wind",tag:"Wind co-located",
 facts:["MARA says its Garden City site draws renewable energy from an adjacent wind farm (company-reported).","Company-listed compute: 7.2 EH/s."],
 src:["maraops"]},
{id:"helios",name:"Helios, near Spur (Dickens County), TX",lat:33.4770,lng:-100.8546,layers:["ai"],primary:"ai",tag:"Mine turned AI campus",
 facts:["Galaxy's Helios campus was a Bitcoin mine and is now an AI/HPC campus for CoreWeave (Galaxy).","CoreWeave has committed to 526 MW of IT load (800 MW gross). Phase I (133 MW) was delivered in Q2 2026.","Illustrates why Loadline tracks all flexible compute load, not only Bitcoin."],
 src:["galaxy","galaxydc","sec"]},
{id:"corsicana",name:"Corsicana (Navarro County), TX",lat:32.0954,lng:-96.4689,layers:["ai"],primary:"ai",tag:"Data center campus",
 facts:["Riot lists Corsicana as a data-center campus with 1 GW of energized capacity and 958 acres, aimed at AI/HPC (company-reported).","Included to show the mining-to-compute shift; not a mining site per Riot's own description."],
 src:["riotdc"]},
{id:"ercot",name:"ERCOT (Taylor, TX)",lat:30.5705,lng:-97.4092,layers:["grid"],primary:"grid",tag:"Texas grid operator",
 facts:["About 52% of ERCOT's Emergency Response Service is Bitcoin mining (OBM, 2026).","Texas SB 6 (in effect Jun 20, 2025) covers 75 MW+ loads. Large loads connected after Dec 31, 2025 need curtailment protocols.","ERCOT paused energizing new large data centers and crypto mines until an eligibility audit and Community Impact Review are done. Both are due to PUCT Dec 10, 2026.","Proposed NPRR‑1337 (filed May 26, 2026) would disqualify loads that only switch off when prices are high; mid‑2027 at the earliest.","Crypto-mining load requests: 2,475 MW (2026) → 9,076 MW (2032). Non-crypto data centers: 7,401 → 228,420 MW (ERCOT, Apr 2026)."],
 src:["obm","bb","ercotllb","ercotceo"]},
{id:"pjm",name:"PJM Interconnection (Audubon, PA)",lat:40.1196,lng:-75.4380,layers:["grid"],primary:"grid",tag:"US grid operator (context)",
 facts:["PJM is one of the US grids where aggregators such as Voltus sell miner curtailment (alongside ERCOT and MISO).","No site-level mining data is shown for PJM; we found no citable public dataset."],src:["voltus","hashrate"]},
{id:"miso",name:"MISO (Carmel, IN)",lat:39.9784,lng:-86.1180,layers:["grid"],primary:"grid",tag:"US grid operator (context)",
 facts:["MISO is another grid where aggregators sell curtailment from miners and other digital loads.","No site-level mining data is shown for MISO; we found no citable public dataset."],src:["voltus","hashrate"]}
];
const EXPLAINERS=[
["What is curtailment?","Switching a big power user off or down for a while. A mine can do this in seconds, which is why grids pay some of them to be on call. In 2023 miners surveyed by Cambridge reported 888 GWh of curtailment.","https://www.jbs.cam.ac.uk/2025/cambridge-study-sustainable-energy-rising-in-bitcoin-mining/"],
["What is ERS?","Emergency Response Service: ERCOT pays large loads to drop off in an emergency. About 52% of it is Bitcoin mining.","https://obm.io/blog/nprr-1337-what-ercots-proposed-ers-changes-mean-for-bitcoin-miners/"],
["What did Texas SB 6 change?","Since Jun 20, 2025, loads of 75 MW or more face new rules. New ones connected after Dec 31, 2025 need curtailment protocols and ERCOT can order curtailment in emergencies. A new demand-management service excludes price-responsive loads.","https://www.bakerbotts.com/thought-leadership/publications/2025/july/texas-senate-bill-6-understanding-the-impacts-to-large-loads-and-co-located-generation"],
["Why do energy-mix numbers differ?","Cambridge's survey (49 firms, ~48% of hashrate) found 52.4% sustainable power. A Nature Communications study of the 34 largest US mines found 85% of their power was fossil. The Bitcoin Mining Council's self-reported figure is higher (63.1% as cited second-hand). They measure different things, so we show all three.","https://www.nature.com/articles/s41467-025-58287-3"],
["Average vs marginal emissions","RMI argues that what matters is the marginal, location-specific emissions a mine causes, not the average grid mix. Flexibility only helps if curtailment is reliable during scarcity.","https://rmi.org/resources/cryptocurrencys-energy-consumption-problem/"],
["Why isn't there official data?","The US EIA's emergency survey of miners was dropped after the Texas Blockchain Council sued. EIA agreed to destroy the data it had collected. The case closed Mar 1, 2024.","https://www.reuters.com/legal/crypto-miner-lawsuit-sets-back-us-effort-track-booming-power-use-2024-02-28/"]
];
const BOTH=[
["Grid reliability","Fast, switch-off-able load can act as demand response. Duke estimates ~76 GW of flexible load could be added if it curtails 0.25% of the time.","Only helps if curtailment is reliable in scarcity. Price-only curtailment is what NPRR‑1337 targets."],
["Energy mix","Cambridge: 52.4% sustainable (42.6% renewables, 9.8% nuclear). Industry figures run higher.","Nature Comms: 85% of the 34 largest US mines' power was fossil, linked to PM2.5 exposure for ~1.9M Americans."],
["Stranded / flared gas","Crusoe pioneered flare-gas mining. Advocates (BPI, D. Batten) argue it cuts methane. These sources lean advocacy.","Crusoe sold that business to NYDIG (announced Mar 25, 2025) to focus on AI."],
["Communities","Mines can add jobs and local tax base; Galaxy says it is one of Dickens County's top employers (company).","Granbury residents sued MARA over noise. ERCOT now requires a Community Impact Review."],
["Load growth","Crypto requests rise from 2,475 MW (2026) to 9,076 MW (2032).","Non-crypto data centers dwarf that: 7,401 to 228,420 MW (ERCOT, Apr 2026)."]
];
const FAQ=[
["Does Loadline mine Bitcoin?","No. It aims to measure, explain and verify, not to mine."],
["Is this data live?","No. This draft uses public documents dated as cited. For live grid conditions see ERCOT dashboards and Grid Status."],
["Are map pins exact?","No. Pins are at town centres from public reports. Site-level mapping would need sourcing from filings."],
["Who is this for?","Utilities and grid operators, miners, county officials and residents."],
["Is the model on the explainer real?","No. It is an illustrative toy model with invented curves, built to show logic only."]
];
const SOURCELIST=[
["ERCOT board update, Sep 11, 2026","https://www.ercot.com/files/docs/2026/09/11/14-Batch-Zero-Update.pdf"],
["ERCOT CEO update, Apr 15, 2026","https://www.ercot.com/files/docs/2026/04/15/12-CEO-Update.pdf"],
["OBM, 2026 — NPRR‑1337","https://obm.io/blog/nprr-1337-what-ercots-proposed-ers-changes-mean-for-bitcoin-miners/"],
["Baker Botts, Jul 2025 — Texas SB 6","https://www.bakerbotts.com/thought-leadership/publications/2025/july/texas-senate-bill-6-understanding-the-impacts-to-large-loads-and-co-located-generation"],
["Riot FY2025 results (company)","https://www.riotplatforms.com/riot-platforms-reports-full-year-2025-financial-results-and-strategic-highlights/"],
["Riot — Rockdale / Data centers (company)","https://www.riotplatforms.com/locations/rockdale/"],
["MARA operations (company)","https://www.mara.com/operations"],
["Galaxy — Helios Phase I (company)","https://www.galaxy.com/newsroom/galaxy-completes-phase-i-of-its-helios-data-center-campus"],
["Galaxy SEC exhibit, Q2 2026","https://www.sec.gov/Archives/edgar/data/1859392/000185939226000084/exhibit992-q22026overvie.htm"],
["Duke Nicholas Institute, Feb 2025","https://nicholasinstitute.duke.edu/sites/default/files/publications/rethinking-load-growth.pdf"],
["Cambridge CCAF survey, Apr 2025","https://www.jbs.cam.ac.uk/2025/cambridge-study-sustainable-energy-rising-in-bitcoin-mining/"],
["CCAF Mining Map","https://ccaf.io/cbnsi/cbeci/mining_map/methodology"],
["Nature Communications, 2025","https://www.nature.com/articles/s41467-025-58287-3"],
["RMI","https://rmi.org/resources/cryptocurrencys-energy-consumption-problem/"],
["Kenson summary of BMC report (secondary; self-reported)","https://kensoninvestments.com/bitcoin-mining-council-institutional-perspectives-on-energy-esg-and-network-security/"],
["Reuters, Feb 28, 2024 — EIA survey","https://www.reuters.com/legal/crypto-miner-lawsuit-sets-back-us-effort-track-booming-power-use-2024-02-28/"],
["Crusoe / NYDIG deal (CNBC)","https://www.cnbc.com/2025/03/25/crusoe-energy-sells-bitcoin-mining-unit-to-nydig-to-focus-on-ai.html"],
["Earthjustice — Granbury","https://earthjustice.org/press/2025/granbury-residents-demand-answers-from-maras-bitcoin-mine-as-lawsuit-over-noise-nuisance-continues"],
["Dallas Observer — Granbury suits","https://www.dallasobserver.com/news/unbearable-noise-and-chicken-deaths-lawsuits-mount-against-local-crypto-mine-40671971/"],
["The Texan — Hood County noise","https://thetexan.news/issues/energy/hood-county-bitcoin-mining-facility-maintains-noise-levels-are-within-legal-limit/article_46cd2180-5045-11ef-ae73-0b81403b5ff4.html"],
["DCD, Apr 2022 — Wolf Hollow","https://www.datacenterdynamics.com/en/news/compute-north-breaks-ground-on-300mw-data-center-in-granbury-texas/"],
["Voltus; Hashrate Index","https://www.voltus.co/demand-response/digital-infrastructure"],
["ERCOT dashboards (live)","https://www.ercot.com/gridmktinfo/dashboards"],
["Grid Status — ERCOT (live)","https://www.gridstatus.io/live/ercot/"],
["Digital Chamber Compute Working Group, Sep 24, 2026","https://digitalchamber.org/the-digital-chamber-launches-compute-working-group/"]
];
